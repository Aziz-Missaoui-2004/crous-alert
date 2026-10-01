"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, BellRing, CheckCircle2, Clock3, LogOut, RefreshCw, ShieldCheck, Users, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { FullScreenLoader } from "@/components/full-screen-loader";

type Run = { id: string; status: "running" | "completed" | "failed" | "skipped"; started_at: string; finished_at: string | null; watches: number; listings_seen: number; listings_matched: number; alerts_created: number; error: string | null };
type Admin = { first_name: string; last_name: string; role: "admin"; status: "approved" };

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });

export default function AdminMonitoringPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPage = useCallback(async () => {
    setRefreshing(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setRefreshing(false); return router.replace("/connexion"); }
    const { data: profile } = await supabase.from("profiles").select("first_name,last_name,role,status").eq("id", user.id).single<Admin>();
    if (profile?.role !== "admin" || profile.status !== "approved") { setRefreshing(false); return router.replace("/"); }
    const { data, error: runError } = await supabase.from("worker_runs").select("id,status,started_at,finished_at,watches,listings_seen,listings_matched,alerts_created,error").order("started_at", { ascending: false }).limit(1).maybeSingle<Run>();
    setAdmin(profile);
    setRun(data);
    setError(runError ? "Impossible de charger l’état du worker. Vérifiez la migration de lecture administrateur." : "");
    setLoading(false);
    setRefreshing(false);
  }, [router, supabase]);

  useEffect(() => {
    // Le chargement asynchrone initialise l’état depuis la session Supabase.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPage();
  }, [loadPage]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/connexion");
  }

  const initials = `${admin?.first_name?.[0] ?? "A"}${admin?.last_name?.[0] ?? ""}`.toUpperCase();
  const statusLabel = run?.status === "completed" ? "Fonctionnel" : run?.status === "running" ? "En cours" : run?.status === "skipped" ? "Ignoré" : "En erreur";
  const statusClass = run?.status === "completed" ? "is-active" : run?.status === "running" ? "is-pending" : "is-rejected";

  return <main className="app-frame admin-frame">
    {loading && <FullScreenLoader label="Chargement du monitoring…" />}
    <aside className="sidebar">
      <div className="brand"><span className="brand-icon"><BellRing size={19} /></span><span><strong>CROUS</strong> Alert</span></div>
      <nav className="nav-stack" aria-label="Navigation administrateur">
        <span className="nav-label">ADMINISTRATION</span>
        <Link className="nav-item" href="/admin/demandes"><Clock3 size={18} /> Demandes d’accès</Link>
        <Link className="nav-item" href="/admin/utilisateurs"><Users size={18} /> Utilisateurs</Link>
        <Link className="nav-item active" href="/admin/parametres"><Activity size={18} /> État du worker</Link>
      </nav>
      <div className="system-card"><ShieldCheck size={18} /><div><strong>Espace protégé</strong><span>Réservé aux administrateurs approuvés</span></div></div>
      <div className="user-card"><span className="avatar">{initials}</span><div><strong>{admin ? `${admin.first_name} ${admin.last_name}` : "Chargement…"}</strong><span>Administrateur</span></div><button className="icon-action logout-action" type="button" onClick={() => void signOut()} aria-label="Se déconnecter"><LogOut size={17} /></button></div>
    </aside>
    <section className="workspace"><div className="page-content admin-content">
      <section className="page-title-row"><div><span className="breadcrumb">CROUS Alert / Administration</span><h1>État du worker</h1><p>Dernier cycle d’exécution du service de surveillance.</p></div><button className="secondary-action monitor-refresh" type="button" onClick={() => void loadPage()} disabled={refreshing}><RefreshCw className={refreshing ? "is-spinning" : ""} size={16} />{refreshing ? "Actualisation…" : "Actualiser"}</button></section>
      {error && <p className="requests-state is-error">{error}</p>}
      {!error && !run && <section className="window requests-window"><div className="requests-state"><Activity size={28} /><strong>Aucun cycle enregistré</strong><span>Le nouveau worker n’a pas encore exécuté de cycle.</span></div></section>}
      {run && <>
        <section className="metric-grid admin-metrics">
          <article className="metric-window"><div className="window-top"><span className="metric-icon"><Activity size={19} /></span></div><span className="metric-label">État</span><strong className={`status-badge ${statusClass}`}>{statusLabel}</strong><span className="metric-foot">Début : {dateFormat.format(new Date(run.started_at))}</span></article>
          <article className="metric-window"><div className="window-top"><span className="metric-icon"><Users size={19} /></span></div><span className="metric-label">Surveillances</span><strong className="metric-value">{run.watches}</strong><span className="metric-foot">Traitées au dernier cycle</span></article>
          <article className="metric-window"><div className="window-top"><span className="metric-icon"><CheckCircle2 size={19} /></span></div><span className="metric-label">Alertes créées</span><strong className="metric-value">{run.alerts_created}</strong><span className="metric-foot">Nouvelles correspondances</span></article>
        </section>
        <section className="window requests-window"><div className="window-header"><div><h2>Dernier cycle</h2><p>{run.finished_at ? `Terminé le ${dateFormat.format(new Date(run.finished_at))}` : "Cycle en cours"}</p></div>{run.status === "completed" ? <CheckCircle2 className="monitor-ok" size={22} /> : <XCircle className="monitor-error" size={22} />}</div><div className="worker-summary"><span>{run.listings_seen} logement(s) lu(s)</span><span>{run.listings_matched} correspondance(s)</span></div>{run.error && <div className="worker-error" role="alert"><div className="worker-error-title"><XCircle size={17} /><strong>Erreurs du dernier cycle</strong></div><ul>{run.error.split(/;\s*|\n/).filter(Boolean).map((message, index) => <li key={`${index}-${message}`}>{message}</li>)}</ul></div>}</section>
      </>}
    </div></section>
  </main>;
}
