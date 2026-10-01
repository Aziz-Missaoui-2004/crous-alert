import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";
import { sendGmail } from "./email.ts";

const CROUS_BASE = "https://trouverunlogement.lescrous.fr";
const TOOL_ID = 47;
const USER_AGENT = "CrousAlert-Edge/1.0";
const ROOM_RE = /\b(chambre|room)\b/i;
const STUDIO_RE = /\b(studio|t1(?:\s+bis)?)\b/i;
const POSTAL_RE = /\b(\d{5})\s+([^,]+)$/;

type Watch = { id: string; city: string; postal_code: string | null; housing_type: string; min_price_cents: number | null; max_price_cents: number | null };
type Listing = { source_key: string; city: string; postal_code: string | null; housing_type: "chambre" | "studio"; price_min_cents: number | null; price_max_cents: number | null; residence: string; address: string; url: string; surface_m2: number | null; raw_data: Record<string, unknown> };
type Result = { watches: number; listings_seen: number; listings_matched: number; alerts_created: number; errors: string[]; shadow: boolean; skipped?: boolean; run_id?: string };

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8" } });

function normalize(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("fr-FR");
}

function matches(watch: Watch, listing: Listing): boolean {
  if (normalize(watch.city) !== normalize(listing.city)) return false;
  if (watch.postal_code && watch.postal_code !== listing.postal_code) return false;
  if (normalize(watch.housing_type) !== normalize(listing.housing_type)) return false;
  if (listing.price_min_cents === null && listing.price_max_cents === null) return watch.min_price_cents === null && watch.max_price_cents === null;
  const minimum = listing.price_min_cents ?? listing.price_max_cents ?? 0;
  const maximum = listing.price_max_cents ?? listing.price_min_cents ?? 0;
  if (watch.max_price_cents !== null && watch.max_price_cents < minimum) return false;
  if (watch.min_price_cents !== null && watch.min_price_cents > maximum) return false;
  return true;
}

