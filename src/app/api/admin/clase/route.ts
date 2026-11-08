import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/nucleo/prisma";
import { filtroGrupos, requireGestor } from "@/lib/nucleo/permisos";
import { LECCIONES, leccionPorSlug } from "@/lib/clase/lecciones";
import { gruposDelGestor } from "@/lib/clase/servidor";

/** Lecciones disponibles, grupos del docente y sus clases en vivo abiertas. */
export async function GET() {
  const gestor = await requireGestor();
  if (!gestor) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const [grupos, activas] = await Promise.all([
    gruposDelGestor(gestor),
    prisma.sesionClase.findMany({
      where: { activa: true, ...(gestor.rol === "ADMIN" ? {} : { docenteId: gestor.id }) },
      include: { grupo: { select: { nombre: true } }, docente: { select: { nombre: true } }, _count: { select: { asistencias: true } } },
      orderBy: { creadoEn: "desc" },
    }),
  ]);
  return NextResponse.json({
    lecciones: LECCIONES.map((l) => ({ slug: l.slug, titulo: l.titulo, descripcion: l.descripcion, total: l.diapositivas.length })),
    grupos: grupos.map((g) => ({ id: g.id, nombre: g.nombre, estudiantes: g._count.estudiantes })),
    activas: activas.map((s) => ({
      id: s.id,
      leccion: s.leccion,
      titulo: leccionPorSlug(s.leccion)?.titulo ?? s.leccion,
      grupo: s.grupo?.nombre ?? null,
      docente: s.docente.nombre,
      diapositiva: s.diapositiva,
      asistentes: s._count.asistencias,
      creadoEn: s.creadoEn,
    })),
  });
}

/** Abre una clase en vivo. Un docente debe elegir uno de sus grupos; el admin puede abrirla a todos. */
export async function POST(req: NextRequest) {
  const gestor = await requireGestor();
  if (!gestor) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const leccion = leccionPorSlug(body?.leccion);
  if (!leccion) return NextResponse.json({ error: "Lección no encontrada" }, { status: 400 });
  const grupoId = typeof body?.grupoId === "string" && body.grupoId ? body.grupoId : null;
  if (grupoId) {
    const ok = await prisma.grupo.count({ where: { AND: [{ id: grupoId }, filtroGrupos(gestor)] } });
    if (!ok) return NextResponse.json({ error: "Ese grupo no es tuyo" }, { status: 403 });
  } else if (gestor.rol !== "ADMIN") {
    return NextResponse.json({ error: "Elige uno de tus grupos" }, { status: 400 });
  }
  // Una sola clase en vivo por grupo: si había otra abierta para el mismo grupo, se cierra.
  await prisma.sesionClase.updateMany({
    where: { activa: true, grupoId, ...(gestor.rol === "ADMIN" ? {} : { docenteId: gestor.id }) },
    data: { activa: false, cerradaEn: new Date() },
  });
  const sesion = await prisma.sesionClase.create({ data: { leccion: leccion.slug, grupoId, docenteId: gestor.id } });
  return NextResponse.json({ sesion: { id: sesion.id } });
}
