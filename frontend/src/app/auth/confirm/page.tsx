"use client";

import type { EmailOtpType } from "@supabase/supabase-js";
import { LoaderCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";

import { createClient } from "@/lib/supabase/client";
import styles from "../../connexion/page.module.css";

function ConfirmEmail() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const verificationStarted = useRef(false);

  useEffect(() => {
    if (verificationStarted.current) return;
    verificationStarted.current = true;

    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type") as EmailOtpType | null;

    if (!tokenHash || !type) {
      router.replace("/connexion?confirmation=erreur");
      return;
    }

    const verify = async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      });

      router.replace(
        error
          ? "/connexion?confirmation=erreur"
          : "/confirmation-en-attente",
      );
    };

    void verify();
  }, [router, searchParams]);

  return (
    <main className={`${styles.page} ${styles.centeredPage}`}>
      <section className={styles.loginArea}>
        <div className={`${styles.loginCard} ${styles.verificationCard}`}>
          <LoaderCircle className={styles.verificationSpinner} size={28} aria-hidden="true" />
          <h1>Confirmation en cours</h1>
          <p>Nous vérifions votre adresse e-mail…</p>
        </div>
      </section>
    </main>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense>
      <ConfirmEmail />
    </Suspense>
  );
}