async function getBounds(watch: Watch): Promise<string> {
  const query = [watch.city, watch.postal_code].filter(Boolean).join(" ");
  const response = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=1`);
  if (!response.ok) throw new Error(`Géocodage indisponible (${response.status}).`);
  const data = await response.json() as { features?: Array<{ geometry?: { coordinates?: [number, number] } }> };
  const coordinates = data.features?.[0]?.geometry?.coordinates;
  if (!coordinates) throw new Error(`Zone introuvable pour ${query}.`);
  const [lon, lat] = coordinates;
  const radius = watch.postal_code ? 0.035 : 0.09;
  return `${lon - radius}_${lat + radius}_${lon + radius}_${lat - radius}`;
}

async function searchCards(watch: Watch): Promise<Array<{ id: string; residence: string; address: string }>> {
  const bounds = await getBounds(watch);
  let nextUrl: string | null = `${CROUS_BASE}/tools/${TOOL_ID}/search`;
  let params: URLSearchParams | undefined = new URLSearchParams({ bounds, locationName: watch.city });
  const cards: Array<{ id: string; residence: string; address: string }> = [];
  const seen = new Set<string>();
  for (let page = 0; page < 50 && nextUrl; page += 1) {
    const url = new URL(nextUrl);
    if (params) url.search = params.toString();
    const response = await fetch(url, { headers: { "User-Agent": USER_AGENT, "Accept-Language": "fr-FR,fr;q=0.9" } });
    if (!response.ok) throw new Error(`Recherche CROUS indisponible (${response.status}).`);
    const html = await response.text();
    const $ = cheerio.load(html);
    $("div.fr-card").each((_, element) => {
      const link = $(element).find('a[href*="/accommodations/"]').first();
      const match = link.attr("href")?.match(/\/accommodations\/(\d+)/);
      if (!match || seen.has(match[1])) return;
      seen.add(match[1]);
      cards.push({ id: match[1], residence: link.text().replace(/\s+/g, " ").trim(), address: $(element).find(".fr-card__desc").first().text().replace(/\s+/g, " ").trim() });
    });
    const next = $('a.fr-pagination__link--next[href]').first();
    nextUrl = next.length && next.attr("aria-disabled") !== "true" ? new URL(next.attr("href")!, url).toString() : null;
    params = undefined;
  }
  return cards;
}

async function normalizeListing(card: { id: string; residence: string; address: string }, watch: Watch): Promise<Listing | null> {
  const response = await fetch(`${CROUS_BASE}/api/fr/tools/${TOOL_ID}/accommodations/${card.id}`, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) throw new Error(`Fiche CROUS indisponible pour ${card.id} (${response.status}).`);
  const detail = await response.json() as Record<string, unknown>;
  if (detail.available === false) return null;
  const label = String(detail.label ?? "");
  const housingType = ROOM_RE.test(label) ? "chambre" : STUDIO_RE.test(label) ? "studio" : null;
  if (!housingType) return null;
  const modes = Array.isArray(detail.occupationModes) ? detail.occupationModes as Array<Record<string, unknown>> : [];
  const preferred = modes.find((mode) => mode.type === "alone") ?? modes[0];
  const rent = preferred?.rent && typeof preferred.rent === "object" ? preferred.rent as Record<string, unknown> : {};
  const minimum = rent.min === undefined || rent.min === null ? null : Number(rent.min);
  const maximum = rent.max === undefined || rent.max === null ? minimum : Number(rent.max);
  const addressMatch = card.address.trim().match(POSTAL_RE);
  const area = detail.area && typeof detail.area === "object" ? detail.area as Record<string, unknown> : {};
  return { source_key: String(detail.id ?? card.id), city: addressMatch?.[2]?.trim() ?? watch.city, postal_code: addressMatch?.[1] ?? null, housing_type: housingType, price_min_cents: Number.isFinite(minimum) ? minimum : null, price_max_cents: Number.isFinite(maximum) ? maximum : null, residence: card.residence || "Logement CROUS", address: card.address, url: `${CROUS_BASE}/tools/${TOOL_ID}/accommodations/${card.id}`, surface_m2: typeof area.min === "number" ? area.min : null, raw_data: { id: detail.id ?? card.id, label, area, occupationModes: detail.occupationModes ?? [] } };
}

async function fetchListings(watch: Watch): Promise<Listing[]> {
  const cards = await searchCards(watch);
  const listings: Listing[] = [];
  for (const card of cards) {
    const listing = await normalizeListing(card, watch);
    if (listing) listings.push(listing);
  }
  return listings;
}

async function run(mode: "shadow" | "active"): Promise<Result> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("SUPABASE_URL et SUPABASE_SECRET_KEY sont requis.");
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const result: Result = { watches: 0, listings_seen: 0, listings_matched: 0, alerts_created: 0, errors: [], shadow: mode === "shadow" };
  const { data: watches, error: watchesError } = await db.from("surveillances").select("id,city,postal_code,housing_type,min_price_cents,max_price_cents").eq("status", "active");
  if (watchesError) throw new Error(`Impossible de lire les surveillances Supabase : ${watchesError.message}`);
  result.watches = watches?.length ?? 0;
  for (const watch of (watches ?? []) as Watch[]) {
    try {
      const listings = await fetchListings(watch);
      result.listings_seen += listings.length;
      for (const listing of listings) {
        if (!matches(watch, listing)) continue;
        result.listings_matched += 1;
        if (mode === "shadow") continue;
        const { data: saved, error: saveError } = await db.from("logements").upsert({ source: "crous", source_key: listing.source_key, city: listing.city, postal_code: listing.postal_code, residence: listing.residence, housing_type: listing.housing_type, price_min_cents: listing.price_min_cents, price_max_cents: listing.price_max_cents, surface_m2: listing.surface_m2, address: listing.address, url: listing.url, available: true, last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString(), raw_data: listing.raw_data }, { onConflict: "source,source_key" }).select("id").single();
        if (saveError) throw new Error(`Impossible d'enregistrer le logement : ${saveError.message}`);
        const { data: alert, error: alertError } = await db.from("alertes").insert({ surveillance_id: watch.id, logement_id: saved.id }).select("id").maybeSingle();
        if (alertError && !alertError.message.toLowerCase().includes("duplicate")) throw new Error(`Impossible de créer l'alerte : ${alertError.message}`);
        if (alert) result.alerts_created += 1;
      }
      if (mode === "active") await db.from("surveillances").update({ last_checked_at: new Date().toISOString(), last_error: null }).eq("id", watch.id);
    } catch (error) {
      const message = `${watch.city}: ${error instanceof Error ? error.message : String(error)}`;
      result.errors.push(message);
      if (mode === "active") await db.from("surveillances").update({ last_checked_at: new Date().toISOString(), last_error: message }).eq("id", watch.id);
    }
  }
  return result;
}

