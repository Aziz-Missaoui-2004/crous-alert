"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
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

import { createClient } from "@/lib/supabase/client";

type AdminProfile = {
  first_name: string;
  last_name: string;
  role: "user" | "admin";
  status: "pending" | "approved" | "rejected";
};

type AccessRequest = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
};

export default function AccessRequestsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadPage = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/connexion");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name, role, status")
      .eq("id", user.id)
      .single<AdminProfile>();

    if (profile?.role !== "admin" || profile.status !== "approved") {
      router.replace("/");
      return;
    }

    setAdminProfile(profile);

    const { data, error: requestsError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email, created_at")
      .eq("role", "user")
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    setError(requestsError ? "Impossible de charger les demandes pour le moment." : "");
    setRequests((data as AccessRequest[] | null) ?? []);
    setLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    // Le chargement asynchrone initialise l'état depuis la session Supabase.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPage();
  }, [loadPage]);

  async function updateRequest(userId: string, status: "approved" | "rejected") {
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", userId)
      .eq("role", "user")
      .eq("status", "pending");

    if (updateError) {
      setError("La demande n’a pas pu être mise à jour.");
      return;
    }

    await loadPage();
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/connexion");
  }

  if (loading || !adminProfile) {
    return <main className="admin-loading">Chargement de l’espace administrateur…</main>;
  }

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
          <button className="icon-action" type="button" onClick={() => void signOut()} aria-label="Se déconnecter"><LogOut size={17} /></button>
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
                      <button className="approve-action" type="button" onClick={() => void updateRequest(request.id, "approved")}><Check size={16} /> Accepter</button>
                      <button className="reject-action" type="button" onClick={() => void updateRequest(request.id, "rejected")}><X size={16} /> Refuser</button>
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
