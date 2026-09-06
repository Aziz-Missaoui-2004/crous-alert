"use client";

import { Eye, EyeOff, Send } from "lucide-react";
import { FormEvent, useState } from "react";

import styles from "../connexion/page.module.css";

export function AccessRequestForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("passwordConfirmation") ?? "");

    setSuccess("");
    if (password !== confirmation) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setError("");
    setSuccess("Le formulaire est prêt. L’envoi sera activé lors de la connexion à Supabase.");
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
      <button className={styles.submitButton} type="submit">Envoyer ma demande <Send size={18} /></button>
      {error && <p className={styles.errorMessage} role="alert">{error}</p>}
      {success && <p className={styles.demoMessage} role="status">{success}</p>}
    </form>
  );
}
