import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/nucleo/prisma";
import { filtroGrupos, filtroModulos, requireGestor } from "@/lib/nucleo/permisos";
import { seleccionGrupo } from "@/lib/nucleo/grupos";

export async function GET() {
  const gestor = await requireGestor();
  if (!gestor) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const [grupos, modulos, docentes] = await Promise.all([
    prisma.grupo.findMany({ where: filtroGrupos(gestor), orderBy: { creadoEn: "desc" }, select: seleccionGrupo }),
    prisma.modulo.findMany({
      where: { AND: [{ activo: true }, await filtroModulos(gestor)] },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
    // Solo coordinación asigna docentes a un grupo.
    gestor.rol === "ADMIN"
      ? prisma.usuario.findMany({ where: { rol: "DOCENTE", activo: true }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true } })
      : Promise.resolve([]),
  ]);
  return NextResponse.json({ grupos, modulos, docentes });
}

const schema = z.object({
  nombre: z.string().trim().min(1).max(100),
  descripcion: z.string().trim().max(300).nullable().default(null),
  moduloIds: z.array(z.string().min(1)).default([]),
  docenteIds: z.array(z.string().min(1)).default([]),
});

/** Un docente que crea un grupo queda como su docente; solo puede darle sus módulos. */
export async function POST(req: NextRequest) {
  const gestor = await requireGestor();
  if (!gestor) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const modulos = await prisma.modulo.findMany({
    where: { AND: [{ id: { in: parsed.data.moduloIds } }, await filtroModulos(gestor)] },
    select: { id: true },
  });
  const docenteIds =
    gestor.rol === "ADMIN"
      ? (await prisma.usuario.findMany({ where: { id: { in: parsed.data.docenteIds }, rol: "DOCENTE" }, select: { id: true } })).map((d) => d.id)
      : [gestor.id];

  const grupo = await prisma.grupo.create({
    data: {
      nombre: parsed.data.nombre,
      descripcion: parsed.data.descripcion,
      modulos: { connect: modulos },
      docentes: { connect: docenteIds.map((id) => ({ id })) },
    },
    select: seleccionGrupo,
  });
  return NextResponse.json({ grupo }, { status: 201 });
}
