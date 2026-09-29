/**
 * Permisos de las jornadas presenciales (modelo `Simulacion`): un docente ve las jornadas
 * de los módulos que enseña, y dentro de esos, las que creó o las de sus grupos.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/nucleo/prisma";
import { requireGestor, slugsGestionados, type Gestor } from "@/lib/nucleo/permisos";

/**
 * Qué módulo respalda cada tipo de jornada presencial: un docente solo ve las jornadas de
 * los módulos que enseña.
 */
export const MODULO_DE_TIPO_JORNADA = { FARMACIA: "farmacia", DISPENSARIO: "dispensacion", ODONTOLOGIA: "odontologia" } as const;

/** Filtro de Prisma para las jornadas presenciales visibles. */
export async function filtroJornadas(usuario: Gestor): Promise<Prisma.SimulacionWhereInput> {
  const slugs = await slugsGestionados(usuario);
  if (slugs === null) return {};
  const tipos = (Object.entries(MODULO_DE_TIPO_JORNADA) as [keyof typeof MODULO_DE_TIPO_JORNADA, string][])
    .filter(([, slug]) => slugs.includes(slug))
    .map(([tipo]) => tipo);
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
export async function tiposJornadaPermitidos(usuario: Gestor): Promise<(keyof typeof MODULO_DE_TIPO_JORNADA)[]> {
  const slugs = await slugsGestionados(usuario);
  return (Object.entries(MODULO_DE_TIPO_JORNADA) as [keyof typeof MODULO_DE_TIPO_JORNADA, string][])
    .filter(([, slug]) => slugs === null || slugs.includes(slug))
    .map(([tipo]) => tipo);
}
