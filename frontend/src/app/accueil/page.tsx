"use client";

import Link from "next/link";
import { Bell, Building2, Clock3, ExternalLink, MapPin, Plus, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Watch = { id: string; city: string; postal_code: string | null; housing_type: "chambre" | "studio"; min_price_cents: number | null; max_price_cents: number | null; status: "active" | "paused"; last_checked_at: string | null };
type Listing = { id: string; residence: string; city: string; postal_code: string | null; housing_type: "chambre" | "studio"; price_min_cents: number | null; price_max_cents: number | null; last_seen_at: string };

function formatPrice(min: number | null, max: number | null) {
  if (min === null && max === null) return "Prix non précisé";
  if (max === null || min === max) return `${((min ?? max ?? 0) / 100).toLocaleString("fr-FR")} €`;
  if (min === null) return `Jusqu'à ${(max / 100).toLocaleString("fr-FR")} €`;
  return `${(min / 100).toLocaleString("fr-FR")} à ${(max / 100).toLocaleString("fr-FR")} €`;
}
function formatDate(value: string | null) { return value ? new Date(value).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "Jamais"; }
function criteria(watch: Watch) { return `${watch.housing_type === "chambre" ? "Chambre" : "Studio"} · ${formatPrice(watch.min_price_cents, watch.max_price_cents)}`; }

export default function HomePage() {
  const supabase = useMemo(() => createClient(), []);
  const [watches, setWatches] = useState<Watch[]>([]), [listings, setListings] = useState<Listing[]>([]), [alertCount, setAlertCount] = useState(0), [listingCount, setListingCount] = useState(0), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const loadDashboard = useCallback(async () => {
    setLoading(true); setError("");
    const [watchResult, listingResult, listingCountResult, alertCountResult] = await Promise.all([
      supabase.from("surveillances").select("id,city,postal_code,housing_type,min_price_cents,max_price_cents,status,last_checked_at").order("created_at", { ascending: false }),
      supabase.from("logements").select("id,residence,city,postal_code,housing_type,price_min_cents,price_max_cents,last_seen_at").eq("available", true).order("last_seen_at", { ascending: false }).limit(5),
      supabase.from("logements").select("id", { count: "exact", head: true }).eq("available", true),
      supabase.from("alertes").select("id", { count: "exact", head: true }),
    ]);
    if (watchResult.error || listingResult.error || listingCountResult.error || alertCountResult.error) setError("Impossible de charger les données du tableau de bord.");
    else { setWatches((watchResult.data ?? []) as Watch[]); setListings((listingResult.data ?? []) as Listing[]); setListingCount(listingCountResult.count ?? 0); setAlertCount(alertCountResult.count ?? 0); }
    setLoading(false);
  }, [supabase]);
  useEffect(() => { const timer = window.setTimeout(() => { void loadDashboard(); }, 0); return () => window.clearTimeout(timer); }, [loadDashboard]);
  const activeWatches = watches.filter((watch) => watch.status === "active").length;
  const lastChecked = watches.reduce<string | null>((latest, watch) => !watch.last_checked_at ? latest : (!latest || watch.last_checked_at > latest ? watch.last_checked_at : latest), null);
  const status = (watch: Watch) => <span className={`status-badge ${watch.status === "active" ? "is-active" : "is-paused"}`}>{watch.status === "active" ? "Active" : "En pause"}</span>;

  return <main className="page-content">
    <section className="page-title-row"><div><span className="breadcrumb">CROUS Alert / Accueil</span><h1>Tableau de bord</h1><p>État actuel de vos surveillances et résultats CROUS.</p></div><Link className="primary-action" href="/surveillances?nouvelle=1"><Plus size={18} /> Nouvelle surveillance</Link></section>
    {error && <p className="form-error" role="alert">{error}</p>}
    <section className="metric-grid" aria-label="Résumé"><article className="metric-window accent-blue"><div className="window-top"><span className="metric-icon"><Search size={19} /></span></div><span className="metric-label">Surveillances actives</span><strong className="metric-value">{loading ? "—" : activeWatches}</strong><span className="metric-foot">{watches.length} configuration{watches.length === 1 ? "" : "s"} au total</span></article><article className="metric-window accent-green"><div className="window-top"><span className="metric-icon"><Building2 size={19} /></span></div><span className="metric-label">Logements disponibles</span><strong className="metric-value">{loading ? "—" : listingCount}</strong><span className="metric-foot">Résultats visibles pour votre compte</span></article><article className="metric-window accent-violet"><div className="window-top"><span className="metric-icon"><Bell size={19} /></span></div><span className="metric-label">Alertes détectées</span><strong className="metric-value">{loading ? "—" : alertCount}</strong><span className="metric-foot">Correspondances enregistrées</span></article><article className="metric-window accent-orange"><div className="window-top"><span className="metric-icon"><Clock3 size={19} /></span></div><span className="metric-label">Dernier passage</span><strong className="metric-value compact">{loading ? "—" : formatDate(lastChecked)}</strong><span className="metric-foot">Dernière exécution connue du worker</span></article></section>
    <section className="insight-grid"><article className="window activity-window"><div className="window-header"><div><h2>Mes surveillances</h2><p>Les critères actuellement enregistrés.</p></div><Link href="/surveillances">Gérer <ExternalLink size={14} /></Link></div>{loading ? <div className="requests-state">Chargement…</div> : watches.length === 0 ? <div className="requests-state"><Search size={28} /><strong>Aucune surveillance</strong><span>Créez votre première surveillance pour lancer une recherche.</span></div> : <div className="listing-list">{watches.slice(0, 4).map((watch) => <div className="listing" key={watch.id}><span className="listing-icon"><MapPin size={18} /></span><div><strong>{watch.city}{watch.postal_code ? ` · ${watch.postal_code}` : ""}</strong><span>{criteria(watch)}</span></div>{status(watch)}</div>)}</div>}</article><article className="window latest-window"><div className="window-header"><div><h2>Derniers logements</h2><p>Résultats disponibles les plus récents.</p></div><Link href="/logements">Tout voir <ExternalLink size={14} /></Link></div>{loading ? <div className="requests-state">Chargement…</div> : listings.length === 0 ? <div className="requests-state"><Building2 size={28} /><strong>Aucun logement trouvé</strong><span>Les résultats apparaîtront après un cycle du worker.</span></div> : <div className="listing-list">{listings.slice(0, 3).map((listing) => <div className="listing" key={listing.id}><span className="listing-icon"><Building2 size={18} /></span><div><strong>{listing.residence}</strong><span>{listing.housing_type === "chambre" ? "Chambre" : "Studio"} · {listing.city}{listing.postal_code ? ` · ${listing.postal_code}` : ""}</span></div><div><strong>{formatPrice(listing.price_min_cents, listing.price_max_cents)}</strong><span>{formatDate(listing.last_seen_at)}</span></div></div>)}</div>}</article></section>
    <section className="window watches-window"><div className="window-header table-title"><div><h2>État des surveillances</h2><p>Dernier passage connu pour chaque zone.</p></div><button className="row-action" type="button" onClick={() => void loadDashboard()} aria-label="Actualiser" disabled={loading}><RefreshCw size={17} /></button></div><div className="table-scroll"><table><thead><tr><th>Zone</th><th>Critères</th><th>Statut</th><th>Dernier passage</th></tr></thead><tbody>{loading ? <tr><td colSpan={4}>Chargement…</td></tr> : watches.length === 0 ? <tr><td colSpan={4}>Aucune surveillance configurée.</td></tr> : watches.map((watch) => <tr key={watch.id}><td><span className="table-name"><MapPin size={17} />{watch.city}{watch.postal_code ? ` · ${watch.postal_code}` : ""}</span></td><td>{criteria(watch)}</td><td>{status(watch)}</td><td>{formatDate(watch.last_checked_at)}</td></tr>)}</tbody></table></div></section>
  </main>;
}
