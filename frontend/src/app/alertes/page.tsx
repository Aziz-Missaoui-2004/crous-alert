import { Bell, CheckCircle2 } from "lucide-react";

const alerts = [
  ["Résidence Condillac", "Grenoble centre", "385 € · Studio · 18 m²", "Aujourd’hui à 09:42"],
  ["Résidence Ouest", "Grenoble centre", "417 € · T1 · 20 m²", "Aujourd’hui à 08:16"],
];

export default function AlertsPage() {
  return <main className="page-content"><section className="page-title-row"><div><span className="breadcrumb">CROUS Alert / Alertes</span><h1>Alertes</h1><p>Simulation de l’historique des notifications.</p></div></section><div className="demo-note" role="note">Démonstration — aucun e-mail n’a été envoyé.</div><section className="window requests-window"><div className="window-header"><div><h2>Alertes envoyées</h2><p>{alerts.length} exemples de notifications</p></div></div><div className="listing-list">{alerts.map(([name, watch, details, date]) => <article className="listing" key={name}><span className="listing-icon"><Bell size={18}/></span><div><strong>{name}</strong><span>{watch} · {details}</span></div><div><strong><CheckCircle2 size={16}/></strong><span>{date}</span></div></article>)}</div></section></main>;
}
