"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MapPin, Pause, Pencil, Play, Plus, RefreshCw, Trash2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Surveillance = { id: string; city: string; postal_code: string | null; housing_type: "chambre" | "studio"; min_price_cents: number | null; max_price_cents: number | null; status: "active" | "paused" };
type FormState = { city: string; postalCode: string; housingType: "chambre" | "studio"; minPrice: string; maxPrice: string };
type CityOption = { nom: string; code: string; codesPostaux: string[] };

const emptyForm: FormState = { city: "", postalCode: "", housingType: "chambre", minPrice: "", maxPrice: "" };

function formatPrice(cents: number | null) { return cents === null ? "" : `${(cents / 100).toLocaleString("fr-FR")} €`; }
function formatCriteria(watch: Surveillance) {
  const prices = [formatPrice(watch.min_price_cents), formatPrice(watch.max_price_cents)].filter(Boolean);
  const price = prices.length === 2 ? `${prices[0]} – ${prices[1]}` : prices[0] ? `à partir de ${prices[0]}` : prices[1] ? `jusqu’à ${prices[1]}` : "Tous les prix";
  return `${watch.housing_type === "chambre" ? "Chambre" : "Studio"} · ${price}`;
}

export default function WatchesPage() {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  const [watches, setWatches] = useState<Surveillance[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [cityOptions, setCityOptions] = useState<CityOption[]>([]);
  const [selectedCityPostalCodes, setSelectedCityPostalCodes] = useState<string[]>([]);
  const [cityLoading, setCityLoading] = useState(false);
  const [showCityOptions, setShowCityOptions] = useState(false);
  const [showPostalOptions, setShowPostalOptions] = useState(false);

  const loadWatches = useCallback(async () => {
    setLoading(true); setError("");
    const { data, error: loadError } = await supabase.from("surveillances").select("id,city,postal_code,housing_type,min_price_cents,max_price_cents,status").order("created_at", { ascending: false });
    if (loadError) setError("Impossible de charger vos surveillances."); else setWatches((data ?? []) as Surveillance[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { const timer = window.setTimeout(() => { void loadWatches(); }, 0); return () => window.clearTimeout(timer); }, [loadWatches]);
  useEffect(() => {
    if (searchParams.get("nouvelle") !== "1") return;
    const timer = window.setTimeout(() => { setError(""); setEditingId(null); setForm(emptyForm); setShowForm(true); }, 0);
    return () => window.clearTimeout(timer);
  }, [searchParams]);
  useEffect(() => {
    const query = form.city.trim();
    if (query.length < 1) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setCityLoading(true);
      try {
        const response = await fetch(`https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(query)}&fields=nom,code,codesPostaux&boost=population&limit=8`, { signal: controller.signal });
        if (!response.ok) throw new Error("city-search");
        const options = await response.json() as CityOption[];
        setCityOptions(options);
        const exact = options.find((option) => option.nom.localeCompare(query, "fr", { sensitivity: "accent" }) === 0);
        if (exact) setSelectedCityPostalCodes(exact.codesPostaux);
      } catch (searchError) {
        if (!(searchError instanceof DOMException && searchError.name === "AbortError")) setCityOptions([]);
      } finally { if (!controller.signal.aborted) setCityLoading(false); }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [form.city]);

  function openCreate() { setError(""); setEditingId(null); setForm(emptyForm); setSelectedCityPostalCodes([]); setShowForm(true); }
  function openEdit(watch: Surveillance) { setError(""); setEditingId(watch.id); setForm({ city: watch.city, postalCode: watch.postal_code ?? "", housingType: watch.housing_type, minPrice: watch.min_price_cents === null ? "" : String(watch.min_price_cents / 100), maxPrice: watch.max_price_cents === null ? "" : String(watch.max_price_cents / 100) }); setSelectedCityPostalCodes([]); setShowForm(true); }
  function closeForm() { if (!saving) { setShowForm(false); setEditingId(null); setShowCityOptions(false); setShowPostalOptions(false); } }

  async function saveWatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const min = form.minPrice === "" ? null : Math.round(Number(form.minPrice) * 100);
    const max = form.maxPrice === "" ? null : Math.round(Number(form.maxPrice) * 100);
    if (!form.city.trim()) return setError("La ville est obligatoire.");
    if (form.postalCode && !/^\d{5}$/.test(form.postalCode)) return setError("Le code postal doit contenir 5 chiffres.");
    if (form.postalCode && selectedCityPostalCodes.length > 0 && !selectedCityPostalCodes.includes(form.postalCode)) return setError("Ce code postal ne correspond pas à la ville sélectionnée.");
    if ((min !== null && (!Number.isFinite(min) || min < 0)) || (max !== null && (!Number.isFinite(max) || max < 0))) return setError("Les prix doivent être positifs.");
    if (min !== null && max !== null && min > max) return setError("Le prix minimum doit être inférieur au prix maximum.");
    setSaving(true);
    const values = { city: form.city.trim(), postal_code: form.postalCode || null, housing_type: form.housingType, min_price_cents: min, max_price_cents: max };
    let result;
    if (editingId) result = await supabase.from("surveillances").update(values).eq("id", editingId);
    else { const { data: { user } } = await supabase.auth.getUser(); if (!user) { setError("Votre session est terminée. Reconnectez-vous."); setSaving(false); return; } result = await supabase.from("surveillances").insert({ ...values, user_id: user.id }); }
    if (result.error) setError(editingId ? "Impossible de modifier cette surveillance." : "Impossible de créer cette surveillance."); else { closeForm(); await loadWatches(); }
    setSaving(false);
  }

  async function toggleStatus(watch: Surveillance) {
    setError(""); const nextStatus = watch.status === "active" ? "paused" : "active";
    const { error: updateError } = await supabase.from("surveillances").update({ status: nextStatus }).eq("id", watch.id);
    if (updateError) setError("Impossible de modifier le statut."); else setWatches(current => current.map(item => item.id === watch.id ? { ...item, status: nextStatus } : item));
  }
  async function deleteWatch(watch: Surveillance) {
    if (!window.confirm(`Supprimer la surveillance « ${watch.city}${watch.postal_code ? ` · ${watch.postal_code}` : ""} » ?`)) return;
    setError(""); const { error: deleteError } = await supabase.from("surveillances").delete().eq("id", watch.id);
    if (deleteError) setError("Impossible de supprimer cette surveillance."); else setWatches(current => current.filter(item => item.id !== watch.id));
  }

  function chooseCity(option: CityOption) { setForm(current => ({ ...current, city: option.nom, postalCode: "" })); setSelectedCityPostalCodes(option.codesPostaux); setShowCityOptions(false); }
  function choosePostalCode(code: string) { setForm(current => ({ ...current, postalCode: code })); setShowPostalOptions(false); }
  const visibleCities = cityOptions.filter(option => option.nom.toLocaleLowerCase("fr").includes(form.city.trim().toLocaleLowerCase("fr"))).slice(0, 8);
  const visiblePostalCodes = selectedCityPostalCodes.filter(code => code.startsWith(form.postalCode)).slice(0, 8);

  return <main className="page-content">
    <section className="page-title-row"><div><span className="breadcrumb">CROUS Alert / Surveillances</span><h1>Surveillances</h1><p>Une surveillance par ville ou code postal.</p></div><button className="primary-action" type="button" onClick={openCreate}><Plus size={18} /> Nouvelle surveillance</button></section>
    {error && <p className="form-error" role="alert">{error}</p>}
    {showForm && <section className="window watch-form-window"><div className="window-header"><div><h2>{editingId ? "Modifier la surveillance" : "Nouvelle surveillance"}</h2><p>Les champs marqués d’un * sont obligatoires.</p></div></div><form className="watch-form" onSubmit={saveWatch}>
      <label className="autocomplete-field">Ville *<span className="autocomplete-control"><input value={form.city} onFocus={() => setShowCityOptions(true)} onBlur={() => window.setTimeout(() => setShowCityOptions(false), 150)} onChange={event => { const city = event.target.value; const exact = cityOptions.find(option => option.nom.localeCompare(city, "fr", { sensitivity: "accent" }) === 0); if (city.trim().length < 1) setCityOptions([]); setForm(current => ({ ...current, city, postalCode: exact ? "" : current.postalCode })); setSelectedCityPostalCodes(exact?.codesPostaux ?? []); setShowCityOptions(true); }} placeholder="Grenoble" autoComplete="off" role="combobox" aria-expanded={showCityOptions} aria-controls="city-options" aria-autocomplete="list" required />{showCityOptions && visibleCities.length > 0 && <div id="city-options" className="autocomplete-list" role="listbox">{visibleCities.map(option => <button key={option.code} type="button" role="option" aria-selected="false" onMouseDown={event => event.preventDefault()} onClick={() => chooseCity(option)}><strong>{option.nom}</strong><span>{option.codesPostaux.join(", ")}</span></button>)}</div>}</span>{cityLoading && <span className="field-hint">Recherche des communes…</span>}</label>
      <label className="autocomplete-field">Code postal<span className="autocomplete-control"><input value={form.postalCode} onFocus={() => setShowPostalOptions(true)} onBlur={() => window.setTimeout(() => setShowPostalOptions(false), 150)} onChange={event => { setForm(current => ({ ...current, postalCode: event.target.value.replace(/\D/g, "").slice(0, 5) })); setShowPostalOptions(true); }} inputMode="numeric" autoComplete="off" placeholder={selectedCityPostalCodes.length > 0 ? "Choisir un code postal" : "38000"} role="combobox" aria-expanded={showPostalOptions} aria-controls="postal-options" aria-autocomplete="list" />{showPostalOptions && visiblePostalCodes.length > 0 && <div id="postal-options" className="autocomplete-list" role="listbox">{visiblePostalCodes.map(code => <button key={code} type="button" role="option" aria-selected="false" onMouseDown={event => event.preventDefault()} onClick={() => choosePostalCode(code)}>{code}</button>)}</div>}</span>{selectedCityPostalCodes.length > 0 && <span className="field-hint">Codes disponibles pour {form.city} : {selectedCityPostalCodes.join(", ")}</span>}</label>
      <fieldset><legend>Type de logement *</legend><label className="choice"><input type="radio" name="housing-type" checked={form.housingType === "chambre"} onChange={() => setForm(current => ({ ...current, housingType: "chambre" }))} /> Chambre</label><label className="choice"><input type="radio" name="housing-type" checked={form.housingType === "studio"} onChange={() => setForm(current => ({ ...current, housingType: "studio" }))} /> Studio</label></fieldset>
      <div className="price-fields"><label>Prix minimum<input type="number" min="0" step="1" value={form.minPrice} onChange={event => setForm(current => ({ ...current, minPrice: event.target.value }))} placeholder="300" /></label><label>Prix maximum<input type="number" min="0" step="1" value={form.maxPrice} onChange={event => setForm(current => ({ ...current, maxPrice: event.target.value }))} placeholder="500" /></label></div>
      <div className="form-actions"><button className="secondary-action" type="button" onClick={closeForm}>Annuler</button><button className="primary-action" type="submit" disabled={saving}>{saving ? "Enregistrement…" : editingId ? "Enregistrer" : "Créer la surveillance"}</button></div>
    </form></section>}
    <section className="window watches-window"><div className="window-header table-title"><div><h2>Mes surveillances</h2><p>{watches.length} surveillance{watches.length === 1 ? "" : "s"}</p></div><button className="row-action" type="button" onClick={() => void loadWatches()} aria-label="Actualiser" disabled={loading}><RefreshCw size={17}/></button></div>{loading ? <div className="requests-state">Chargement…</div> : watches.length === 0 ? <div className="requests-state"><MapPin size={28}/><strong>Aucune surveillance</strong><span>Créez votre première surveillance.</span></div> : <div className="table-scroll"><table><thead><tr><th>Zone</th><th>Critères</th><th>Statut</th><th aria-label="Actions" /></tr></thead><tbody>{watches.map(watch => <tr key={watch.id}><td><span className="table-name"><MapPin size={17}/>{watch.city}{watch.postal_code ? ` · ${watch.postal_code}` : ""}</span></td><td>{formatCriteria(watch)}</td><td><span className={`status-badge ${watch.status === "active" ? "is-active" : "is-paused"}`}>{watch.status === "active" ? "Active" : "En pause"}</span></td><td><div className="watch-actions"><button className="row-action" type="button" onClick={() => openEdit(watch)} aria-label="Modifier"><Pencil size={16}/></button><button className="row-action" type="button" onClick={() => void toggleStatus(watch)} aria-label={watch.status === "active" ? "Mettre en pause" : "Reprendre"}>{watch.status === "active" ? <Pause size={16}/> : <Play size={16}/>}</button><button className="row-action danger-action" type="button" onClick={() => void deleteWatch(watch)} aria-label="Supprimer"><Trash2 size={16}/></button></div></td></tr>)}</tbody></table></div>}</section>
  </main>;
}
