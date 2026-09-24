import { MapPin, MoreHorizontal } from "lucide-react";

const watches = [
  ["Grenoble centre", "Grenoble · 38000", "Toutes les résidences", "Individuel · ≤ 450 €", "Active"],
  ["Campus universitaire", "Saint-Martin-d’Hères · 38400", "3 résidences", "Individuel, Couple · ≥ 18 m²", "Active"],
  ["Résidences de Gières", "Gières · 38610", "2 résidences", "Tous les types · ≤ 520 €", "En pause"],
];

export default function WatchesPage() {
  return <main className="page-content"><section className="page-title-row"><div><span className="breadcrumb">CROUS Alert / Surveillances</span><h1>Surveillances</h1><p>Simulation des surveillances configurées.</p></div></section><div className="demo-note" role="note">Démonstration — les actions seront reliées à Supabase après la création du modèle de données.</div><section className="window watches-window"><div className="window-header table-title"><div><h2>Mes surveillances</h2><p>{watches.length} exemples affichés</p></div><button className="primary-action" type="button">Nouvelle surveillance</button></div><div className="table-scroll"><table><thead><tr><th>Nom</th><th>Zone</th><th>Résidences</th><th>Critères</th><th>Statut</th><th aria-label="Actions"/></tr></thead><tbody>{watches.map(([name, zone, homes, filters, status]) => <tr key={name}><td><span className="table-name"><MapPin size={17}/>{name}</span></td><td>{zone}</td><td>{homes}</td><td>{filters}</td><td><span className={`status-badge ${status === "Active" ? "is-active" : "is-paused"}`}>{status}</span></td><td><button className="row-action" type="button" aria-label={`Actions pour ${name}`}><MoreHorizontal size={18}/></button></td></tr>)}</tbody></table></div></section></main>;
}
