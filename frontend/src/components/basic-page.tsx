import type { ReactNode } from "react";

export function BasicPage({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return (
    <main className="page-content">
      <section className="page-title-row">
        <div>
          <span className="breadcrumb">CROUS Alert / {title}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </section>
      {children && <section className="window basic-window">{children}</section>}
    </main>
  );
}
