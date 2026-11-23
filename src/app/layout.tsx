import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FUNCA Prácticas",
  description: "Plataforma de prácticas de FUNCA: casos virtuales, jornadas presenciales y dictados",
  icons: { icon: "/funca-logo.png" },
};

// En el celular, al abrir el teclado se achica el contenido (no solo la vista): las barras fijas
// de la clase siguen visibles y la caja de texto no queda tapada.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