async function runTracked(mode: "shadow" | "active"): Promise<Result> {
  if (mode === "shadow") return run(mode);
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("SUPABASE_URL et SUPABASE_SECRET_KEY sont requis.");
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const owner = `edge:${crypto.randomUUID()}`;
  const { data: acquired, error: lockError } = await db.rpc("acquire_worker_lock", { requested_lock_name: "crous-worker", requested_owner: owner, ttl_seconds: 120 });
  if (lockError) throw new Error(`Impossible d'acquérir le verrou du worker : ${lockError.message}`);
  if (!acquired) return { watches: 0, listings_seen: 0, listings_matched: 0, alerts_created: 0, errors: [], shadow: false, skipped: true };
  let runId: string | null = null;
  try {
    const { data: runRow, error: startError } = await db.from("worker_runs").insert({ owner, status: "running" }).select("id").single();
    if (startError) throw new Error(`Impossible d'enregistrer le début du cycle : ${startError.message}`);
    runId = String(runRow.id);
    const result = await run(mode);
    result.run_id = runId;
    await db.from("worker_runs").update({ status: result.errors.length ? "failed" : "completed", finished_at: new Date().toISOString(), watches: result.watches, listings_seen: result.listings_seen, listings_matched: result.listings_matched, alerts_created: result.alerts_created, error: result.errors.join("\n") || null }).eq("id", runId);
    return result;
  } catch (error) {
    if (runId) await db.from("worker_runs").update({ status: "failed", finished_at: new Date().toISOString(), error: error instanceof Error ? error.message : String(error) }).eq("id", runId);
    throw error;
  } finally {
    await db.rpc("release_worker_lock", { requested_lock_name: "crous-worker", requested_owner: owner });
  }
}

async function sendPendingNotifications(db: ReturnType<typeof createClient>): Promise<string[]> {
  const { data, error } = await db.from("alertes").select("id,notification_attempts,logements(residence,city,postal_code,housing_type,price_min_cents,price_max_cents,surface_m2,url,last_seen_at),surveillances(profiles(email))").in("notification_status", ["pending", "failed"]).lt("notification_attempts", 3).order("created_at", { ascending: true }).limit(100);
  if (error) throw new Error(`Impossible de lire les notifications : ${error.message}`);
  const grouped = new Map<string, Array<{ alertId: string; attempts: number; listing: Record<string, unknown> }>>();
  for (const row of (data ?? []) as Array<Record<string, unknown>>) {
    const listing = (Array.isArray(row.logements) ? row.logements[0] : row.logements) as Record<string, unknown> | undefined;
    const surveillance = (Array.isArray(row.surveillances) ? row.surveillances[0] : row.surveillances) as Record<string, unknown> | undefined;
    const profile = (Array.isArray(surveillance?.profiles) ? surveillance?.profiles[0] : surveillance?.profiles) as Record<string, unknown> | undefined;
    const recipient = String(profile?.email ?? "").trim();
    if (!recipient || !listing?.url) continue;
    const current = grouped.get(recipient) ?? [];
    current.push({ alertId: String(row.id), attempts: Number(row.notification_attempts ?? 0), listing });
    grouped.set(recipient, current);
  }
  const errors: string[] = [];
  for (const [recipient, notifications] of grouped) {
    const listings = notifications.map(({ listing }) => ({ residence: String(listing.residence ?? "Logement CROUS"), city: String(listing.city ?? ""), postal_code: listing.postal_code ? String(listing.postal_code) : null, housing_type: String(listing.housing_type ?? ""), price_min_cents: listing.price_min_cents === null ? null : Number(listing.price_min_cents), price_max_cents: listing.price_max_cents === null ? null : Number(listing.price_max_cents), surface_m2: listing.surface_m2 === null ? null : Number(listing.surface_m2), url: String(listing.url), last_seen_at: String(listing.last_seen_at ?? "") }));
    try {
      await sendGmail(recipient, listings);
      await db.from("alertes").update({ notification_status: "sent", notification_sent_at: new Date().toISOString(), notification_error: null }).in("id", notifications.map(({ alertId }) => alertId));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${recipient}: ${message}`);
      for (const notification of notifications) await db.from("alertes").update({ notification_status: "failed", notification_attempts: notification.attempts + 1, notification_error: message.slice(0, 1000) }).eq("id", notification.alertId);
    }
  }
  return errors;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Méthode POST requise." }, 405);
  try {
    const body = await request.json().catch(() => ({})) as { mode?: "shadow" | "active" };
    const mode = body.mode === "active" && request.headers.get("x-worker-mode") === "active" ? "active" : "shadow";
    const result = await runTracked(mode);
    if (mode === "active" && result.errors.length === 0 && Deno.env.get("EDGE_EMAIL_ENABLED") === "true") {
      const url = Deno.env.get("SUPABASE_URL");
      const key = Deno.env.get("SUPABASE_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!url || !key) throw new Error("SUPABASE_URL et SUPABASE_SECRET_KEY sont requis pour les notifications.");
      const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
      try {
        result.errors.push(...await sendPendingNotifications(db));
      } catch (error) {
        result.errors.push(`Notifications: ${error instanceof Error ? error.message : String(error)}`);
      }
      if (result.errors.length && result.run_id) {
        await db.from("worker_runs").update({ status: "failed", error: result.errors.join("\n") }).eq("id", result.run_id);
      }
    }
    return json({ ok: result.errors.length === 0, ...result }, result.errors.length ? 502 : 200);
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
