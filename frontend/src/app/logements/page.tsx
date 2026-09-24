import { BasicPage } from "@/components/basic-page";
export default function Page() {
  return (
    <BasicPage title="Logements trouvés" description="Les annonces correspondant à vos surveillances.">
      <div className="basic-state">
        <h2>Aucun logement trouvé</h2>
        <p>Les résultats apparaîtront ici après la connexion du worker aux surveillances.</p>
      </div>
    </BasicPage>
  );
}
