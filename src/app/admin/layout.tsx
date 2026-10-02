"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { gruposAdminModulos } from "@/lib/modulos/registro";
import EncabezadoFunca, { type ItemNav } from "@/components/nucleo/EncabezadoFunca";

type Rol = "ADMIN" | "DOCENTE";

// Navegación por tareas (no por tabla de la base de datos): lo del día a día primero, el
// contenido y la configuración en menús. El turnero no existe suelto: cada jornada crea y
// controla el suyo desde su pantalla (/admin/simulacion/[id]). `roles` = quién lo ve;
// `requiereModulos` = solo si gestiona alguno de esos módulos.
type Enlace = { href: string; label: string; roles: Rol[]; requiereModulos?: string[] };

const JORNADAS: Enlace = {
  href: "/admin/simulacion",
  label: "Jornadas",
  roles: ["ADMIN", "DOCENTE"],
  requiereModulos: ["farmacia", "dispensacion", "odontologia"],
};
const PERSONAS: Enlace[] = [
  { href: "/admin/grupos", label: "Grupos", roles: ["ADMIN", "DOCENTE"] },
  { href: "/admin/estudiantes", label: "Estudiantes", roles: ["ADMIN", "DOCENTE"] },
];
const CONFIGURACION: Enlace[] = [
  { href: "/admin/docentes", label: "Docentes", roles: ["ADMIN"] },
  { href: "/admin/matriculas", label: "Matrículas", roles: ["ADMIN"] },
  { href: "/admin/modulos", label: "Módulos", roles: ["ADMIN"] },
];

// Las secciones de cada módulo (medicamentos, casos de odontología…) van dentro de "Contenido".
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

  if (!sesion) return <div className="min-h-screen grid place-items-center text-slate-500 text-sm">Cargando...</div>;

  // Lo que ve cada rol: un docente solo ve lo de sus módulos.
  const gestiona = (slug: string) => sesion.rol === "ADMIN" || sesion.slugs.includes(slug);
  const visible = (e: Enlace) => e.roles.includes(sesion.rol) && (!e.requiereModulos || e.requiereModulos.some(gestiona));
  const modulos = GRUPOS_MODULO.filter((g) => gestiona(g.slug) && g.secciones.length > 0);
  const contenido = [
    { titulo: "Práctica virtual", items: [{ href: "/admin/escenarios", label: "Casos de la práctica virtual" }] },
    ...modulos.map((g) => ({ titulo: g.nombre, items: g.secciones })),
  ];
  const configuracion = CONFIGURACION.filter(visible);

  // Activo = el enlace de prefijo más largo que coincide ("/admin/modulos" no se marca a la
  // vez que "/admin/modulos/farmacia/medicamentos").
  const todos = [
    "/admin",
    "/admin/calificaciones",
    JORNADAS.href,
    ...PERSONAS.map((e) => e.href),
    ...contenido.flatMap((s) => s.items.map((i) => i.href)),
    ...configuracion.map((e) => e.href),
  ];
  const hrefActivo = todos
    .filter((h) => pathname === h || (h !== "/admin" && pathname.startsWith(h + "/")))
    .sort((a, b) => b.length - a.length)[0];
  const marcar = <T extends { href: string }>(i: T) => ({ ...i, activo: i.href === hrefActivo });
  const seccion = (titulo: string | undefined, items: { href: string; label: string }[]) => ({ titulo, items: items.map(marcar) });

  const nav: ItemNav[] = [
    marcar({ href: "/admin", label: "Inicio" }),
    ...(visible(JORNADAS) ? [marcar({ href: JORNADAS.href, label: JORNADAS.label })] : []),
    marcar({ href: "/admin/calificaciones", label: "Calificaciones" }),
    {
      href: "#personas",
      label: "Estudiantes",
      activo: PERSONAS.some((e) => e.href === hrefActivo),
      secciones: [seccion(undefined, PERSONAS.filter(visible))],
    },
    {
      href: "#contenido",
      label: "Contenido",
      activo: contenido.some((s) => s.items.some((i) => i.href === hrefActivo)),
      secciones: contenido.map((s) => seccion(s.titulo, s.items)),
    },
    ...(configuracion.length
      ? [
          {
            href: "#configuracion",
            label: "Configuración",
            activo: configuracion.some((e) => e.href === hrefActivo),
            secciones: [seccion(undefined, configuracion)],
          },
        ]
      : []),
  ];

  if (RUTAS_SIN_CHROME.includes(pathname)) {
    return <div className="min-h-screen bg-[var(--background)]">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <EncabezadoFunca
        etiqueta={sesion.rol === "ADMIN" ? "Coordinación" : "Docente"}
        inicioHref="/admin"
        nav={nav}
        nombre={sesion.nombre}
        rol={sesion.rol === "ADMIN" ? "Coordinación" : "Docente"}
        onSalir={cerrarSesion}
        extra={
          <Link href="/panel" className="hidden xl:inline-flex rounded-full px-3 py-1.5 text-sm font-medium text-blue-100 hover:bg-white/10 hover:text-white">
            Vista estudiante
          </Link>
        }
      />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}
