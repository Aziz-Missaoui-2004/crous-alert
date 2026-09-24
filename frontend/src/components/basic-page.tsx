export function BasicPage({ title, description }: { title: string; description: string }) {
  return <main className="page-content"><section className="page-title-row"><div><span className="breadcrumb">CROUS Alert / {title}</span><h1>{title}</h1><p>{description}</p></div></section></main>;
}
