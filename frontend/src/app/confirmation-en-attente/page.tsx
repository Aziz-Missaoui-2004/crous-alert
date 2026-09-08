import type { Metadata } from "next";
import Link from "next/link";
import { BellRing, CircleCheckBig, Clock3 } from "lucide-react";

import styles from "../connexion/page.module.css";

export const metadata: Metadata = {
  title: "Adresse confirmée — CROUS Alert",
  description: "Votre demande d’accès attend la validation de l’administrateur.",
};

export default function ConfirmationPendingPage() {
  return (
    <main className={`${styles.page} ${styles.centeredPage}`}>
      <div className={styles.glowOne} aria-hidden="true" />
      <div className={styles.glowTwo} aria-hidden="true" />
      <div className={styles.grid} aria-hidden="true" />

      <section className={styles.loginArea}>
        <div className={`${styles.loginCard} ${styles.confirmationCard}`}>
          <div className={styles.authBrand}>
            <span className={styles.brandIcon}><BellRing size={20} /></span>
            <span><strong>CROUS</strong> Alert</span>
          </div>

          <div className={styles.confirmationIcon} aria-hidden="true">
            <CircleCheckBig size={30} />
          </div>

          <div className={styles.confirmationCopy}>
            <h1>Adresse e-mail confirmée</h1>
            <p>
              Votre adresse a bien été vérifiée. Votre demande d’accès est
              maintenant en attente de validation par l’administrateur.
            </p>
          </div>

          <div className={styles.pendingNotice}>
            <Clock3 size={18} aria-hidden="true" />
            <div>
              <strong>Validation en attente</strong>
              <span>Vous pourrez vous connecter dès que votre demande aura été acceptée.</span>
            </div>
          </div>

          <Link className={styles.returnButton} href="/connexion">
            Retour à la connexion
          </Link>
        </div>
      </section>
    </main>
  );
}
