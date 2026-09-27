"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { MapPin, Plus, RefreshCw } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Surveillance = {
  id: string;
  city: string;
  postal_code: string | null;
  housing_type: "chambre" | "studio";
  min_price_cents: number | null;
  max_price_cents: number | null;
  status: "active" | "paused";
};

type FormState = {
  city: string;
  postalCode: string;
  housingType: "chambre" | "studio";
  minPrice: string;
  maxPrice: string;
};

const emptyForm: FormState = { city: "", postalCode: "", housingType: "chambre", minPrice: "", maxPrice: "" };

function formatPrice(cents: number | null) {
  return cents === null ? "" : `${(cents / 100).toLocaleString("fr-FR")} €`;
}

function formatCriteria(watch: Surveillance) {
  const prices = [formatPrice(watch.min_price_cents), formatPrice(watch.max_price_cents)].filter(Boolean);
  const price = prices.length === 2 ? `${prices[0]} – ${prices[1]}` : prices[0] ? `à partir de ${prices[0]}` : prices[1] ? `jusqu’à ${prices[1]}` : "Tous les prix";
  return `${watch.housing_type === "chambre" ? "Chambre" : "Studio"} · ${price}`;
}

export default function WatchesPage() {
  const supabase = useMemo(() => createClient(), []);
  const [watches, setWatches] = useState<Surveillance[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadWatches = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: loadError } = await supabase
      .from("surveillances")
      .select("id,city,postal_code,housing_type,min_price_cents,max_price_cents,status")
      .order("created_at", { ascending: false });
    if (loadError) setError("Impossible de charger vos surveillances.");
    else setWatches((data ?? []) as Surveillance[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadWatches(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadWatches]);

  async function createWatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const min = form.minPrice === "" ? null : Math.round(Number(form.minPrice) * 100);
    const max = form.maxPrice === "" ? null : Math.round(Number(form.maxPrice) * 100);
    if (!form.city.trim()) return setError("La ville est obligatoire.");
    if (form.postalCode && !/^\d{5}$/.test(form.postalCode)) return setError("Le code postal doit contenir 5 chiffres.");
    if ((min !== null && (!Number.isFinite(min) || min < 0)) || (max !== null && (!Number.isFinite(max) || max < 0))) return setError("Les prix doivent être positifs.");
    if (min !== null && max !== null && min > max) return setError("Le prix minimum doit être inférieur au prix maximum.");
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Votre session est terminée. Reconnectez-vous."); setSaving(false); return; }
    const { error: insertError } = await supabase.from("surveillances").insert({
      user_id: user.id,
      city: form.city.trim(),
      postal_code: form.postalCode || null,
      housing_type: form.housingType,
      min_price_cents: min,
      max_price_cents: max,
    });
    if (insertError) setError("Impossible de créer cette surveillance.");
    else { setForm(emptyForm); setShowForm(false); await loadWatches(); }
    setSaving(false);
  }

  return <main className="page-content">
    <section className="page-title-row"><div><span className="breadcrumb">CROUS Alert / Surveillances</span><h1>Surveillances</h1><p>Une surveillance par ville ou code postal.</p></div><button className="primary-action" type="button" onClick={() => { setError(""); setShowForm(true); }}><Plus size={18} /> Nouvelle surveillance</button></section>
    {error && <p className="form-error" role="alert">{error}</p>}
    {showForm && <section className="window watch-form-window"><div className="window-header"><div><h2>Nouvelle surveillance</h2><p>Les champs marqués d’un * sont obligatoires.</p></div></div><form className="watch-form" onSubmit={createWatch}><label>Ville *<input value={form.city} onChange={event => setForm({ ...form, city: event.target.value })} placeholder="Grenoble" required /></label><label>Code postal<input value={form.postalCode} onChange={event => setForm({ ...form, postalCode: event.target.value.replace(/\D/g, "").slice(0, 5) })} inputMode="numeric" placeholder="38000" /></label><fieldset><legend>Type de logement *</legend><label className="choice"><input type="radio" name="housing-type" checked={form.housingType === "chambre"} onChange={() => setForm({ ...form, housingType: "chambre" })} /> Chambre</label><label className="choice"><input type="radio" name="housing-type" checked={form.housingType === "studio"} onChange={() => setForm({ ...form, housingType: "studio" })} /> Studio</label></fieldset><div className="price-fields"><label>Prix minimum<input type="number" min="0" step="1" value={form.minPrice} onChange={event => setForm({ ...form, minPrice: event.target.value })} placeholder="300" /></label><label>Prix maximum<input type="number" min="0" step="1" value={form.maxPrice} onChange={event => setForm({ ...form, maxPrice: event.target.value })} placeholder="500" /></label></div><div className="form-actions"><button className="secondary-action" type="button" onClick={() => setShowForm(false)}>Annuler</button><button className="primary-action" type="submit" disabled={saving}>{saving ? "Création…" : "Créer la surveillance"}</button></div></form></section>}
    <section className="window watches-window"><div className="window-header table-title"><div><h2>Mes surveillances</h2><p>{watches.length} surveillance{watches.length === 1 ? "" : "s"}</p></div><button className="row-action" type="button" onClick={() => void loadWatches()} aria-label="Actualiser" disabled={loading}><RefreshCw size={17}/></button></div>{loading ? <div className="requests-state">Chargement…</div> : watches.length === 0 ? <div className="requests-state"><MapPin size={28}/><strong>Aucune surveillance</strong><span>Créez votre première surveillance.</span></div> : <div className="table-scroll"><table><thead><tr><th>Zone</th><th>Critères</th><th>Statut</th></tr></thead><tbody>{watches.map(watch => <tr key={watch.id}><td><span className="table-name"><MapPin size={17}/>{watch.city}{watch.postal_code ? ` · ${watch.postal_code}` : ""}</span></td><td>{formatCriteria(watch)}</td><td><span className={`status-badge ${watch.status === "active" ? "is-active" : "is-paused"}`}>{watch.status === "active" ? "Active" : "En pause"}</span></td></tr>)}</tbody></table></div>}</section>
  </main>;
}
