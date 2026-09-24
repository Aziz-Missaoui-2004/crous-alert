"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BellRing, Clock3, LogOut, Mail, ShieldCheck, UserRoundCheck, Users } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: "user" | "admin";
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

const statusLabels: Record<Profile["status"], string> = {
  pending: "En attente",
  approved: "Approuvé",
  rejected: "Refusé",
};

export default function UsersPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [admin, setAdmin] = useState<Profile | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadPage = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/connexion");
      return;
    }

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email, role, status, created_at")
      .eq("id", user.id)
      .single<Profile>();

    if (adminProfile?.role !== "admin" || adminProfile.status !== "approved") {
      router.replace("/");
      return;
    }

    setAdmin(adminProfile);

    const { data, error: usersError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email, role, status, created_at")
      .order("created_at", { ascending: false });

    setError(usersError ? "Impossible de charger les utilisateurs pour le moment." : "");
    setUsers((data as Profile[] | null) ?? []);
    setLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    // Le chargement asynchrone initialise l'état depuis la session Supabase.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPage();
  }, [loadPage]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/connexion");
  }

  if (loading || !admin) {
    return <main className="admin-loading">Chargement de l’espace administrateur…</main>;
  }

  const initials = `${admin.first_name?.[0] ?? "A"}${admin.last_name?.[0] ?? ""}`.toUpperCase();
  const fullName = `${admin.first_name} ${admin.last_name}`;
  const pendingCount = users.filter((user) => user.status === "pending").length;

  return (
    <main className="app-frame admin-frame">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon"><BellRing size={19} /></span>
          <span><strong>CROUS</strong> Alert</span>
        </div>

        <nav className="nav-stack" aria-label="Navigation administrateur">
          <span className="nav-label">ADMINISTRATION</span>
          <Link className="nav-item" href="/admin/demandes">
            <UserRoundCheck size={18} /> Demandes d’accès
          </Link>
          <Link className="nav-item active" href="/admin/utilisateurs">
            <Users size={18} /> Utilisateurs
          </Link>
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
              <h1>Utilisateurs</h1>
              <p>Consultez les comptes autorisés à accéder à la plateforme.</p>
            </div>
          </section>

          <section className="metric-grid admin-metrics">
            <article className="metric-window accent-blue">
              <div className="window-top"><span className="metric-icon"><Users size={19} /></span></div>
              <span className="metric-label">Comptes enregistrés</span>
              <strong className="metric-value">{users.length}</strong>
              <span className="metric-foot">Utilisateurs et administrateurs</span>
            </article>
            <article className="metric-window accent-orange">
              <div className="window-top"><span className="metric-icon"><Clock3 size={19} /></span></div>
              <span className="metric-label">En attente</span>
              <strong className="metric-value">{pendingCount}</strong>
              <span className="metric-foot">Demandes à examiner</span>
            </article>
          </section>

          <section className="window requests-window">
            <div className="window-header">
              <div><h2>Liste des utilisateurs</h2><p>Visible uniquement par les administrateurs approuvés.</p></div>
              <span className="admin-chip"><ShieldCheck size={15} /> Accès protégé</span>
            </div>

            {error ? (
              <p className="requests-state is-error">{error}</p>
            ) : users.length ? (
              <div className="request-list">
                {users.map((user) => (
                  <article className="request-row" key={user.id}>
                    <span className="request-avatar">{user.first_name[0]}{user.last_name[0]}</span>
                    <div className="request-identity">
                      <strong>{user.first_name} {user.last_name}</strong>
                      <span><Mail size={14} /> {user.email}</span>
                    </div>
                    <div className="request-identity">
                      <span>Rôle : {user.role === "admin" ? "Administrateur" : "Utilisateur"}</span>
                      <span>Créé le {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(user.created_at))}</span>
                    </div>
                    <span className={`status-badge ${user.status === "approved" ? "is-active" : user.status === "pending" ? "is-pending" : "is-rejected"}`}>
                      {statusLabels[user.status]}
                    </span>
                  </article>
                ))}
              </div>
            ) : (
              <div className="requests-state">
                <Users size={28} />
                <strong>Aucun utilisateur enregistré</strong>
                <span>Les comptes apparaîtront ici après leur inscription.</span>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
