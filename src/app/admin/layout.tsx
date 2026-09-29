"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { gruposAdminModulos } from "@/lib/modulos/registro";

type Rol = "ADMIN" | "DOCENTE";

// Pestañas del núcleo (no dependen de ningún módulo). El turnero no existe suelto: cada
// jornada presencial crea y controla el suyo desde su propia pantalla
// (/admin/simulacion/[id]). `roles` = quién la ve; `requiereModulos` = solo si gestiona
// alguno de esos módulos.
const TABS_NUCLEO: { href: string; label: string; roles: Rol[]; requiereModulos?: string[]; menu?: string }[] = [
  { href: "/admin/calificaciones", label: "Calificaciones", roles: ["ADMIN", "DOCENTE"] },
  { href: "/admin/grupos", label: "Grupos", roles: ["ADMIN", "DOCENTE"] },
  { href: "/admin/estudiantes", label: "Estudiantes", roles: ["ADMIN", "DOCENTE"] },
  { href: "/admin/docentes", label: "Docentes", roles: ["ADMIN"], menu: "Configuración" },
  { href: "/admin/matriculas", label: "Matrículas", roles: ["ADMIN"], menu: "Configuración" },
  { href: "/admin/modulos", label: "Módulos", roles: ["ADMIN"], menu: "Configuración" },
  { href: "/admin/escenarios", label: "Práctica virtual", roles: ["ADMIN", "DOCENTE"] },
  {
    href: "/admin/simulacion",
    label: "Jornadas presenciales",
    roles: ["ADMIN", "DOCENTE"],
    requiereModulos: ["farmacia", "dispensacion", "odontologia"],
  },
];

// Las secciones específicas de módulo van en un menú desplegable por módulo, no como
// pestaña por sección (desbordaba la barra).
const GRUPOS_MODULO = gruposAdminModulos();

// Rutas del turnero pensadas para pantalla completa (kiosco / proyector): sin la barra de admin.
const RUTAS_SIN_CHROME = ["/admin/turnero/registro", "/admin/turnero/tablero"];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sesion, setSesion] = useState<{ rol: Rol; nombre: string; slugs: string[] } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        const rol = data.usuario?.rol;
        if (rol !== "ADMIN" && rol !== "DOCENTE") {
          router.push("/");
          return;
        }
        setSesion({
          rol,
          nombre: data.usuario.nombre,
          slugs: (data.modulos ?? []).map((m: { slug: string }) => m.slug),
        });
      });
  }, [router]);

  async function cerrarSesion() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  if (!sesion) return <div className="p-8 text-slate-500 text-sm">Cargando...</div>;

  // Lo que ve cada rol: un docente solo ve las pestañas y los menús de sus módulos.
  const gestiona = (slug: string) => sesion.rol === "ADMIN" || sesion.slugs.includes(slug);
  const tabs = TABS_NUCLEO.filter(
    (t) => t.roles.includes(sesion.rol) && (!t.requiereModulos || t.requiereModulos.some(gestiona))
  );
  // Las pestañas con `menu` se agrupan en un desplegable, igual que las secciones de módulo.
  const gruposModulo = [
    ...[...new Set(tabs.filter((t) => t.menu).map((t) => t.menu!))].map((menu) => ({
      slug: `menu-${menu}`,
      nombre: menu,
      secciones: tabs.filter((t) => t.menu === menu).map((t) => ({ href: t.href, label: t.label })),
    })),
    ...GRUPOS_MODULO.filter((g) => gestiona(g.slug)),
  ];
  // Todos los href, para calcular la pestaña activa por prefijo más largo.
  const TODOS_HREF = [...tabs.map((t) => t.href), ...gruposModulo.flatMap((g) => g.secciones.map((s) => s.href))];

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
    `px-3 sm:px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
      activo ? "border-gold-600 text-blue-900" : "border-transparent text-slate-500 hover:text-blue-800"
    }`;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="bg-blue-900 px-4 sm:px-6">
        <div className="mx-auto max-w-5xl flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
          <div className="flex items-center gap-3">
            <Image src="/funca-logo.png" alt="FUNCA" width={100} height={50} className="h-8 w-auto bg-white rounded px-1.5 py-1" />
            <span className="font-heading text-sm font-semibold text-white">
              Prácticas · {sesion.rol === "ADMIN" ? "Coordinación" : "Docente"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="hidden sm:inline text-sm text-blue-100">{sesion.nombre}</span>
            <Link href="/panel" className="text-sm text-blue-100 hover:text-white transition-colors">
              Ver como estudiante
            </Link>
            <button onClick={cerrarSesion} className="text-sm text-blue-100 hover:text-white transition-colors">
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>
      <div className="bg-white border-b border-slate-200 px-2 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <nav className="flex flex-wrap items-stretch gap-x-1">
            {tabs.filter((t) => !t.menu).map((tab) => (
              <Link key={tab.href} href={tab.href} className={claseTab(enlaceActivo(tab.href))}>
                {tab.label}
              </Link>
            ))}

            {gruposModulo.map((grupo) => {
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
          </nav>
        </div>
      </div>
      <div className="px-4 py-6 sm:px-6 sm:py-8">{children}</div>
    </div>
  );
}
