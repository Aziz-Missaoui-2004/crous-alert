import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BellRing } from "lucide-react";

import { AccessRequestForm } from "./request-form";
import styles from "../connexion/page.module.css";

export const metadata: Metadata = {
  title: "Première connexion — CROUS Alert",
  description: "Demandez l’ouverture de votre espace CROUS Alert.",
};

export default function FirstConnectionPage() {
  return (
    <main className={`${styles.page} ${styles.centeredPage}`}>
      <div className={styles.glowOne} aria-hidden="true" />
      <div className={styles.glowTwo} aria-hidden="true" />
      <div className={styles.grid} aria-hidden="true" />

      <section className={styles.loginArea}>
        <div className={`${styles.loginCard} ${styles.requestCard}`}>
          <div className={styles.authBrand}>
            <span className={styles.brandIcon}><BellRing size={20} /></span>
            <span><strong>CROUS</strong> Alert</span>
          </div>
          <Link className={styles.backLink} href="/connexion"><ArrowLeft size={16} /> Retour à la connexion</Link>
          <div className={styles.requestIntro}>
            <h2>Première connexion</h2>
            <p>Renseignez vos informations. Votre accès restera bloqué jusqu’à la validation de l’administrateur.</p>
          </div>
          <AccessRequestForm />
        </div>
      </section>
    </main>
  );
}
