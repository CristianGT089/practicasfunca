import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/nucleo/prisma";
import { requireGestor } from "@/lib/nucleo/permisos";
import { leccionPorSlug } from "@/lib/clase/lecciones";
import { asignacionDelGestor, candidatos, estudiantesValidos, reporteDeAsignacion } from "@/lib/clase/ritmo";

type Ctx = { params: Promise<{ id: string }> };

/** Reporte de la clase a tu ritmo: cada estudiante habilitado, su avance y sus resultados. */
export async function GET(_req: NextRequest, { params }: Ctx) {
  const gestor = await requireGestor();
  if (!gestor) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const { id } = await params;
  const a = await asignacionDelGestor(gestor, id);
  if (!a) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  const leccion = leccionPorSlug(a.leccion, "ritmo");
  const [estudiantes, delGrupo] = await Promise.all([reporteDeAsignacion(a.id, a.leccion), a.grupoId ? candidatos(a.grupoId, a.leccion) : []]);
  return NextResponse.json({
    asignacion: {
      id: a.id,
      leccion: a.leccion,
      titulo: leccion?.titulo ?? a.leccion,
      grupo: a.grupo,
      mensaje: a.mensaje,
      activa: a.activa,
      creadoEn: a.creadoEn,
    },
    estudiantes,
    // Los del grupo que aún no están habilitados (para agregarlos).
    disponibles: delGrupo.filter((c) => !estudiantes.some((e) => e.estudiante.id === c.id)),
  });
}

/**
 * Cambios: `agregar` / `quitar` estudiantes, editar `mensaje`, cerrar o reabrir (`activa`) y
 * `revisar` (marca los reportes terminados como vistos).
 */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const gestor = await requireGestor();
  if (!gestor) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const { id } = await params;
  const a = await asignacionDelGestor(gestor, id);
  if (!a) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  const body = await req.json().catch(() => null);
  const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

  if (strs(body?.agregar).length && a.grupoId) {
    const ids = (await estudiantesValidos(gestor, a.grupoId, strs(body.agregar))) ?? [];
    await prisma.recorridoClase.createMany({ data: ids.map((usuarioId) => ({ asignacionId: a.id, usuarioId })), skipDuplicates: true });
  }
  if (strs(body?.quitar).length) {
    await prisma.recorridoClase.deleteMany({ where: { asignacionId: a.id, usuarioId: { in: strs(body.quitar) } } });
  }
  if (typeof body?.mensaje === "string") {
    await prisma.asignacionClase.update({ where: { id: a.id }, data: { mensaje: body.mensaje.trim().slice(0, 2000) || null } });
  }
  if (typeof body?.activa === "boolean") {
    await prisma.asignacionClase.update({ where: { id: a.id }, data: { activa: body.activa } });
  }
  if (body?.revisar === true) {
    await prisma.recorridoClase.updateMany({ where: { asignacionId: a.id, terminadoEn: { not: null }, revisado: false }, data: { revisado: true } });
  }
  return NextResponse.json({ ok: true });
}
