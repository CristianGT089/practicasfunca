import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/nucleo/prisma";
import { requireGestor } from "@/lib/nucleo/permisos";
import { leccionPorSlug } from "@/lib/clase/lecciones";
import { sesionDelGestor } from "@/lib/clase/servidor";

/**
 * Compilado de una pregunta rápida para la pantalla del docente: cuántos eligieron cada opción,
 * contando solo a quienes entraron a esta clase en vivo. Anónimo: no dice quién respondió qué.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gestor = await requireGestor();
  if (!gestor) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const s = await sesionDelGestor(gestor, id);
  if (!s) return NextResponse.json({ error: "Clase no encontrada" }, { status: 404 });

  const preguntaId = req.nextUrl.searchParams.get("pregunta");
  const pregunta = leccionPorSlug(s.leccion)?.diapositivas.find((d) => d.tipo === "pregunta" && d.id === preguntaId);
  if (!pregunta || pregunta.tipo !== "pregunta") return NextResponse.json({ error: "Pregunta no encontrada" }, { status: 404 });

  const asistentes = await prisma.asistenciaClase.findMany({ where: { sesionId: s.id }, select: { usuarioId: true } });
  const respuestas = await prisma.progresoClase.findMany({
    where: { leccion: s.leccion, actividad: pregunta.id, usuarioId: { in: asistentes.map((a) => a.usuarioId) } },
    select: { datos: true },
  });
  const conteo = pregunta.opciones.map(() => 0);
  for (const r of respuestas) {
    const opcion = (r.datos as { opcion?: unknown } | null)?.opcion;
    if (typeof opcion === "number" && opcion >= 0 && opcion < conteo.length) conteo[opcion]++;
  }
  return NextResponse.json({ conteo, total: conteo.reduce((a, b) => a + b, 0), asistentes: asistentes.length });
}
