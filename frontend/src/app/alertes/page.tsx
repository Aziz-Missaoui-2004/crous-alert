import { BasicPage } from "@/components/basic-page";
export default function Page() {
  return (
    <BasicPage title="Alertes" description="Les notifications envoyées pour vos surveillances.">
      <div className="basic-state">
        <h2>Aucune alerte</h2>
        <p>Les alertes envoyées seront conservées ici pour éviter les doublons et suivre les annonces détectées.</p>
      </div>
    </BasicPage>
  );
}
