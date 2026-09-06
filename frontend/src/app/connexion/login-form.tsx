"use client";

import { Eye, EyeOff, LogIn, Mail } from "lucide-react";
import { FormEvent, useState } from "react";

import styles from "./page.module.css";

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Le formulaire est prêt. La connexion sera activée avec Supabase.");
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
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Votre mot de passe"
            autoComplete="current-password"
            minLength={8}
            required
          />
          <button
            className={styles.revealButton}
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </span>
      </label>

      <button className={styles.submitButton} type="submit">
        Se connecter <LogIn size={18} />
      </button>

      {message && <p className={styles.demoMessage} role="status">{message}</p>}
    </form>
  );
}
