import type { Metadata } from "next";
import { VantaBackground } from "@/components/vanta-background";
import "./globals.css";
import { AccountShell } from "@/components/account-shell";

export const metadata: Metadata = {
  title: "CROUS Alert — Tableau de bord",
  description: "Surveillez les logements CROUS qui correspondent à vos critères.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <VantaBackground />
        <div className="site-content"><AccountShell>{children}</AccountShell></div>
      </body>
    </html>
  );
}
