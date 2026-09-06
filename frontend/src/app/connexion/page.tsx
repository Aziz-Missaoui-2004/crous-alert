import type { Metadata } from "next";
import Link from "next/link";
import { BellRing } from "lucide-react";

import { LoginForm } from "./login-form";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Connexion — CROUS Alert",
  description: "Accédez à votre espace privé CROUS Alert.",
};

export default async function LoginPage({ searchParams }: PageProps<"/connexion">) {
  const { confirmation, etat } = await searchParams;
  const notice =
    confirmation === "ok"
      ? { kind: "success" as const, text: "Adresse e-mail confirmée. Votre demande attend maintenant la validation de l’administrateur." }
      : confirmation === "erreur"
        ? { kind: "error" as const, text: "Ce lien de confirmation est invalide ou a déjà été utilisé." }
        : etat === "pending"
          ? { kind: "error" as const, text: "Votre demande est encore en attente de validation." }
          : undefined;

  return (
    <main className={`${styles.page} ${styles.centeredPage}`}>
      <div className={styles.glowOne} aria-hidden="true" />
      <div className={styles.glowTwo} aria-hidden="true" />
      <div className={styles.grid} aria-hidden="true" />

      <section className={styles.loginArea}>
        <div className={styles.loginCard}>
          <div className={styles.authBrand}>
            <span className={styles.brandIcon}><BellRing size={20} /></span>
            <span><strong>CROUS</strong> Alert</span>
          </div>
          <div className={styles.cardHeading}>
            <h1>CROUS Alert Sender</h1>
            <p>Connectez-vous avec le compte qui vous a été attribué.</p>
          </div>
          <LoginForm notice={notice} />
        </div>
        <div className={styles.supportRow}>
          <span>Un problème d’accès ? Contactez l’administrateur.</span>
          <Link href="/premiere-connexion">Première connexion</Link>
        </div>
      </section>
    </main>
  );
}
