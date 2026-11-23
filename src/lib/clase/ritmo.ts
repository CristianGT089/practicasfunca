import { prisma } from "@/lib/nucleo/prisma";
import { esAdmin, filtroGrupos, type Gestor } from "@/lib/nucleo/permisos";
import { leccionPorSlug } from "./lecciones";
import { NIVELES_MECANOGRAFIA, type IntentoMecanografia } from "./mecanografia";
import type { Leccion } from "./tipos";
import { contextoRitmo } from "./servidor";

/**
 * Clase a tu ritmo: la lección en modo "ritmo" (con explicaciones y en orden) para los
 * estudiantes que el docente eligió. Ver AsignacionClase / RecorridoClase en el esquema.
 */

/** Asignación que este docente puede ver y cambiar (la suya, o cualquiera si es admin). */
export async function asignacionDelGestor(gestor: Gestor, id: string) {
  const a = await prisma.asignacionClase.findUnique({ where: { id }, include: { grupo: { select: { id: true, nombre: true } } } });
  if (!a) return null;
  if (!esAdmin(gestor) && a.docenteId !== gestor.id) return null;
  return a;
}

/** ¿Puede el docente asignar la clase a estos estudiantes? Deben ser del grupo elegido (y el grupo, suyo). */
export async function estudiantesValidos(gestor: Gestor, grupoId: string, ids: string[]) {
  const grupo = await prisma.grupo.count({ where: { AND: [{ id: grupoId }, filtroGrupos(gestor)] } });
  if (!grupo) return null;
  const validos = await prisma.usuario.findMany({
    where: { id: { in: ids }, rol: "ESTUDIANTE", gruposComoEstudiante: { some: { id: grupoId } } },
    select: { id: true },
  });
  return validos.map((v) => v.id);
}

/**
 * Estudiantes del grupo con una marca de si vinieron a alguna clase en vivo de esa lección (para
 * preseleccionar a los que faltaron).
 */
