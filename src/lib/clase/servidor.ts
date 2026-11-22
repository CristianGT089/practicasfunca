import type { Usuario } from "@prisma/client";
import { prisma } from "@/lib/nucleo/prisma";
import { filtroGrupos, type Gestor } from "@/lib/nucleo/permisos";
import { leccionPorSlug } from "./lecciones";

/** Segundos sin consultar tras los cuales un estudiante se da por desconectado. */
export const SEGUNDOS_CONECTADO = 20;

export type EstadoSesion = {
  id: string;
  leccion: string;
  diapositiva: number;
  maxima: number;
  llamado: number;
  reveladas: string[];
  total: number;
};

function aEstado(s: { id: string; leccion: string; diapositiva: number; maxima: number; llamado: number; reveladas: string[] }): EstadoSesion | null {
  const leccion = leccionPorSlug(s.leccion);
  if (!leccion) return null;
  return {
    id: s.id,
    leccion: s.leccion,
    diapositiva: s.diapositiva,
    maxima: Math.max(s.maxima, s.diapositiva),
    llamado: s.llamado,
    reveladas: s.reveladas,
    total: leccion.diapositivas.length,
  };
}

/** La clase en vivo que le toca a este usuario: la de alguno de sus grupos o una abierta a todos. */
export async function sesionActivaPara(usuario: Usuario): Promise<EstadoSesion | null> {
  const where =
    usuario.rol === "ESTUDIANTE"
      ? { activa: true, OR: [{ grupoId: null }, { grupo: { estudiantes: { some: { id: usuario.id } } } }] }
      : { activa: true, docenteId: usuario.id };
  const s = await prisma.sesionClase.findFirst({ where, orderBy: { creadoEn: "desc" } });
  return s ? aEstado(s) : null;
}

/** Registra que el estudiante sigue conectado y en qué diapositiva va. */
export async function registrarAsistencia(sesionId: string, usuarioId: string, diapositiva: number, siguiendo: boolean) {
  const ahora = new Date();
  await prisma.asistenciaClase.upsert({
    where: { sesionId_usuarioId: { sesionId, usuarioId } },
    create: { sesionId, usuarioId, diapositiva, siguiendo },
    update: { diapositiva, siguiendo, ultimaVez: ahora },
  });
}

/** Sesión de clase que este docente puede controlar (la suya, o cualquiera si es admin). */
export async function sesionDelGestor(gestor: Gestor, id: string) {
  const s = await prisma.sesionClase.findUnique({ where: { id }, include: { grupo: { select: { id: true, nombre: true } } } });
  if (!s) return null;
  if (gestor.rol !== "ADMIN" && s.docenteId !== gestor.id) return null;
  return s;
}

/**
 * Lo que ve el docente de su grupo: quién está conectado, en qué diapositiva y qué actividades
 * completó. En orden alfabético (nunca por resultados: no es una competencia).
 */
export async function participantesDeSesion(sesionId: string, grupoId: string | null, leccion: string) {
  const [asistencias, delGrupo] = await Promise.all([
    prisma.asistenciaClase.findMany({ where: { sesionId }, include: { usuario: { select: { id: true, nombre: true, usuario: true } } } }),
    grupoId
      ? prisma.usuario.findMany({
          where: { rol: "ESTUDIANTE", activo: true, gruposComoEstudiante: { some: { id: grupoId } } },
          select: { id: true, nombre: true, usuario: true },
        })
      : Promise.resolve([]),
  ]);
  const personas = new Map<string, { id: string; nombre: string; usuario: string }>();
  for (const u of delGrupo) personas.set(u.id, u);
  for (const a of asistencias) personas.set(a.usuario.id, a.usuario);
  const ids = [...personas.keys()];
  const progresos = await prisma.progresoClase.findMany({
    where: { usuarioId: { in: ids }, leccion, contexto: CONTEXTO_VIVO },
    select: { usuarioId: true, actividad: true, completado: true },
  });
  const limite = Date.now() - SEGUNDOS_CONECTADO * 1000;
  return [...personas.values()]
    .map((p) => {
      const a = asistencias.find((x) => x.usuarioId === p.id);
      return {
        ...p,
        conectado: !!a && a.ultimaVez.getTime() >= limite,
        vino: !!a,
        diapositiva: a?.diapositiva ?? null,
        siguiendo: a?.siguiendo ?? true,
        completadas: progresos.filter((x) => x.usuarioId === p.id && x.completado).map((x) => x.actividad),
        empezadas: progresos.filter((x) => x.usuarioId === p.id).map((x) => x.actividad),
      };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

export async function gruposDelGestor(gestor: Gestor) {
  return prisma.grupo.findMany({
    where: { AND: [{ activo: true }, filtroGrupos(gestor)] },
    select: { id: true, nombre: true, _count: { select: { estudiantes: true } } },
    orderBy: { nombre: "asc" },
  });
}

// ───────────────────────── Contexto del progreso ─────────────────────────

/** Progreso de la clase en vivo y del repaso libre. */
export const CONTEXTO_VIVO = "";

/** Progreso propio de una clase a tu ritmo: cada recorrido tiene sus resultados aparte. */
export const contextoRitmo = (recorridoId: string) => `ritmo:${recorridoId}`;

/**
 * Contexto donde guardar el progreso de este usuario en esta lección. Sin recorrido = en vivo.
 * Con recorrido, debe ser suyo, de esa lección y estar activo; si no, null (no se guarda).
 */
export async function contextoPara(usuarioId: string, leccion: string, recorridoId: unknown): Promise<string | null> {
  if (recorridoId === undefined || recorridoId === null || recorridoId === "") return CONTEXTO_VIVO;
  if (typeof recorridoId !== "string") return null;
  const r = await prisma.recorridoClase.findUnique({ where: { id: recorridoId }, select: { usuarioId: true, asignacion: { select: { leccion: true, activa: true } } } });
  if (!r || r.usuarioId !== usuarioId || !r.asignacion.activa || r.asignacion.leccion !== leccion) return null;
  return contextoRitmo(recorridoId);
}
