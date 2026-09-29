import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/nucleo/prisma";
import { filtroEstudiantes, filtroModulos, puedeGestionarGrupo, requireGestor } from "@/lib/nucleo/permisos";
import { seleccionGrupo, sincronizarMatriculasDeGrupo } from "@/lib/nucleo/grupos";

const schema = z.object({
  nombre: z.string().trim().min(1).max(100).optional(),
  descripcion: z.string().trim().max(300).nullable().optional(),
  activo: z.boolean().optional(),
  moduloIds: z.array(z.string().min(1)).optional(),
  // Reemplazan la lista completa.
  estudianteIds: z.array(z.string().min(1)).optional(),
  docenteIds: z.array(z.string().min(1)).optional(), // solo admin
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gestor = await requireGestor();
  if (!gestor) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const { id } = await params;
  if (!(await puedeGestionarGrupo(gestor, id))) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const d = parsed.data;

  // Un docente solo puede poner módulos suyos y estudiantes que ya ve. Los módulos del grupo
  // que no son suyos (los puso coordinación) se conservan.
  let modulos: { id: string }[] | undefined;
  if (d.moduloIds) {
    const filtro = await filtroModulos(gestor);
    const pedidosPermitidos = await prisma.modulo.findMany({
      where: { AND: [{ id: { in: d.moduloIds } }, filtro] },
      select: { id: true },
    });
    // Módulos que el grupo ya tenía y que este docente no gestiona: no los puede quitar.
    const ajenos =
      gestor.rol === "ADMIN"
        ? []
        : await prisma.modulo.findMany({
            where: { grupos: { some: { id } }, NOT: filtro },
            select: { id: true },
          });
    modulos = [...pedidosPermitidos, ...ajenos];
  }
  let estudiantes: { id: string }[] | undefined;
  if (d.estudianteIds) {
    estudiantes = await prisma.usuario.findMany({
      where: { AND: [{ id: { in: d.estudianteIds } }, filtroEstudiantes(gestor)] },
      select: { id: true },
    });
  }
  let docentes: { id: string }[] | undefined;
  if (d.docenteIds && gestor.rol === "ADMIN") {
    docentes = await prisma.usuario.findMany({ where: { id: { in: d.docenteIds }, rol: "DOCENTE" }, select: { id: true } });
  }

  const grupo = await prisma.grupo.update({
    where: { id },
    data: {
      ...(d.nombre !== undefined ? { nombre: d.nombre } : {}),
      ...(d.descripcion !== undefined ? { descripcion: d.descripcion } : {}),
      ...(d.activo !== undefined ? { activo: d.activo } : {}),
      ...(modulos ? { modulos: { set: modulos } } : {}),
      ...(estudiantes ? { estudiantes: { set: estudiantes } } : {}),
      ...(docentes ? { docentes: { set: docentes } } : {}),
    },
    select: seleccionGrupo,
  });
  await sincronizarMatriculasDeGrupo(id);
  return NextResponse.json({ grupo });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gestor = await requireGestor();
  if (!gestor) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const { id } = await params;
  if (!(await puedeGestionarGrupo(gestor, id))) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  // Borrar el grupo no borra a sus estudiantes ni sus matrículas ni sus notas.
  await prisma.grupo.delete({ where: { id } });
  return NextResponse.json({ eliminado: true });
}