export async function candidatos(grupoId: string, leccion: string) {
  const [estudiantes, asistencias] = await Promise.all([
    prisma.usuario.findMany({
      where: { rol: "ESTUDIANTE", activo: true, gruposComoEstudiante: { some: { id: grupoId } } },
      select: { id: true, nombre: true, usuario: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.asistenciaClase.findMany({ where: { sesion: { leccion, grupoId } }, select: { usuarioId: true } }),
  ]);
  const vinieron = new Set(asistencias.map((a) => a.usuarioId));
  return estudiantes.map((e) => ({ ...e, vino: vinieron.has(e.id) }));
}

// ───────────────────────── Reporte ─────────────────────────

type Progreso = { actividad: string; datos: unknown; completado: boolean };

export type ReporteActividad = {
  id: string;
  titulo: string;
  tipo: string;
  estado: "completa" | "empezada" | "pendiente";
  /** Resumen en una línea: "8 de 11", "Nivel 2 · 24 ppm"… */
  detalle: string;
  /** Lo que le faltó (pasos sin marcar, atajos sin hacer…). */
  faltantes: string[];
};

export type ReportePregunta = {
  id: string;
  pregunta: string;
  respuesta: string | null;
  correcta: string | null;
  /** null = sin respuesta correcta (encuesta) o sin responder. */
  acerto: boolean | null;
};

export type Reporte = {
  actividades: ReporteActividad[];
  preguntas: ReportePregunta[];
  aciertos: number;
  calificables: number;
  respondidas: number;
  mecanografia: { nivel: string; textos: number; mejorPpm: number; precision: number } | null;
};

const objeto = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
const lista = (v: unknown) => (Array.isArray(v) ? v : []);

/** Arma el reporte de un estudiante a partir de su progreso en la lección (versión a tu ritmo). */
export function armarReporte(leccion: Leccion, progresos: Progreso[]): Reporte {
  const de = (id: string) => progresos.find((p) => p.actividad === id);
  const actividades: ReporteActividad[] = [];
  let mecanografia: Reporte["mecanografia"] = null;

  for (const d of leccion.diapositivas) {
    if (d.tipo !== "actividad") continue;
    const p = de(d.id);
    const datos = objeto(p?.datos);
    let detalle = "";
    let faltantes: string[] = [];
    if (d.actividad === "clasificar") {
      const r = objeto(datos.respuestas);
      const bien = d.items.filter((i) => r[i.id] === i.correcta).length;
      detalle = `${bien} de ${d.items.length} bien clasificados`;
      faltantes = d.items.filter((i) => r[i.id] !== i.correcta).map((i) => i.texto);
    } else if (d.actividad === "checklist") {
      const hechos = new Set(lista(datos.hechos) as string[]);
      detalle = `${d.pasos.filter((x) => hechos.has(x.id)).length} de ${d.pasos.length} pasos`;
      faltantes = d.pasos.filter((x) => !hechos.has(x.id)).map((x) => x.texto);
    } else if (d.actividad === "atajos") {
      const hechos = lista(datos.hechos) as string[];
      detalle = `${hechos.length} atajos y tareas marcados`;
    } else if (d.actividad === "interfaz" || d.actividad === "celdas" || d.actividad === "ordenar" || d.actividad === "condicional" || d.actividad === "grafico" || d.actividad === "dinamica") {
      const hechos = new Set(lista(datos.hechos) as number[]);
      const fallos = typeof datos.fallos === "number" ? datos.fallos : 0;
      detalle = `${hechos.size} de ${d.retos.length} retos · ${fallos} intento${fallos === 1 ? "" : "s"} fallido${fallos === 1 ? "" : "s"}`;
      faltantes = d.retos.filter((_, i) => !hechos.has(i)).map((r) => ("pista" in r ? r.pista : r.texto));
    } else if (d.actividad === "formulas") {
      const formulas = objeto(datos.formulas);
      const fallos = typeof datos.fallos === "number" ? datos.fallos : 0;
      detalle = `${d.retos.filter((r) => formulas[r.celda]).length} de ${d.retos.length} fórmulas · ${fallos} intento${fallos === 1 ? "" : "s"} fallido${fallos === 1 ? "" : "s"}`;
      faltantes = d.retos.filter((r) => !formulas[r.celda]).map((r) => `${r.celda}: ${r.texto}`);
    } else if (d.actividad === "mecanografia") {
      const intentos = lista(datos.intentos) as IntentoMecanografia[];
      if (intentos.length) {
        const textos = new Set(intentos.map((i) => `${i.nivel}:${i.texto}`)).size;
        const indice = Math.max(...intentos.map((i) => NIVELES_MECANOGRAFIA.findIndex((n) => n.id === i.nivel)));
        const nivel = NIVELES_MECANOGRAFIA[indice];
        const mejor = intentos.reduce((a, b) => (b.ppm > a.ppm ? b : a));
        const precision = Math.round(intentos.reduce((s, i) => s + i.precision, 0) / intentos.length);
        mecanografia = { nivel: nivel?.nombre ?? "—", textos, mejorPpm: mejor.ppm, precision };
        detalle = `${textos} textos · llegó a ${nivel?.nombre.split(" · ")[0] ?? "—"} · mejor ${mejor.ppm} ppm · ${precision}% de precisión`;
      } else detalle = datos.omitidaEnCelular ? "📱 La dejó para un computador (entró desde el celular)" : "No terminó ningún texto";
    }
    actividades.push({
      id: d.id,
      titulo: d.titulo,
      tipo: d.actividad,
      estado: p?.completado ? "completa" : p ? "empezada" : "pendiente",
      detalle,
      faltantes,
    });
  }

  const preguntas: ReportePregunta[] = leccion.diapositivas.flatMap((d) => {
    if (d.tipo !== "pregunta") return [];
    const opcion = objeto(de(d.id)?.datos).opcion;
    const elegida = typeof opcion === "number" ? opcion : null;
    return [
      {
        id: d.id,
        pregunta: d.pregunta,
        respuesta: elegida === null ? null : (d.opciones[elegida] ?? null),
        correcta: d.correcta === undefined ? null : d.opciones[d.correcta],
        acerto: d.correcta === undefined || elegida === null ? null : elegida === d.correcta,
      },
    ];
  });
  const calificables = preguntas.filter((p) => p.correcta !== null);
  return {
    actividades,
    preguntas,
    aciertos: calificables.filter((p) => p.acerto).length,
    calificables: calificables.length,
    respondidas: preguntas.filter((p) => p.respuesta !== null).length,
    mecanografia,
  };
}

/** Reporte completo de una asignación: cada estudiante habilitado, en orden alfabético. */
export async function reporteDeAsignacion(asignacionId: string, slug: string) {
  const leccion = leccionPorSlug(slug, "ritmo");
  if (!leccion) return [];
  const recorridos = await prisma.recorridoClase.findMany({
    where: { asignacionId },
    include: { usuario: { select: { id: true, nombre: true, usuario: true } } },
  });
  const progresos = await prisma.progresoClase.findMany({
    // Solo lo que hizo en esta clase a tu ritmo: ni la clase en vivo ni otras asignaciones.
    where: { leccion: slug, contexto: { in: recorridos.map((r) => contextoRitmo(r.id)) } },
    select: { contexto: true, actividad: true, datos: true, completado: true },
  });
  return recorridos
    .map((r) => ({
      id: r.id,
      estudiante: r.usuario,
      diapositiva: r.diapositiva,
      maxima: r.maxima,
      total: leccion.diapositivas.length,
      iniciadoEn: r.iniciadoEn,
      terminadoEn: r.terminadoEn,
      ultimaVez: r.actualizadoEn,
      revisado: r.revisado,
      dispositivo: r.dispositivo,
      reporte: armarReporte(
        leccion,
        progresos.filter((p) => p.contexto === contextoRitmo(r.id))
      ),
    }))
    .sort((a, b) => a.estudiante.nombre.localeCompare(b.estudiante.nombre, "es"));
}
