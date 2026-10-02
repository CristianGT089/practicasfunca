"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Jornada = {
  id: string;
  nombre: string;
  tipo: "FARMACIA" | "DISPENSARIO" | "ODONTOLOGIA";
  estado: "BORRADOR" | "ABIERTA" | "EN_REVISION" | "CERRADA";
  creadaEn: string;
  pacientesReales: boolean;
  dictado: boolean;
  grupo: { nombre: string } | null;
  _count: { atenciones: number; participantes: number };
};

const MODALIDAD = (j: Jornada) =>
  j.dictado ? "Dictado" : j.pacientesReales ? "Pacientes reales" : j.tipo === "ODONTOLOGIA" ? "Consultorio" : j.tipo === "FARMACIA" ? "Farmacia" : "Dispensario";

const ESTADO: Record<Jornada["estado"], { texto: string; clase: string; accion: string }> = {
  BORRADOR: { texto: "Lista para iniciar", clase: "bg-gold-100 text-gold-700", accion: "Iniciar" },
  ABIERTA: { texto: "En curso", clase: "bg-emerald-100 text-emerald-700", accion: "Continuar" },
  EN_REVISION: { texto: "Por calificar", clase: "bg-blue-100 text-blue-800", accion: "Calificar" },
  CERRADA: { texto: "Calificada", clase: "bg-slate-100 text-slate-500", accion: "Ver reporte" },
};

/**
 * Inicio de docentes y coordinación: lo pendiente de hoy (jornadas en curso o por calificar,
 * a un clic) y los accesos a lo que más se hace. Cada tarea frecuente queda a tres clics.
 */
