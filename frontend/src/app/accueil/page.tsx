import { Bell, Building2, Clock3, ExternalLink, MapPin, Plus, Search } from "lucide-react";

const watches = [
  { name: "Grenoble centre", zone: "Grenoble · 38000", homes: "Toutes", filters: "Individuel · ≤ 450 €", status: "Active", checked: "Il y a 3 min" },
  { name: "Campus universitaire", zone: "Saint-Martin-d’Hères · 38400", homes: "3 résidences", filters: "Individuel, Couple · ≥ 18 m²", status: "Active", checked: "Il y a 3 min" },
  { name: "Résidences de Gières", zone: "Gières · 38610", homes: "2 résidences", filters: "Tous les types · ≤ 520 €", status: "En pause", checked: "Hier à 21:10" },
];

const listings = [
  { residence: "Résidence Condillac", details: "Studio · 18 m² · Grenoble", price: "385 €", time: "09:42" },
  { residence: "Résidence Ouest", details: "T1 · 20 m² · Grenoble", price: "417 €", time: "08:16" },
  { residence: "Résidence Berlioz", details: "Chambre · 14 m² · Gières", price: "302 €", time: "07:51" },
];

export default function HomePage() {
  return (
    <main className="page-content">
      <section className="page-title-row"><div><span className="breadcrumb">CROUS Alert / Accueil</span><h1>Tableau de bord</h1><p>Vue de démonstration des surveillances et des disponibilités.</p></div><button className="primary-action" type="button"><Plus size={18} /> Nouvelle surveillance</button></section>
      <div className="demo-note" role="note">Démonstration — ces données ne sont pas encore reliées à Supabase ni au bot.</div>
      <section className="metric-grid" aria-label="Résumé de démonstration">
        <article className="metric-window accent-blue"><div className="window-top"><span className="metric-icon"><Search size={19} /></span></div><span className="metric-label">Surveillances actives</span><strong className="metric-value">2</strong><span className="metric-foot positive">Toutes fonctionnent normalement</span></article>
        <article className="metric-window accent-green"><div className="window-top"><span className="metric-icon"><Building2 size={19} /></span></div><span className="metric-label">Logements détectés</span><strong className="metric-value">12</strong><span className="metric-foot positive">+2 ces dernières 24 h</span></article>
        <article className="metric-window accent-violet"><div className="window-top"><span className="metric-icon"><Bell size={19} /></span></div><span className="metric-label">Alertes envoyées</span><strong className="metric-value">8</strong><span className="metric-foot">Aucun envoi en échec</span></article>
        <article className="metric-window accent-orange"><div className="window-top"><span className="metric-icon"><Clock3 size={19} /></span></div><span className="metric-label">Dernière vérification</span><strong className="metric-value compact">09:57</strong><span className="metric-foot">Prochaine analyse à 10:07</span></article>
      </section>
      <section className="insight-grid">
        <article className="window activity-window"><div className="window-header"><div><h2>Activité des détections</h2><p>Simulation sur les sept derniers jours</p></div></div><div className="chart-area" role="img" aria-label="Graphique fictif des détections sur sept jours"><div className="chart-y"><span>6</span><span>4</span><span>2</span><span>0</span></div><div className="chart-plot"><div className="grid-line line-1" /><div className="grid-line line-2" /><div className="grid-line line-3" /><svg viewBox="0 0 600 170" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity=".22"/><stop offset="100%" stopColor="#2563eb" stopOpacity="0"/></linearGradient></defs><path className="area-path" d="M0 150 C55 140 75 75 120 105 S200 145 250 92 S340 55 390 104 S475 120 520 65 S575 72 600 36 L600 170 L0 170 Z"/><path className="line-path" d="M0 150 C55 140 75 75 120 105 S200 145 250 92 S340 55 390 104 S475 120 520 65 S575 72 600 36"/><circle cx="600" cy="36" r="5"/></svg><div className="chart-x"><span>Dim.</span><span>Lun.</span><span>Mar.</span><span>Mer.</span><span>Jeu.</span><span>Ven.</span><span>Sam.</span></div></div></div></article>
        <article className="window latest-window"><div className="window-header"><div><h2>Derniers logements</h2><p>Résultats fictifs détectés aujourd’hui</p></div><a href="/logements">Tout voir <ExternalLink size={14}/></a></div><div className="listing-list">{listings.map((listing) => <div className="listing" key={listing.residence}><span className="listing-icon"><Building2 size={18}/></span><div><strong>{listing.residence}</strong><span>{listing.details}</span></div><div><strong>{listing.price}</strong><span>{listing.time}</span></div></div>)}</div><p className="legal-note">Démonstration — source CROUS non interrogée.</p></article>
      </section>
      <section className="window watches-window"><div className="window-header table-title"><div><h2>Mes surveillances</h2><p>Exemples de configurations disponibles.</p></div></div><div className="table-scroll"><table><thead><tr><th>Surveillance</th><th>Zone</th><th>Résidences</th><th>Critères</th><th>Statut</th><th>Dernier passage</th></tr></thead><tbody>{watches.map((watch) => <tr key={watch.name}><td><span className="table-name"><MapPin size={17}/>{watch.name}</span></td><td>{watch.zone}</td><td>{watch.homes}</td><td>{watch.filters}</td><td><span className={`status-badge ${watch.status === "Active" ? "is-active" : "is-paused"}`}>{watch.status}</span></td><td>{watch.checked}</td></tr>)}</tbody></table></div></section>
    </main>
  );
}
