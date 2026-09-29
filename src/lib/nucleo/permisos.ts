/**
 * Permisos por rol. El núcleo no conoce módulos concretos: todo se decide por los ids o
 * slugs de módulo en los que el docente está matriculado y por los grupos de los que es
 * docente. Ver docs/plan-mejoras.md (Fase 1).
 *
 * Los permisos de jornadas presenciales viven en lib/simulacion/permisos.ts.
 *
 * - ADMIN (coordinación): todo.
 * - DOCENTE: los módulos en los que tiene matrícula y los grupos de los que es docente,
 *   más los estudiantes de esos grupos y los que él mismo creó.
 * - ESTUDIANTE: nada de gestión.
 */
import type { Prisma, Usuario } from "@prisma/client";
import { prisma } from "./prisma";
import { requireUser } from "./auth";

export type Gestor = Usuario & { rol: "ADMIN" | "DOCENTE" };

export const esAdmin = (u: Pick<Usuario, "rol">) => u.rol === "ADMIN";

/** Admin o docente: quien entra a /admin. */
export async function requireGestor(): Promise<Gestor | null> {
  const usuario = await requireUser();
  if (!usuario || (usuario.rol !== "ADMIN" && usuario.rol !== "DOCENTE")) return null;
  return usuario as Gestor;
}

/** Ids de los módulos que gestiona. `null` = todos (admin). */
export async function modulosGestionados(usuario: Gestor): Promise<string[] | null> {
  if (esAdmin(usuario)) return null;
  const matriculas = await prisma.matricula.findMany({ where: { usuarioId: usuario.id }, select: { moduloId: true } });
  return matriculas.map((m) => m.moduloId);
}

/** Slugs de los módulos que gestiona. `null` = todos (admin). */
export async function slugsGestionados(usuario: Gestor): Promise<string[] | null> {
  if (esAdmin(usuario)) return null;
  const matriculas = await prisma.matricula.findMany({
    where: { usuarioId: usuario.id },
    select: { modulo: { select: { slug: true } } },
  });
  return matriculas.map((m) => m.modulo.slug);
}

export async function puedeGestionarModulo(usuario: Gestor, slug: string): Promise<boolean> {
  const slugs = await slugsGestionados(usuario);
  return slugs === null || slugs.includes(slug);
}

/** requireGestor + acceso al módulo dado. Para los endpoints `api/modulos/<slug>/admin/*`. */
export async function requireGestorDeModulo(slug: string): Promise<Gestor | null> {
  const usuario = await requireGestor();
  if (!usuario) return null;
  return (await puedeGestionarModulo(usuario, slug)) ? usuario : null;
}

/** Filtro de Prisma para los módulos visibles. */
export async function filtroModulos(usuario: Gestor): Promise<Prisma.ModuloWhereInput> {
  const ids = await modulosGestionados(usuario);
  return ids === null ? {} : { id: { in: ids } };
}

/** Filtro de Prisma para los grupos visibles. */
export function filtroGrupos(usuario: Gestor): Prisma.GrupoWhereInput {
  return esAdmin(usuario) ? {} : { docentes: { some: { id: usuario.id } } };
}

/** Filtro de Prisma para los estudiantes visibles: los de sus grupos o los que creó. */
export function filtroEstudiantes(usuario: Gestor): Prisma.UsuarioWhereInput {
  const base: Prisma.UsuarioWhereInput = { rol: "ESTUDIANTE" };
  if (esAdmin(usuario)) return base;
  return {
    ...base,
    OR: [{ creadoPorId: usuario.id }, { gruposComoEstudiante: { some: { docentes: { some: { id: usuario.id } } } } }],
  };
}

export async function puedeGestionarEstudiante(usuario: Gestor, estudianteId: string): Promise<boolean> {
  const n = await prisma.usuario.count({ where: { AND: [{ id: estudianteId }, filtroEstudiantes(usuario)] } });
  return n > 0;
}

export async function puedeGestionarGrupo(usuario: Gestor, grupoId: string): Promise<boolean> {
  const n = await prisma.grupo.count({ where: { AND: [{ id: grupoId }, filtroGrupos(usuario)] } });
  return n > 0;
}
