import { BasicPage } from "@/components/basic-page";
export default function Page() {
  return (
    <BasicPage title="Paramètres" description="Les réglages essentiels de votre compte.">
      <div className="basic-state">
        <h2>Session</h2>
        <p>Pour votre sécurité, la session locale se termine après cinq minutes sans interaction.</p>
      </div>
    </BasicPage>
  );
}
