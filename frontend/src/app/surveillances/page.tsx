import { BasicPage } from "@/components/basic-page";
export default function Page() {
  return (
    <BasicPage title="Surveillances" description="Les zones et critères que vous souhaitez suivre.">
      <div className="basic-state">
        <h2>Aucune surveillance</h2>
        <p>La première surveillance sera ajoutée ici dès que le formulaire et le stockage seront connectés.</p>
      </div>
    </BasicPage>
  );
}
