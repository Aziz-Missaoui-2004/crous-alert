import { BasicPage } from "@/components/basic-page";
import Link from "next/link";

export default function Page() {
  return (
    <BasicPage title="Accueil" description="Gérez vos surveillances et consultez les alertes détectées.">
      <div className="basic-state">
        <h2>Votre espace</h2>
        <p>Commencez par créer une surveillance pour recevoir des alertes adaptées à vos critères.</p>
        <Link className="primary-action" href="/surveillances">Voir mes surveillances</Link>
      </div>
    </BasicPage>
  );
}
