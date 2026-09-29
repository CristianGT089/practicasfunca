import { prisma } from "./prisma";

export const seleccionGrupo = {
  id: true,
  nombre: true,
  descripcion: true,
  activo: true,
  creadoEn: true,
  modulos: { select: { id: true, nombre: true } },
  docentes: { select: { id: true, nombre: true } },
  estudiantes: { select: { id: true, nombre: true, usuario: true }, orderBy: { nombre: "asc" as const } },
} as const;

/**
 * Deja a los estudiantes del grupo matriculados en todos los módulos del grupo (sin quitar
 * matrículas que ya tuvieran por otros grupos o por el admin).
 */
export async function sincronizarMatriculasDeGrupo(grupoId: string) {
  const grupo = await prisma.grupo.findUnique({
    where: { id: grupoId },
    select: { modulos: { select: { id: true } }, estudiantes: { select: { id: true } } },
  });
  if (!grupo) return;
  const datos = grupo.estudiantes.flatMap((e) => grupo.modulos.map((m) => ({ usuarioId: e.id, moduloId: m.id })));
  if (datos.length > 0) await prisma.matricula.createMany({ data: datos, skipDuplicates: true });
}
