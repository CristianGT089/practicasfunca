import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FUNCA Prácticas",
  description: "Simulador de prácticas para el programa de Auxiliar en Farmacia — FUNCA",
  icons: { icon: "/funca-logo.png" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
