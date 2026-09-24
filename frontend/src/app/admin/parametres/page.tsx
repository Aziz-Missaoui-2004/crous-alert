import { BasicPage } from "@/components/basic-page";

export default function AdminSettingsPage() {
  return (
    <BasicPage title="Paramètres administrateur" description="Les réglages techniques seront ajoutés uniquement lorsqu’ils seront nécessaires au fonctionnement du service.">
      <div className="basic-state">
        <h2>Aucun réglage disponible</h2>
        <p>La gestion des comptes et des demandes se trouve dans les rubriques dédiées.</p>
      </div>
    </BasicPage>
  );
}
