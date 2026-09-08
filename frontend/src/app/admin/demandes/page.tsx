import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BellRing,
  Check,
  Clock3,
  Home,
  LogOut,
  Mail,
  ShieldCheck,
  UserRoundCheck,
  Users,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { approveRequest, rejectRequest, signOut } from "./actions";

export const metadata: Metadata = {
  title: "Demandes d’accès — CROUS Alert",
  description: "Gérez les demandes d’accès à CROUS Alert.",
};

export default async function AccessRequestsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/connexion");

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("first_name, last_name, role, status")
    .eq("id", user.id)
    .single();

  if (adminProfile?.role !== "admin" || adminProfile.status !== "approved") {
    redirect("/");
  }

  const { data: requests, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, created_at")
    .eq("role", "user")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const initials = `${adminProfile.first_name?.[0] ?? "A"}${adminProfile.last_name?.[0] ?? ""}`.toUpperCase();
  const fullName = `${adminProfile.first_name} ${adminProfile.last_name}`;

  return (
    <main className="app-frame admin-frame">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon"><BellRing size={19} /></span>
          <span><strong>CROUS</strong> Alert</span>
        </div>

        <nav className="nav-stack" aria-label="Navigation administrateur">
          <span className="nav-label">ADMINISTRATION</span>
          <Link className="nav-item active" href="/admin/demandes">
            <UserRoundCheck size={18} /> Demandes d’accès
            {!!requests?.length && <span className="nav-count">{requests.length}</span>}
          </Link>
          <span className="nav-label section-gap">APPLICATION</span>
          <Link className="nav-item" href="/"><Home size={18} /> Mon espace</Link>
        </nav>

        <div className="system-card">
          <ShieldCheck size={18} />
          <div><strong>Espace protégé</strong><span>Réservé aux administrateurs approuvés</span></div>
        </div>

        <div className="user-card">
          <span className="avatar">{initials}</span>
          <div><strong>{fullName}</strong><span>Administrateur</span></div>
          <form action={signOut}><button className="icon-action" aria-label="Se déconnecter"><LogOut size={17} /></button></form>
        </div>
      </aside>

      <section className="workspace">
        <div className="page-content admin-content">
          <section className="page-title-row">
            <div>
              <span className="breadcrumb">CROUS Alert / Administration</span>
              <h1>Demandes d’accès</h1>
              <p>Acceptez ou refusez les personnes qui souhaitent rejoindre la plateforme.</p>
            </div>
          </section>

          <section className="metric-grid admin-metrics">
            <article className="metric-window accent-orange">
              <div className="window-top"><span className="metric-icon"><Clock3 size={19} /></span></div>
              <span className="metric-label">En attente</span>
              <strong className="metric-value">{requests?.length ?? 0}</strong>
              <span className="metric-foot">Demande{requests?.length === 1 ? "" : "s"} à examiner</span>
            </article>
          </section>

          <section className="window requests-window">
            <div className="window-header">
              <div><h2>Nouvelles demandes</h2><p>Informations fournies lors de la première connexion.</p></div>
              <span className="admin-chip"><Users size={15} /> Accès privé</span>
            </div>

            {error ? (
              <p className="requests-state is-error">Impossible de charger les demandes pour le moment.</p>
            ) : requests?.length ? (
              <div className="request-list">
                {requests.map((request) => (
                  <article className="request-row" key={request.id}>
                    <span className="request-avatar">{request.first_name[0]}{request.last_name[0]}</span>
                    <div className="request-identity">
                      <strong>{request.first_name} {request.last_name}</strong>
                      <span><Mail size={14} /> {request.email}</span>
                    </div>
                    <time dateTime={request.created_at}>
                      {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(request.created_at))}
                    </time>
                    <div className="request-actions">
                      <form action={approveRequest}>
                        <input type="hidden" name="userId" value={request.id} />
                        <button className="approve-action" type="submit"><Check size={16} /> Accepter</button>
                      </form>
                      <form action={rejectRequest}>
                        <input type="hidden" name="userId" value={request.id} />
                        <button className="reject-action" type="submit"><X size={16} /> Refuser</button>
                      </form>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="requests-state">
                <UserRoundCheck size={28} />
                <strong>Aucune demande en attente</strong>
                <span>Les nouvelles demandes apparaîtront automatiquement ici.</span>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
