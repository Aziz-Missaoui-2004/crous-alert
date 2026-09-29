"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Menu, X, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { FullScreenLoader } from "./full-screen-loader";
const key = "crous-last-activity";
const timeout = 900000;
type Profile = { role: "admin" | "user"; status: string; first_name: string; last_name: string };
const publicRoutes = ["/connexion", "/premiere-connexion", "/auth/confirm", "/auth/callback", "/confirmation-en-attente"];
export function AccountShell({ children }: { children: React.ReactNode }) {
  const path = usePathname(), router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [checked, setChecked] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [open, setOpen] = useState(false), [expired, setExpired] = useState(false);
  const [error, setError] = useState(""), [count, setCount] = useState(0);
  const isPublic = publicRoutes.includes(path);
  const isAdminRoute = path.startsWith("/admin");
  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (isPublic && path !== "/connexion") return;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled) return;
        if (!user) { if (!isPublic) router.replace("/connexion"); return; }
        setExpired(false);
        const { data, error } = await supabase.from("profiles").select("role,status,first_name,last_name").eq("id", user.id).single<Profile>();
        if (cancelled) return;
        if (error) { setError("Impossible de charger votre profil. Rechargez la page."); return; }
        if (!data || data.status !== "approved") { if (!isPublic) router.replace("/connexion?etat=pending"); return; }
        const last = Number(localStorage.getItem(key));
        if (path !== "/connexion" && last && Date.now() - last >= timeout) { setExpired(true); void supabase.auth.signOut({ scope: "local" }); return; }
        if (path === "/connexion" || !last) localStorage.setItem(key, String(Date.now()));
        const home = data.role === "admin" ? "/admin/demandes" : "/accueil";
        if (path === "/" || path === "/connexion" || (data.role === "admin" && !path.startsWith("/admin/")) || (data.role === "user" && path.startsWith("/admin/"))) { router.replace(home); return; }
        setProfile(data); setChecked(path); setError("");
        if (data.role === "admin") {
          const { count } = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "user").eq("status", "pending");
          if (!cancelled) setCount(count ?? 0);
        }
      } catch { if (!cancelled) setError("Connexion indisponible. Rechargez la page."); }
    }
    void check(); return () => { cancelled = true; };
  }, [path, isPublic, router, supabase]);
  useEffect(() => {
    if (isPublic || !profile || expired) return;
    let timer: number | undefined;
    function expire() {
      setExpired(true);
      setOpen(false);
      void supabase.auth.signOut({ scope: "local" });
    }
    function scheduleExpiry() {
      if (timer !== undefined) window.clearTimeout(timer);
      const last = Number(localStorage.getItem(key));
      const remaining = last ? timeout - (Date.now() - last) : timeout;
      timer = window.setTimeout(expire, Math.max(0, remaining));
    }
    function activity(event: Event) {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-manual-logout]")) return;
      localStorage.setItem(key, String(Date.now()));
      scheduleExpiry();
    }
    const events = ["pointerdown", "keydown", "scroll"];
    events.forEach(event => window.addEventListener(event, activity, { passive: true }));
    const visibility = () => { if (document.visibilityState === "visible") scheduleExpiry(); };
    scheduleExpiry();
    document.addEventListener("visibilitychange", visibility);
    return () => { events.forEach(event => window.removeEventListener(event, activity)); if (timer !== undefined) window.clearTimeout(timer); document.removeEventListener("visibilitychange", visibility); };
  }, [profile, isPublic, expired, supabase]);
  async function logout() {
    setExpired(false);
    localStorage.removeItem(key);
    try { await supabase.auth.signOut({ scope: "local" }); }
    finally { router.replace("/connexion"); }
  }
  const admin = profile?.role === "admin";
  const links = admin ? [["/admin/demandes", `Demandes d’accès (${count})`], ["/admin/utilisateurs", "Utilisateurs"]] : [["/accueil", "Accueil"], ["/surveillances", "Surveillances"], ["/logements", "Logements trouvés"]];
  const settings = admin ? "/admin/parametres" : "/parametres";
  if (isPublic) return children;
  if (expired) return <div className="confirm-overlay"><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="expired-title"><h2 id="expired-title">Session expirée</h2><p>Votre session est terminée. Reconnectez-vous pour continuer.</p><div className="confirm-actions"><button autoFocus className="primary-action" onClick={() => { setExpired(false); localStorage.removeItem(key); router.replace("/connexion"); }}>Se reconnecter</button></div></section></div>;
  if (error) return <section className="confirm-dialog"><h2>Chargement interrompu</h2><p>{error}</p><button className="secondary-action" onClick={() => window.location.reload()}>Réessayer</button></section>;
  if (checked !== path) return <FullScreenLoader />;
  if (isAdminRoute) return <div className="account-shell admin-account-shell"><header className="account-header"><button className="menu-button" aria-label="Ouvrir le menu" aria-expanded={open} aria-controls="account-menu" onClick={() => setOpen(true)}><Menu size={20}/></button><strong>CROUS Alert Sender</strong><span>{profile?.first_name} {profile?.last_name}</span></header>
    <button className={`sidebar-shade ${open ? "is-visible" : ""}`} aria-label="Fermer le menu" aria-hidden={!open} tabIndex={open ? 0 : -1} onClick={() => setOpen(false)}/><aside id="account-menu" className={`account-sidebar ${open ? "is-open" : ""}`} inert={!open} onKeyDown={event => { if (event.key === "Escape") setOpen(false); }}><div className="brand">CROUS Alert<button className="icon-action" aria-label="Fermer le menu" onClick={() => setOpen(false)}><X size={18}/></button></div><nav className="nav-stack"><span className="nav-label">ADMINISTRATION</span><Link href="/admin/demandes" className={`nav-item ${path === "/admin/demandes" ? "active" : ""}`} onClick={() => setOpen(false)}>Demandes d’accès{count > 0 && ` (${count})`}</Link><Link href="/admin/utilisateurs" className={`nav-item ${path === "/admin/utilisateurs" ? "active" : ""}`} onClick={() => setOpen(false)}>Utilisateurs</Link><span className="nav-label section-gap">GESTION</span><Link href="/admin/parametres" className={`nav-item ${path === "/admin/parametres" ? "active" : ""}`} onClick={() => setOpen(false)}>État du worker</Link><button data-manual-logout className="nav-item logout-action" onClick={() => void logout()}><LogOut size={18}/> Déconnexion</button></nav></aside>{children}</div>;
  return <div className="account-shell"><header className="account-header"><button className="menu-button" aria-label="Ouvrir le menu" aria-expanded={open} aria-controls="account-menu" onClick={() => setOpen(true)}><Menu size={20}/></button><strong>CROUS Alert Sender</strong><span>{profile?.first_name} {profile?.last_name}</span></header>
    <button className={`sidebar-shade ${open ? "is-visible" : ""}`} aria-label="Fermer le menu" aria-hidden={!open} tabIndex={open ? 0 : -1} onClick={() => setOpen(false)}/>
    <aside id="account-menu" className={`account-sidebar ${open ? "is-open" : ""}`} inert={!open} onKeyDown={event => { if (event.key === "Escape") setOpen(false); }}><div className="brand">CROUS Alert<button className="icon-action" aria-label="Fermer le menu" onClick={() => setOpen(false)}><X size={18}/></button></div><nav className="nav-stack"><span className="nav-label">{admin ? "ADMINISTRATION" : "ESPACE"}</span>{links.map(([href,label]) => <Link key={href} href={href} className={`nav-item ${path === href ? "active" : ""}`} onClick={() => setOpen(false)}>{label}</Link>)}<span className="nav-label section-gap">GESTION</span><Link href={settings} className={`nav-item ${path === settings ? "active" : ""}`} onClick={() => setOpen(false)}>Paramètres</Link><button data-manual-logout className="nav-item logout-action" onClick={() => void logout()}><LogOut size={18}/> Déconnexion</button></nav></aside>{children}</div>;
}
