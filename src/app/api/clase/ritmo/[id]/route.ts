import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/nucleo/auth";
import { prisma } from "@/lib/nucleo/prisma";
import { leccionPorSlug } from "@/lib/clase/lecciones";
import { requisitoPendiente } from "@/lib/clase/requisitos";
import { contextoRitmo } from "@/lib/clase/servidor";

type Ctx = { params: Promise<{ id: string }> };

async function recorridoPropio(id: string) {
  const usuario = await requireUser();
  if (!usuario) return { error: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };
  const r = await prisma.recorridoClase.findUnique({
    where: { id },
    include: { asignacion: { select: { leccion: true, mensaje: true, activa: true, docente: { select: { nombre: true } } } } },
  });
  if (!r || r.usuarioId !== usuario.id || !r.asignacion.activa) {
    return { error: NextResponse.json({ error: "Esta clase no está habilitada para ti" }, { status: 404 }) };
  }
  const leccion = leccionPorSlug(r.asignacion.leccion, "ritmo");
  if (!leccion) return { error: NextResponse.json({ error: "Lección no encontrada" }, { status: 404 }) };
  return { r, leccion, usuario };
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const x = await recorridoPropio(id);
  if ("error" in x) return x.error;
  const { r, usuario } = x;
  return NextResponse.json({
    nombre: usuario.nombre,
    recorrido: {
      id: r.id,
      leccion: r.asignacion.leccion,
      diapositiva: r.diapositiva,
      maxima: r.maxima,
      terminadoEn: r.terminadoEn,
      mensaje: r.asignacion.mensaje,
      docente: r.asignacion.docente.nombre,
    },
  });
}

/** `{ diapositiva }` al moverse (solo hasta una más que la más lejana) o `{ terminar: true }` en la última. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const x = await recorridoPropio(id);
  if ("error" in x) return x.error;
  const { r, leccion } = x;
  const body = await req.json().catch(() => null);
  const ultima = leccion.diapositivas.length - 1;

  if (body?.terminar === true) {
    if (r.maxima < ultima) return NextResponse.json({ error: "Aún no llegas al final" }, { status: 400 });
    const hecho = await prisma.recorridoClase.update({
      where: { id: r.id },
      // Si vuelve a terminar (después de completar algo pendiente), el reporte se actualiza y vuelve a ser nuevo.
      data: { terminadoEn: new Date(), revisado: false },
    });
    return NextResponse.json({ terminadoEn: hecho.terminadoEn });
  }
  if (!Number.isInteger(body?.diapositiva)) return NextResponse.json({ error: "Diapositiva no válida" }, { status: 400 });
  let diapositiva = Math.max(0, Math.min(body.diapositiva, r.maxima + 1, ultima));
  // Para pasar de la más lejana tiene que haber cumplido lo obligatorio de esa diapositiva.
  if (diapositiva > r.maxima) {
    const actual = leccion.diapositivas[r.maxima];
    if (actual.tipo === "pregunta" || actual.tipo === "actividad") {
      const progreso = await prisma.progresoClase.findUnique({
        where: { usuarioId_leccion_contexto_actividad: { usuarioId: r.usuarioId, leccion: leccion.slug, contexto: contextoRitmo(r.id), actividad: actual.id } },
      });
      if (requisitoPendiente(actual, progreso ?? undefined)) diapositiva = r.maxima;
    }
  }
  const hecho = await prisma.recorridoClase.update({
    where: { id: r.id },
    data: { diapositiva, maxima: Math.max(r.maxima, diapositiva), iniciadoEn: r.iniciadoEn ?? new Date() },
  });
  return NextResponse.json({ diapositiva: hecho.diapositiva, maxima: hecho.maxima });
}
