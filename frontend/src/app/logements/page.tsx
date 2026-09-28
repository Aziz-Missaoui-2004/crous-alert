"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, ExternalLink, RefreshCw } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Listing = {
  id: string;
  residence: string;
  city: string;
  postal_code: string | null;
  housing_type: "chambre" | "studio";
  price_min_cents: number | null;
  price_max_cents: number | null;
  surface_m2: number | null;
  url: string;
  last_seen_at: string;
};

function formatPrice(min: number | null, max: number | null) {
  if (min === null && max === null) return "Prix non précisé";
  if (min === max || max === null) return `${((min ?? max ?? 0) / 100).toLocaleString("fr-FR")} €`;
  return `${((min ?? 0) / 100).toLocaleString("fr-FR")} à ${((max ?? 0) / 100).toLocaleString("fr-FR")} €`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

export default function ListingsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadListings = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: loadError } = await supabase.from("logements").select("id,residence,city,postal_code,housing_type,price_min_cents,price_max_cents,surface_m2,url,last_seen_at").eq("available", true).order("last_seen_at", { ascending: false });
    if (loadError) setError("Impossible de charger les logements trouvés.");
    else setListings((data ?? []) as Listing[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadListings(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadListings]);

  return <main className="page-content"><section className="page-title-row"><div><span className="breadcrumb">CROUS Alert / Logements trouvés</span><h1>Logements trouvés</h1><p>Les annonces correspondant à vos surveillances.</p></div><button className="row-action" type="button" onClick={() => void loadListings()} aria-label="Actualiser" disabled={loading}><RefreshCw size={17}/></button></section>{error && <p className="form-error" role="alert">{error}</p>}<section className="window requests-window"><div className="window-header"><div><h2>Annonces détectées</h2><p>{loading ? "Chargement…" : `${listings.length} résultat${listings.length === 1 ? "" : "s"}`}</p></div></div>{loading ? <div className="requests-state">Chargement…</div> : listings.length === 0 ? <div className="requests-state"><Building2 size={28}/><strong>Aucun logement trouvé</strong><span>Les nouveaux résultats apparaîtront ici après un cycle du worker.</span></div> : <div className="listing-list">{listings.map(listing => <article className="listing" key={listing.id}><span className="listing-icon"><Building2 size={18}/></span><div><strong>{listing.residence}</strong><span>{listing.housing_type === "chambre" ? "Chambre" : "Studio"}{listing.surface_m2 ? ` · ${listing.surface_m2} m²` : ""} · {listing.city}{listing.postal_code ? ` · ${listing.postal_code}` : ""}</span></div><div><strong>{formatPrice(listing.price_min_cents, listing.price_max_cents)}</strong><span>Vu le {formatDate(listing.last_seen_at)}</span></div><a className="row-action" href={listing.url} target="_blank" rel="noreferrer" aria-label={`Voir ${listing.residence} sur le site CROUS`}><ExternalLink size={17}/></a></article>)}</div>}</section></main>;
}
