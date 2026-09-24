import { Building2, ExternalLink } from "lucide-react";

const listings = [
  ["Résidence Condillac", "Studio · 18 m² · Grenoble", "385 €", "Aujourd’hui à 09:42"],
  ["Résidence Ouest", "T1 · 20 m² · Grenoble", "417 €", "Aujourd’hui à 08:16"],
  ["Résidence Berlioz", "Chambre · 14 m² · Gières", "302 €", "Aujourd’hui à 07:51"],
];

export default function ListingsPage() {
  return <main className="page-content"><section className="page-title-row"><div><span className="breadcrumb">CROUS Alert / Logements trouvés</span><h1>Logements trouvés</h1><p>Simulation des annonces correspondant à vos critères.</p></div></section><div className="demo-note" role="note">Démonstration — les annonces sont fictives et aucun lien CROUS n’est interrogé.</div><section className="window requests-window"><div className="window-header"><div><h2>Annonces détectées</h2><p>3 résultats de démonstration</p></div></div><div className="listing-list">{listings.map(([name, details, price, date]) => <article className="listing" key={name}><span className="listing-icon"><Building2 size={18}/></span><div><strong>{name}</strong><span>{details}</span></div><div><strong>{price}</strong><span>{date}</span></div><a className="row-action" href="https://trouverunlogement.lescrous.fr" target="_blank" rel="noreferrer" aria-label={`Voir ${name}`}><ExternalLink size={17}/></a></article>)}</div><p className="legal-note">Démonstration — les liens affichent uniquement le site officiel du CROUS.</p></section></main>;
}
