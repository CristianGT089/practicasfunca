import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/nucleo/prisma";
import { esAdmin, requireGestor } from "@/lib/nucleo/permisos";
import { leccionPorSlug } from "@/lib/clase/lecciones";
import { candidatos, estudiantesValidos } from "@/lib/clase/ritmo";

/**
 * Clases a tu ritmo del docente, con cuántos terminaron y cuántos reportes nuevos hay.
 * Con `?grupoId=…&leccion=…` devuelve además los estudiantes del grupo para elegir.
 */
export async function GET(req: NextRequest) {
  const gestor = await requireGestor();
  if (!gestor) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const grupoId = req.nextUrl.searchParams.get("grupoId");
  const slug = req.nextUrl.searchParams.get("leccion");

  const asignaciones = await prisma.asignacionClase.findMany({
    where: esAdmin(gestor) ? {} : { docenteId: gestor.id },
    include: {
      grupo: { select: { nombre: true } },
      docente: { select: { nombre: true } },
      recorridos: { select: { iniciadoEn: true, terminadoEn: true, revisado: true } },
    },
    orderBy: { creadoEn: "desc" },
  });
  const lista = asignaciones.map((a) => ({
    id: a.id,
    leccion: a.leccion,
    titulo: leccionPorSlug(a.leccion, "ritmo")?.titulo ?? a.leccion,
    grupo: a.grupo?.nombre ?? null,
    docente: a.docente.nombre,
    activa: a.activa,
    creadoEn: a.creadoEn,
    total: a.recorridos.length,
    empezados: a.recorridos.filter((r) => r.iniciadoEn).length,
    terminados: a.recorridos.filter((r) => r.terminadoEn).length,
    nuevos: a.recorridos.filter((r) => r.terminadoEn && !r.revisado).length,
  }));

  let elegibles = null;
  if (grupoId && slug) {
    const permitido = await estudiantesValidos(gestor, grupoId, []);
    if (permitido) elegibles = await candidatos(grupoId, slug);
  }
  return NextResponse.json({ asignaciones: lista, nuevos: lista.reduce((s, a) => s + a.nuevos, 0), candidatos: elegibles });
}

/** Habilita la clase a tu ritmo para los estudiantes elegidos de un grupo. */
export async function POST(req: NextRequest) {
  const gestor = await requireGestor();
  if (!gestor) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const leccion = leccionPorSlug(body?.leccion, "ritmo");
  if (!leccion) return NextResponse.json({ error: "Lección no encontrada" }, { status: 400 });
  const grupoId = typeof body?.grupoId === "string" ? body.grupoId : "";
  const pedidos: string[] = Array.isArray(body?.estudianteIds) ? body.estudianteIds.filter((x: unknown) => typeof x === "string") : [];
  if (!grupoId) return NextResponse.json({ error: "Elige un grupo" }, { status: 400 });
  if (pedidos.length === 0) return NextResponse.json({ error: "Elige al menos un estudiante" }, { status: 400 });
  const ids = await estudiantesValidos(gestor, grupoId, pedidos);
  if (!ids) return NextResponse.json({ error: "Ese grupo no es tuyo" }, { status: 403 });
  const mensaje = typeof body?.mensaje === "string" && body.mensaje.trim() ? body.mensaje.trim().slice(0, 2000) : null;
  const asignacion = await prisma.asignacionClase.create({
    data: {
      leccion: leccion.slug,
      docenteId: gestor.id,
      grupoId,
      mensaje,
      recorridos: { create: ids.map((usuarioId) => ({ usuarioId })) },
    },
  });
  return NextResponse.json({ asignacion: { id: asignacion.id } });
}
