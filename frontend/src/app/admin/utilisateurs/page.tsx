"use client";

import { BellRing, LogOut, ShieldCheck, Trash2, UserRoundCheck, Users, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { FullScreenLoader } from "@/components/full-screen-loader";

type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: "user" | "admin";
  status: "pending" | "approved" | "rejected";
};

export default function UsersPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [admin, setAdmin] = useState<Profile | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const loadPage = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.replace("/connexion");

    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email, role, status")
      .eq("id", user.id)
      .single<Profile>();

    if (currentProfile?.role !== "admin" || currentProfile.status !== "approved") {
      return router.replace("/");
    }

    const { data, error: listError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email, role, status")
      .neq("id", user.id)
      .order("created_at", { ascending: false });

    setAdmin(currentProfile);
    setUsers((data as Profile[] | null) ?? []);
    setPendingCount(((data as Profile[] | null) ?? []).filter((profile) => profile.status === "pending").length);
    setError(listError ? "Impossible de charger les utilisateurs." : "");
    setLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPage();
  }, [loadPage]);

  async function deleteUser() {
    if (!selectedUser) return;
    setDeleting(true);
    const { error: deleteError } = await supabase.rpc("admin_delete_user", {
      target_user_id: selectedUser.id,
    });
    setDeleting(false);

    if (deleteError) {
      setError("La suppression a échoué. Vérifiez que la fonction SQL est installée.");
      return;
    }

    setSelectedUser(null);
    await loadPage();
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/connexion");
  }

  const displayedAdmin = admin ?? { id: "", first_name: "", last_name: "", email: "", role: "admin" as const, status: "approved" as const };
  const initials = `${displayedAdmin.first_name[0] ?? "A"}${displayedAdmin.last_name[0] ?? ""}`.toUpperCase();

  return (
    <main className="app-frame admin-frame">
      {loading && <FullScreenLoader label="Chargement des utilisateurs…" />}
      <aside className="sidebar">
        <div className="brand"><span className="brand-icon"><BellRing size={19} /></span><span><strong>CROUS</strong> Alert</span></div>
        <nav className="nav-stack" aria-label="Navigation administrateur">
          <span className="nav-label">ADMINISTRATION</span>
          <Link className="nav-item" href="/admin/demandes"><UserRoundCheck size={18} /> Demandes d’accès {pendingCount > 0 && <span className="nav-count">{pendingCount}</span>}</Link>
          <Link className="nav-item active" href="/admin/utilisateurs"><Users size={18} /> Utilisateurs</Link>
        </nav>
        <div className="system-card"><ShieldCheck size={18} /><div><strong>Espace protégé</strong><span>Réservé aux administrateurs approuvés</span></div></div>
        <div className="user-card"><span className="avatar">{initials}</span><div><strong>{admin ? `${displayedAdmin.first_name} ${displayedAdmin.last_name}` : "Chargement…"}</strong><span>Administrateur</span></div><button className="icon-action logout-action" type="button" onClick={() => void signOut()} aria-label="Se déconnecter"><LogOut size={17} /></button></div>
      </aside>

      <section className="workspace">
        <div className="page-content admin-content">
          <section className="page-title-row"><div><span className="breadcrumb">CROUS Alert / Administration</span><h1>Utilisateurs</h1><p>Consultez et supprimez les comptes de la plateforme.</p></div></section>
          <section className="window requests-window">
            <div className="window-header"><div><h2>Comptes enregistrés</h2><p>{users.length} utilisateur{users.length === 1 ? "" : "s"}</p></div></div>
            {error && <p className="requests-state is-error">{error}</p>}
            {!error && users.length === 0 && <div className="requests-state"><Users size={28} /><strong>Aucun utilisateur</strong></div>}
            <div className="request-list">
              {users.map((user) => (
                <article className="request-row" key={user.id}>
                  <span className="request-avatar">{user.first_name[0]}{user.last_name[0]}</span>
                  <div className="request-identity"><strong>{user.first_name} {user.last_name}</strong><span>{user.email}</span></div>
                  <span className={`status-badge ${user.status === "approved" ? "is-active" : "is-paused"}`}>{user.status === "approved" ? "Actif" : user.status === "pending" ? "En attente" : "Refusé"}</span>
                  <button className="reject-action" type="button" onClick={() => setSelectedUser(user)}><Trash2 size={16} /> Supprimer</button>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>

      {selectedUser && (
        <div className="confirm-overlay" role="presentation">
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-title">
            <button className="confirm-close" type="button" onClick={() => setSelectedUser(null)} aria-label="Fermer"><X size={18} /></button>
            <Trash2 size={24} />
            <h2 id="delete-title">Supprimer cet utilisateur ?</h2>
            <p>Le compte de <strong>{selectedUser.first_name} {selectedUser.last_name}</strong> sera supprimé définitivement.</p>
            <div className="confirm-actions"><button type="button" className="secondary-action" onClick={() => setSelectedUser(null)}>Non</button><button type="button" className="delete-confirm" disabled={deleting} onClick={() => void deleteUser()}>{deleting ? "Suppression…" : "Oui, supprimer"}</button></div>
          </section>
        </div>
      )}
    </main>
  );
}
