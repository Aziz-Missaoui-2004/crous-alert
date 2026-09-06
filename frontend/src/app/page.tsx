import {
  Bell,
  BellRing,
  Building2,
  ChevronDown,
  CircleHelp,
  Clock3,
  ExternalLink,
  Home,
  MapPin,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Users,
} from "lucide-react";

const watches = [
  { name: "Grenoble centre", zone: "Grenoble · 38000", homes: "Toutes", filters: "Individuel · ≤ 450 €", status: "Active", checked: "Il y a 3 min" },
  { name: "Campus universitaire", zone: "Saint-Martin-d’Hères · 38400", homes: "3 résidences", filters: "Individuel, Couple · ≥ 18 m²", status: "Active", checked: "Il y a 3 min" },
  { name: "Résidences de Gières", zone: "Gières · 38610", homes: "2 résidences", filters: "Tous les types · ≤ 520 €", status: "En pause", checked: "Hier à 21:10" },
];

export default function HomePage() {
  return (
    <main className="app-frame">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon"><BellRing size={19} /></span>
          <span><strong>CROUS</strong> Alert</span>
        </div>

        <nav className="nav-stack" aria-label="Navigation principale">
          <span className="nav-label">ESPACE</span>
          <a className="nav-item active" href="#dashboard"><Home size={18} /> Vue d’ensemble</a>
          <a className="nav-item" href="#watches"><Search size={18} /> Surveillances <span className="nav-count">3</span></a>
          <a className="nav-item" href="#listings"><Building2 size={18} /> Logements trouvés</a>
          <a className="nav-item" href="#alerts"><Bell size={18} /> Alertes <span className="nav-dot" /></a>

          <span className="nav-label section-gap">GESTION</span>
          <a className="nav-item" href="#users"><Users size={18} /> Utilisateurs</a>
          <a className="nav-item" href="#settings"><Settings size={18} /> Paramètres</a>
        </nav>

        <div className="system-card">
          <span className="pulse"><i /></span>
          <div><strong>Surveillance active</strong><span>Prochain passage dans 7 min</span></div>
        </div>

        <div className="user-card">
          <span className="avatar">AM</span>
          <div><strong>Aziz Missaoui</strong><span>Administrateur</span></div>
          <MoreHorizontal size={18} />
        </div>
      </aside>

      <section className="workspace" id="dashboard">
        <header className="topbar">
          <button className="menu-button" aria-label="Ouvrir le menu"><Menu size={20} /></button>
          <label className="global-search">
            <Search size={17} />
            <input aria-label="Rechercher" placeholder="Rechercher une surveillance ou une résidence…" />
          </label>
          <div className="top-actions">
            <button className="help-button"><CircleHelp size={18} /><span>Aide</span></button>
            <button className="notification-button" aria-label="Notifications"><Bell size={19} /><i /></button>
            <div className="top-profile"><span className="avatar small">AM</span><div><strong>Aziz Missaoui</strong><span>Administrateur</span></div><ChevronDown size={16} /></div>
          </div>
        </header>

        <div className="page-content">
          <section className="page-title-row">
            <div><span className="breadcrumb">CROUS Alert / Vue d’ensemble</span><h1>Tableau de bord</h1><p>Suivez vos recherches et les dernières disponibilités détectées.</p></div>
            <button className="primary-action"><Plus size={18} /> Nouvelle surveillance</button>
          </section>

          <nav className="tabs" aria-label="Sections du tableau de bord">
            <a className="tab active" href="#overview">Vue d’ensemble</a>
            <a className="tab" href="#activity">Activité</a>
            <a className="tab" href="#history">Historique</a>
          </nav>

          <section className="metric-grid" id="overview">
            <article className="metric-window accent-blue">
              <div className="window-top"><span className="metric-icon"><Search size={19} /></span><MoreHorizontal size={17} /></div>
              <span className="metric-label">Surveillances actives</span><strong className="metric-value">2</strong><span className="metric-foot positive">Toutes fonctionnent normalement</span>
            </article>
            <article className="metric-window accent-green">
              <div className="window-top"><span className="metric-icon"><Building2 size={19} /></span><MoreHorizontal size={17} /></div>
              <span className="metric-label">Logements détectés</span><strong className="metric-value">12</strong><span className="metric-foot positive">+2 ces dernières 24 h</span>
            </article>
            <article className="metric-window accent-violet">
              <div className="window-top"><span className="metric-icon"><Bell size={19} /></span><MoreHorizontal size={17} /></div>
              <span className="metric-label">Alertes envoyées</span><strong className="metric-value">8</strong><span className="metric-foot">Aucun envoi en échec</span>
            </article>
            <article className="metric-window accent-orange">
              <div className="window-top"><span className="metric-icon"><Clock3 size={19} /></span><MoreHorizontal size={17} /></div>
              <span className="metric-label">Dernière vérification</span><strong className="metric-value compact">09:57</strong><span className="metric-foot">Prochaine analyse à 10:07</span>
            </article>
          </section>

          <section className="insight-grid" id="activity">
            <article className="window activity-window">
              <div className="window-header"><div><h2>Activité des détections</h2><p>Logements correspondant à vos critères sur 7 jours</p></div><button className="filter-button">7 derniers jours <ChevronDown size={15} /></button></div>
              <div className="chart-area" role="img" aria-label="Graphique des détections sur sept jours">
                <div className="chart-y"><span>6</span><span>4</span><span>2</span><span>0</span></div>
                <div className="chart-plot">
                  <div className="grid-line line-1" /><div className="grid-line line-2" /><div className="grid-line line-3" />
                  <svg viewBox="0 0 600 170" preserveAspectRatio="none" aria-hidden="true">
                    <defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity=".22"/><stop offset="100%" stopColor="#2563eb" stopOpacity="0"/></linearGradient></defs>
                    <path className="area-path" d="M0 150 C55 140 75 75 120 105 S200 145 250 92 S340 55 390 104 S475 120 520 65 S575 72 600 36 L600 170 L0 170 Z" />
                    <path className="line-path" d="M0 150 C55 140 75 75 120 105 S200 145 250 92 S340 55 390 104 S475 120 520 65 S575 72 600 36" />
                    <circle cx="600" cy="36" r="5" />
                  </svg>
                  <div className="chart-x"><span>Dim.</span><span>Lun.</span><span>Mar.</span><span>Mer.</span><span>Jeu.</span><span>Ven.</span><span>Sam.</span></div>
                </div>
              </div>
            </article>

            <article className="window latest-window" id="listings">
              <div className="window-header"><div><h2>Derniers logements</h2><p>Détectés aujourd’hui</p></div><a href="#all-listings">Tout voir <ExternalLink size={14} /></a></div>
              <div className="listing-list">
                <div className="listing"><span className="listing-icon"><Building2 size={18} /></span><div><strong>Résidence Condillac</strong><span>Studio · 18 m² · Grenoble</span></div><div><strong>385 €</strong><span>09:42</span></div></div>
                <div className="listing"><span className="listing-icon"><Building2 size={18} /></span><div><strong>Résidence Ouest</strong><span>T1 · 20 m² · Grenoble</span></div><div><strong>417 €</strong><span>08:16</span></div></div>
                <div className="listing"><span className="listing-icon"><Building2 size={18} /></span><div><strong>Résidence Berlioz</strong><span>Chambre · 14 m² · Gières</span></div><div><strong>302 €</strong><span>07:51</span></div></div>
              </div>
              <p className="legal-note">Source : site officiel du CROUS · Service indépendant, non affilié au CROUS.</p>
            </article>
          </section>

          <section className="window watches-window" id="watches">
            <div className="window-header table-title"><div><h2>Mes surveillances</h2><p>Configurez les zones et les logements que vous souhaitez suivre.</p></div><button className="secondary-action"><SlidersHorizontal size={16} /> Filtres</button></div>
            <div className="table-scroll">
              <table>
                <thead><tr><th>Surveillance</th><th>Zone</th><th>Résidences</th><th>Critères</th><th>Statut</th><th>Dernier passage</th><th aria-label="Actions" /></tr></thead>
                <tbody>
                  {watches.map((watch) => (
                    <tr key={watch.name}>
                      <td><span className="table-name"><MapPin size={17} />{watch.name}</span></td><td>{watch.zone}</td><td>{watch.homes}</td><td>{watch.filters}</td>
                      <td><span className={`status-badge ${watch.status === "Active" ? "is-active" : "is-paused"}`}>{watch.status}</span></td><td>{watch.checked}</td><td><button className="row-action" aria-label={`Actions pour ${watch.name}`}><MoreHorizontal size={18} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