export default function InicioAdminPage() {
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState<"ADMIN" | "DOCENTE" | null>(null);
  const [jornadas, setJornadas] = useState<Jornada[] | null>(null);
  const [tipos, setTipos] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setNombre(d.usuario?.nombre ?? "");
        setRol(d.usuario?.rol ?? null);
      });
    fetch("/api/simulaciones")
      .then((r) => r.json())
      .then((d) => {
        setJornadas(d.simulaciones ?? []);
        setTipos(d.tiposPermitidos ?? []);
      });
  }, []);

  const pendientes = (jornadas ?? []).filter((j) => j.estado !== "CERRADA");
  const recientes = (jornadas ?? []).filter((j) => j.estado === "CERRADA").slice(0, 4);
  const hayJornadas = tipos.length > 0;
  const odontologia = tipos.includes("ODONTOLOGIA");
  const hora = new Date().getHours();
  const saludo = hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";

  const acciones = [
    ...(hayJornadas
      ? [
          {
            href: "/admin/simulacion?nueva=1",
            titulo: "Nueva jornada presencial",
            texto: "Turnos, consultorio con casos o pacientes reales.",
            icono: "M12 5v14M5 12h14",
          },
        ]
      : []),
    ...(odontologia
      ? [
          {
            href: "/admin/simulacion?nueva=DICTADO",
            titulo: "Dictar un caso",
            texto: "Todo el grupo registra a la vez; nota individual.",
            icono: "M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5 11a7 7 0 0 0 14 0M12 18v3",
          },
        ]
      : []),
    { href: "/admin/calificaciones", titulo: "Ver calificaciones", texto: "Notas de la práctica virtual por estudiante.", icono: "M4 19V9M10 19V5M16 19v-7M22 19H2" },
    { href: "/admin/estudiantes", titulo: "Agregar estudiantes", texto: "Crear cuentas y entregar contraseñas.", icono: "M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19 8v6M22 11h-6" },
    { href: "/admin/grupos", titulo: "Mis grupos", texto: "Estudiantes y módulos de cada grupo.", icono: "M3 7h18M3 12h18M3 17h12" },
    { href: "/admin/escenarios", titulo: "Casos de práctica virtual", texto: "Crear o editar los casos que resuelven en línea.", icono: "M4 4h16v12H4zM8 20h8" },
    { href: "/panel", titulo: "Ver como estudiante", texto: "Prueba la práctica virtual tal como la ven ellos.", icono: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" },
    ...(rol === "ADMIN"
      ? [{ href: "/admin/docentes", titulo: "Docentes", texto: "Crear docentes y asignarles módulos.", icono: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0" }]
      : []),
  ];

  return (
    <div className="flex flex-col gap-10">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-800 to-blue-700 px-6 py-8 sm:px-10 sm:py-10 text-white">
        <div aria-hidden className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-blue-500/40 blur-2xl" />
        <div aria-hidden className="absolute right-24 -bottom-20 h-48 w-48 rounded-full bg-gold-500/20 blur-2xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="inline-flex rounded-full border border-gold-500/60 bg-gold-500/10 px-3 py-1 text-xs font-semibold text-gold-400">
              {rol === "ADMIN" ? "Coordinación académica" : "Panel docente"}
            </p>
            <h1 className="mt-3 font-heading text-3xl sm:text-4xl font-extrabold tracking-tight">
              {saludo}
              {nombre ? `, ${nombre.split(" ")[0]}` : ""}
            </h1>
            <p className="mt-2 max-w-xl text-blue-200">
              {pendientes.length
                ? `Tienes ${pendientes.length} jornada${pendientes.length === 1 ? "" : "s"} pendiente${pendientes.length === 1 ? "" : "s"}. Retómala${pendientes.length === 1 ? "" : "s"} desde aquí.`
                : "No hay jornadas pendientes. ¿Qué vas a practicar hoy?"}
            </p>
          </div>
          {hayJornadas && (
            <Link href="/admin/simulacion?nueva=1" className="btn-cta self-start sm:self-auto">
              Nueva jornada
            </Link>
          )}
        </div>
      </section>

      {pendientes.length > 0 && (
        <section aria-labelledby="pendientes">
          <p className="eyebrow">Para hoy</p>
          <h2 id="pendientes" className="mt-1 mb-4 font-heading text-xl font-bold text-blue-900">
            Jornadas pendientes
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {pendientes.map((j) => (
              <Link key={j.id} href={`/admin/simulacion/${j.id}`} className="tarjeta-accion flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <span className={`pildora ${ESTADO[j.estado].clase}`}>{ESTADO[j.estado].texto}</span>
                  <p className="mt-2 font-heading font-semibold text-blue-900 truncate">{j.nombre}</p>
                  <p className="text-xs text-slate-500">
                    {MODALIDAD(j)}
                    {j.grupo ? ` · ${j.grupo.nombre}` : ""} · {j._count.participantes} participantes
                  </p>
                </div>
                <span className="btn-suave shrink-0 px-4 py-2">{ESTADO[j.estado].accion} →</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="acciones">
        <p className="eyebrow">Accesos rápidos</p>
        <h2 id="acciones" className="mt-1 mb-4 font-heading text-xl font-bold text-blue-900">
          ¿Qué quieres hacer?
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {acciones.map((a) => (
            <Link key={a.href} href={a.href} className="tarjeta-accion flex gap-4">
              <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-100 text-blue-800">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={a.icono} />
                </svg>
              </span>
              <span>
                <span className="block font-heading font-semibold text-blue-900">{a.titulo}</span>
                <span className="block text-sm text-slate-500">{a.texto}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {recientes.length > 0 && (
        <section aria-labelledby="recientes">
          <div className="flex items-end justify-between gap-3 mb-4">
            <div>
              <p className="eyebrow">Historial</p>
              <h2 id="recientes" className="mt-1 font-heading text-xl font-bold text-blue-900">
                Últimos reportes
              </h2>
            </div>
            <Link href="/admin/simulacion" className="text-sm font-semibold text-blue-800 hover:underline">
              Ver todas →
            </Link>
          </div>
          <ul className="tarjeta divide-y divide-blue-100 overflow-hidden">
            {recientes.map((j) => (
              <li key={j.id}>
                <Link href={`/admin/simulacion/${j.id}`} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-blue-50">
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-800 truncate">{j.nombre}</span>
                    <span className="block text-xs text-slate-500">
                      {MODALIDAD(j)}
                      {j.grupo ? ` · ${j.grupo.nombre}` : ""} · {new Date(j.creadaEn).toLocaleDateString("es-CO")}
                    </span>
                  </span>
                  <span className="text-sm font-semibold text-blue-800 shrink-0">Ver reporte →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {jornadas === null && <p className="text-sm text-slate-500">Cargando...</p>}
    </div>
  );
}
