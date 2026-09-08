"use client";

import { Eye, EyeOff, LogIn, Mail } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import styles from "./page.module.css";

type Notice = { kind: "success" | "error"; text: string };

export function LoginForm({ notice }: { notice?: Notice }) {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");

    setError("");
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError || !data.user) {
        setError(
          signInError?.message.toLowerCase().includes("email not confirmed")
            ? "Confirmez d’abord votre adresse e-mail."
            : "Adresse e-mail ou mot de passe incorrect.",
        );
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("status, role")
        .eq("id", data.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        setError("Le compte existe, mais son profil applicatif est introuvable. Contactez l’administrateur.");
        return;
      }

      if (profile.status !== "approved") {
        await supabase.auth.signOut();
        setError(
          profile?.status === "rejected"
            ? "Cette demande d’accès a été refusée. Contactez l’administrateur."
            : "Votre demande est encore en attente de validation.",
        );
        return;
      }

      router.replace(profile.role === "admin" ? "/admin/demandes" : "/");
      router.refresh();
    } catch {
      setError("La connexion a échoué à cause d’un problème réseau.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.field}>
        <span>Adresse e-mail</span>
        <span className={styles.inputWrap}>
          <Mail size={18} aria-hidden="true" />
          <input name="email" type="email" placeholder="nom@exemple.fr" autoComplete="email" required />
        </span>
      </label>

      <label className={styles.field}>
        <span>Mot de passe</span>
        <span className={styles.inputWrap}>
          <input name="password" type={showPassword ? "text" : "password"} placeholder="Votre mot de passe" autoComplete="current-password" minLength={8} required />
          <button className={styles.revealButton} type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"} aria-pressed={showPassword}>
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </span>
      </label>

      <button className={styles.submitButton} type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Connexion…" : "Se connecter"} <LogIn size={18} />
      </button>

      {error && <p className={styles.errorMessage} role="alert">{error}</p>}
      {!error && notice?.kind === "error" && <p className={styles.errorMessage} role="alert">{notice.text}</p>}
      {notice?.kind === "success" && <p className={styles.demoMessage} role="status">{notice.text}</p>}
    </form>
  );
}
