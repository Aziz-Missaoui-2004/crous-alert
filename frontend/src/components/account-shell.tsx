"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Menu, X, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { FullScreenLoader } from "./full-screen-loader";
const key = "crous-last-activity";
const timeout = 300000;
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
        const { data, error } = await supabase.from("profiles").select("role,status,first_name,last_name").eq("id", user.id).single<Profile>();
        if (cancelled) return;
        if (error) { setError("Impossible de charger votre profil. Rechargez la page."); return; }
        if (!data || data.status !== "approved") { if (!isPublic) router.replace("/connexion?etat=pending"); return; }
        const last = Number(localStorage.getItem(key));
        if (last && Date.now() - last >= timeout) { setExpired(true); void supabase.auth.signOut({ scope: "local" }); return; }
        if (!last) localStorage.setItem(key, String(Date.now()));
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" && !isPublic) setExpired(true);
    });
    return () => subscription.unsubscribe();
  }, [supabase, isPublic]);
  useEffect(() => {
    if (isPublic || !profile || expired) return;
    function checkExpiry() {
      const last = Number(localStorage.getItem(key));
      if (last && Date.now() - last >= timeout) { setExpired(true); setOpen(false); void supabase.auth.signOut({ scope: "local" }); return true; }
      return false;
    }
    function activity() { if (!checkExpiry()) localStorage.setItem(key, String(Date.now())); }
    const events = ["pointerdown", "keydown", "scroll"];
    events.forEach(event => window.addEventListener(event, activity, { passive: true }));
    const timer = window.setInterval(checkExpiry, 1000);
    document.addEventListener("visibilitychange", checkExpiry);
    return () => { events.forEach(event => window.removeEventListener(event, activity)); clearInterval(timer); document.removeEventListener("visibilitychange", checkExpiry); };
  }, [profile, isPublic, expired, supabase]);
  async function logout() { localStorage.removeItem(key); await supabase.auth.signOut({ scope: "local" }); router.replace("/connexion"); }
  const admin = profile?.role === "admin";
  const links = admin ? [["/admin/demandes", `Demandes d’accès (${count})`], ["/admin/utilisateurs", "Utilisateurs"]] : [["/accueil", "Accueil"], ["/surveillances", "Surveillances"], ["/logements", "Logements trouvés"], ["/alertes", "Alertes"]];
  const settings = admin ? "/admin/parametres" : "/parametres";
  if (expired) return <div className="confirm-overlay"><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="expired-title"><h2 id="expired-title">Session expirée</h2><p>Votre session est terminée. Reconnectez-vous pour continuer.</p><div className="confirm-actions"><button autoFocus className="primary-action" onClick={() => { localStorage.removeItem(key); router.replace("/connexion"); }}>Se reconnecter</button></div></section></div>;
  if (isPublic) return children;
  if (error) return <section className="confirm-dialog"><h2>Chargement interrompu</h2><p>{error}</p><button className="secondary-action" onClick={() => window.location.reload()}>Réessayer</button></section>;
  if (checked !== path) return <FullScreenLoader />;
  if (isAdminRoute) return children;
  return <div className="account-shell"><header className="account-header"><button className="menu-button" aria-label="Ouvrir le menu" aria-expanded={open} aria-controls="account-menu" onClick={() => setOpen(true)}><Menu size={20}/></button><strong>CROUS Alert Sender</strong><span>{profile?.first_name} {profile?.last_name}</span></header>
    {open && <button className="sidebar-shade" aria-label="Fermer le menu" onClick={() => setOpen(false)}/>}
    <aside id="account-menu" className={`account-sidebar ${open ? "is-open" : ""}`} inert={!open} onKeyDown={event => { if (event.key === "Escape") setOpen(false); }}><div className="brand">CROUS Alert<button className="icon-action" aria-label="Fermer le menu" onClick={() => setOpen(false)}><X size={18}/></button></div><nav className="nav-stack"><span className="nav-label">{admin ? "ADMINISTRATION" : "ESPACE"}</span>{links.map(([href,label]) => <Link key={href} href={href} className={`nav-item ${path === href ? "active" : ""}`} onClick={() => setOpen(false)}>{label}</Link>)}<span className="nav-label section-gap">GESTION</span><Link href={settings} className={`nav-item ${path === settings ? "active" : ""}`} onClick={() => setOpen(false)}>Paramètres</Link><button className="nav-item logout-action" onClick={() => void logout()}><LogOut size={18}/> Déconnexion</button></nav></aside>{children}</div>;
}
