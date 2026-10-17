/**
 * Permisos de las jornadas presenciales (modelo `Simulacion`): un docente ve las jornadas
 * de los módulos que enseña, y dentro de esos, las que creó o las de sus grupos.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/nucleo/prisma";
import { requireGestor, slugsGestionados, type Gestor } from "@/lib/nucleo/permisos";

/**
 * Qué módulos respaldan cada tipo de jornada presencial: un docente ve (y crea) las jornadas
 * de los tipos en los que enseña al menos uno de esos módulos.
 */
export const MODULOS_DE_TIPO_JORNADA = {
  FARMACIA: ["farmacia"],
  // El dispensario y la recepción técnica son de todo el servicio farmacéutico: los ven los
  // docentes de Farmacia y de Dispensación.
  DISPENSARIO: ["dispensacion", "farmacia"],
  ODONTOLOGIA: ["odontologia"],
  ENFERMERIA: ["enfermeria"],
  RECEPCION: ["farmacia", "dispensacion"],
} as const satisfies Record<string, readonly string[]>;

type TipoJornada = keyof typeof MODULOS_DE_TIPO_JORNADA;

/** Tipos de jornada de los módulos dados (null = todos, coordinación). */
function tiposDeModulos(slugs: string[] | null): TipoJornada[] {
  return (Object.entries(MODULOS_DE_TIPO_JORNADA) as [TipoJornada, readonly string[]][])
    .filter(([, modulos]) => slugs === null || modulos.some((m) => slugs.includes(m)))
    .map(([tipo]) => tipo);
}

/** Filtro de Prisma para las jornadas presenciales visibles. */
export async function filtroJornadas(usuario: Gestor): Promise<Prisma.SimulacionWhereInput> {
  const slugs = await slugsGestionados(usuario);
  if (slugs === null) return {};
  const tipos = tiposDeModulos(slugs);
  return {
    AND: [
      { tipo: { in: tipos } },
      { OR: [{ creadaPorId: usuario.id }, { grupo: { docentes: { some: { id: usuario.id } } } }] },
    ],
  };
}

export async function puedeGestionarJornada(usuario: Gestor, simulacionId: string): Promise<boolean> {
  const n = await prisma.simulacion.count({ where: { AND: [{ id: simulacionId }, await filtroJornadas(usuario)] } });
  return n > 0;
}

/** requireGestor + acceso a la jornada dada. */
export async function requireGestorDeJornada(simulacionId: string): Promise<Gestor | null> {
  const usuario = await requireGestor();
  if (!usuario) return null;
  return (await puedeGestionarJornada(usuario, simulacionId)) ? usuario : null;
}

/** Tipos de jornada que puede crear (según sus módulos). */
export async function tiposJornadaPermitidos(usuario: Gestor): Promise<TipoJornada[]> {
  return tiposDeModulos(await slugsGestionados(usuario));
}
