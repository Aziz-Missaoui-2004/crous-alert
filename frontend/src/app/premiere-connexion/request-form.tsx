"use client";

import { Eye, EyeOff, Send } from "lucide-react";
import { FormEvent, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import styles from "../connexion/page.module.css";

export function AccessRequestForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const firstName = String(form.get("firstName") ?? "").trim();
    const lastName = String(form.get("lastName") ?? "").trim();
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("passwordConfirmation") ?? "");

    setSuccess("");
    setError("");
    if (password !== confirmation) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setIsSubmitting(true);

    const supabase = createClient();
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setIsSubmitting(false);

    if (signUpError) {
      setError(
        signUpError.message.toLowerCase().includes("rate limit")
          ? "Trop de demandes ont été envoyées. Réessayez dans quelques minutes."
          : "La demande n’a pas pu être envoyée. Vérifiez les informations puis réessayez.",
      );
      return;
    }

    formElement.reset();
    if (signUpData.user?.identities?.length === 0) {
      setSuccess(
        "Une demande existe déjà pour cette adresse ou un e-mail vient d’être envoyé. Vérifiez votre messagerie avant de réessayer.",
      );
      return;
    }

    setSuccess(
      "Demande enregistrée. Vérifiez votre adresse e-mail, puis attendez la validation de l’administrateur.",
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.nameGrid}>
        <label className={styles.field}><span>Prénom</span><span className={styles.inputWrap}><input name="firstName" autoComplete="given-name" placeholder="Votre prénom" required /></span></label>
        <label className={styles.field}><span>Nom</span><span className={styles.inputWrap}><input name="lastName" autoComplete="family-name" placeholder="Votre nom" required /></span></label>
      </div>

      <label className={styles.field}><span>Adresse e-mail</span><span className={styles.inputWrap}><input name="email" type="email" autoComplete="email" placeholder="nom@exemple.fr" required /></span></label>

      <label className={styles.field}>
        <span>Mot de passe</span>
        <span className={styles.inputWrap}>
          <input name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="12 caractères minimum" minLength={12} required />
          <button className={styles.revealButton} type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Masquer les mots de passe" : "Afficher les mots de passe"} aria-pressed={showPassword}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
        </span>
      </label>

      <label className={styles.field}><span>Confirmation du mot de passe</span><span className={styles.inputWrap}><input name="passwordConfirmation" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Répétez votre mot de passe" minLength={12} required /></span></label>

      <p className={styles.privacyNote}>Votre mot de passe sera géré par Supabase et ne sera jamais visible par l’administrateur.</p>
      <button className={styles.submitButton} type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Envoi en cours…" : "Envoyer ma demande"} <Send size={18} />
      </button>
      {error && <p className={styles.errorMessage} role="alert">{error}</p>}
      {success && <p className={styles.demoMessage} role="status">{success}</p>}
    </form>
  );
}
