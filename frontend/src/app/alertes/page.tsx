"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, CheckCircle2, RefreshCw } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Alert = {
  id: string;
  sent_at: string;
  logements: { residence: string; city: string; postal_code: string | null; housing_type: "chambre" | "studio"; price_min_cents: number | null; price_max_cents: number | null } | { residence: string; city: string; postal_code: string | null; housing_type: "chambre" | "studio"; price_min_cents: number | null; price_max_cents: number | null }[] | null;
};

function formatPrice(min: number | null, max: number | null) {
  if (min === null && max === null) return "Prix non précisé";
  if (min === max || max === null) return `${((min ?? max ?? 0) / 100).toLocaleString("fr-FR")} €`;
  return `${((min ?? 0) / 100).toLocaleString("fr-FR")} à ${((max ?? 0) / 100).toLocaleString("fr-FR")} €`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

export default function AlertsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: loadError } = await supabase.from("alertes").select("id,sent_at,logements(residence,city,postal_code,housing_type,price_min_cents,price_max_cents)").order("sent_at", { ascending: false });
    if (loadError) setError("Impossible de charger les alertes.");
    else setAlerts((data ?? []) as Alert[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadAlerts(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadAlerts]);

  return <main className="page-content"><section className="page-title-row"><div><span className="breadcrumb">CROUS Alert / Alertes</span><h1>Alertes</h1><p>Les logements détectés par vos surveillances.</p></div><button className="row-action" type="button" onClick={() => void loadAlerts()} aria-label="Actualiser" disabled={loading}><RefreshCw size={17}/></button></section>{error && <p className="form-error" role="alert">{error}</p>}<section className="window requests-window"><div className="window-header"><div><h2>Alertes détectées</h2><p>{loading ? "Chargement…" : `${alerts.length} alerte${alerts.length === 1 ? "" : "s"}`}</p></div></div>{loading ? <div className="requests-state">Chargement…</div> : alerts.length === 0 ? <div className="requests-state"><Bell size={28}/><strong>Aucune alerte</strong><span>Les nouvelles correspondances apparaîtront ici.</span></div> : <div className="listing-list">{alerts.map(alert => { const listing = Array.isArray(alert.logements) ? alert.logements[0] ?? null : alert.logements; return <article className="listing" key={alert.id}><span className="listing-icon"><Bell size={18}/></span><div><strong>{listing?.residence ?? "Logement indisponible"}</strong><span>{listing ? `${listing.housing_type === "chambre" ? "Chambre" : "Studio"} · ${formatPrice(listing.price_min_cents, listing.price_max_cents)} · ${listing.city}` : "Les détails ne sont plus disponibles"}</span></div><div><strong><CheckCircle2 size={16}/></strong><span>{formatDate(alert.sent_at)}</span></div></article>; })}</div>}</section></main>;
}
