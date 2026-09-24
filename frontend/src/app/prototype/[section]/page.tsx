import { BasicPage } from "@/components/basic-page";

const pages: Record<string, { title: string; description: string; message: string }> = {
  accueil: { title: "Accueil — version simple", description: "Version minimale conservée pour comparaison.", message: "Cette version ne contient aucun indicateur ni donnée de démonstration." },
  surveillances: { title: "Surveillances — version simple", description: "Version minimale conservée pour comparaison.", message: "La liste est volontairement vide dans cette version." },
  logements: { title: "Logements — version simple", description: "Version minimale conservée pour comparaison.", message: "Aucune annonce fictive n’est affichée dans cette version." },
  alertes: { title: "Alertes — version simple", description: "Version minimale conservée pour comparaison.", message: "Aucune alerte fictive n’est affichée dans cette version." },
  parametres: { title: "Paramètres — version simple", description: "Version minimale conservée pour comparaison.", message: "La session locale se termine après cinq minutes sans interaction." },
};

export default async function PrototypePage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const page = pages[section] ?? pages.accueil;
  return <BasicPage title={page.title} description={page.description}><div className="basic-state"><h2>Version conservée</h2><p>{page.message}</p></div></BasicPage>;
}
