"use client";

import { useEffect, useMemo, useState } from "react";
import { BasicPage } from "@/components/basic-page";
import { createClient } from "@/lib/supabase/client";

type Profile = { first_name: string; last_name: string; email: string; status: string };

export default function Page() {
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("Session indisponible."); setLoading(false); return; }
      const { data, error: profileError } = await supabase.from("profiles").select("first_name,last_name,email,status").eq("id", user.id).single<Profile>();
      if (!cancelled) { setProfile(data); setError(profileError ? "Impossible de charger les informations du compte." : ""); setLoading(false); }
    }
    void loadProfile();
    return () => { cancelled = true; };
  }, [supabase]);
  return <BasicPage title="Paramètres" description="Les informations essentielles de votre compte."><div className="basic-state"><h2>Compte</h2>{loading ? <p>Chargement…</p> : error ? <p className="form-error" role="alert">{error}</p> : <><p><strong>{profile?.first_name} {profile?.last_name}</strong><br />{profile?.email}</p><span className="admin-chip">Compte {profile?.status === "approved" ? "approuvé" : profile?.status}</span></>}</div><div className="basic-state"><h2>Session</h2><p>La session se termine automatiquement après cinq minutes sans interaction.</p></div></BasicPage>;
}
