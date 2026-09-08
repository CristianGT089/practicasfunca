"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { gruposAdminModulos } from "@/lib/modulos/registro";

// Pestañas del núcleo (no dependen de ningún módulo).
const TABS_NUCLEO = [
  { href: "/admin/calificaciones", label: "Calificaciones" },
  { href: "/admin/estudiantes", label: "Estudiantes" },
  { href: "/admin/matriculas", label: "Matrículas" },
  { href: "/admin/modulos", label: "Módulos" },
  { href: "/admin/escenarios", label: "Escenarios" },
];

// Herramientas de admin que no son un módulo.
const TABS_HERRAMIENTAS = [{ href: "/admin/turnero", label: "Turnero" }];

// Las secciones específicas de módulo van en un menú desplegable por módulo, no como
// pestaña por sección (desbordaba la barra).
const GRUPOS_MODULO = gruposAdminModulos();

// Todos los href, para calcular la pestaña activa por prefijo más largo.
const TODOS_HREF = [
  ...TABS_NUCLEO.map((t) => t.href),
  ...TABS_HERRAMIENTAS.map((t) => t.href),
  ...GRUPOS_MODULO.flatMap((g) => g.secciones.map((s) => s.href)),
];

// Rutas del turnero pensadas para pantalla completa (kiosco / proyector): sin la barra de admin.
const RUTAS_SIN_CHROME = ["/admin/turnero/registro", "/admin/turnero/tablero"];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [verificado, setVerificado] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!data.usuario || data.usuario.rol !== "ADMIN") {
          router.push("/");
          return;
        }
        setVerificado(true);
      });
  }, [router]);

  async function cerrarSesion() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  if (!verificado) return <div className="p-8 text-slate-500 text-sm">Cargando...</div>;

  if (RUTAS_SIN_CHROME.includes(pathname)) {
    return <div className="min-h-screen bg-[var(--background)]">{children}</div>;
  }

  // Pestaña activa = la de prefijo más largo que coincide (evita que "/admin/modulos"
  // se marque a la vez que "/admin/modulos/farmacia/medicamentos").
  const hrefActivo = TODOS_HREF.filter((h) => pathname === h || pathname.startsWith(h + "/")).sort(
    (a, b) => b.length - a.length
  )[0];
  const enlaceActivo = (href: string) => href === hrefActivo;

  const claseTab = (activo: boolean) =>
    `px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
      activo ? "border-gold-600 text-blue-900" : "border-transparent text-slate-500 hover:text-blue-800"
    }`;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="bg-blue-900 px-6">
        <div className="mx-auto max-w-5xl flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Image src="/funca-logo.png" alt="FUNCA" width={100} height={50} className="h-8 w-auto bg-white rounded px-1.5 py-1" />
            <span className="font-heading text-sm font-semibold text-white">Prácticas · Administración</span>
          </div>
          <button onClick={cerrarSesion} className="text-sm text-blue-100 hover:text-white transition-colors">
            Cerrar sesión
          </button>
        </div>
      </header>
      <div className="bg-white border-b border-slate-200 px-6">
        <div className="mx-auto max-w-5xl">
          <nav className="flex flex-wrap items-stretch gap-x-1">
            {TABS_NUCLEO.map((tab) => (
              <Link key={tab.href} href={tab.href} className={claseTab(enlaceActivo(tab.href))}>
                {tab.label}
              </Link>
            ))}

            {GRUPOS_MODULO.map((grupo) => {
              const activo = grupo.secciones.some(
                (s) => pathname === s.href || pathname.startsWith(s.href + "/")
              );
              return (
                <div key={grupo.slug} className="relative flex items-stretch group">
                  <button type="button" className={`${claseTab(activo)} inline-flex items-center gap-1`}>
                    {grupo.nombre}
                    <span aria-hidden className="text-[10px]">▾</span>
                  </button>
                  <div className="absolute left-0 top-full z-20 hidden min-w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg group-hover:block group-focus-within:block">
                    {grupo.secciones.map((s) => (
                      <Link
                        key={s.href}
                        href={s.href}
                        className={`block px-4 py-2 text-sm ${
                          enlaceActivo(s.href)
                            ? "font-medium text-blue-900"
                            : "text-slate-600 hover:bg-slate-50 hover:text-blue-800"
                        }`}
                      >
                        {s.label}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}

            {TABS_HERRAMIENTAS.length > 0 && <span className="mx-2 my-2 w-px self-center bg-slate-200" aria-hidden />}
            {TABS_HERRAMIENTAS.map((tab) => (
              <Link key={tab.href} href={tab.href} className={claseTab(enlaceActivo(tab.href))}>
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      <div className="px-6 py-8">{children}</div>
    </div>
  );
}
