import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/nucleo/prisma";
import { requireGestor } from "@/lib/nucleo/permisos";
import { leccionPorSlug } from "@/lib/clase/lecciones";
import { participantesDeSesion, sesionDelGestor } from "@/lib/clase/servidor";

type Ctx = { params: Promise<{ id: string }> };

/** Estado de la clase para el presentador: diapositiva actual y participantes (si se piden). */
export async function GET(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const gestor = await requireGestor();
  if (!gestor) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const s = await sesionDelGestor(gestor, id);
  if (!s) return NextResponse.json({ error: "Clase no encontrada" }, { status: 404 });
  const conParticipantes = req.nextUrl.searchParams.get("participantes") === "1";
  return NextResponse.json({
    sesion: {
      id: s.id,
      leccion: s.leccion,
      diapositiva: s.diapositiva,
      llamado: s.llamado,
      reveladas: s.reveladas,
      activa: s.activa,
      grupo: s.grupo?.nombre ?? null,
      total: leccionPorSlug(s.leccion)?.diapositivas.length ?? 0,
    },
    participantes: conParticipantes ? await participantesDeSesion(s.id, s.grupoId, s.leccion) : undefined,
  });
}

/**
 * { diapositiva } mueve a todos · { llamar: true } trae a todos · { cerrar: true } termina la clase ·
 * { revelar: "<id pregunta>", mostrar: boolean } revela u oculta la respuesta de una pregunta rápida.
 */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const gestor = await requireGestor();
  if (!gestor) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const s = await sesionDelGestor(gestor, id);
  if (!s) return NextResponse.json({ error: "Clase no encontrada" }, { status: 404 });
  const body = await req.json().catch(() => null);
  const total = leccionPorSlug(s.leccion)?.diapositivas.length ?? 1;

  if (body?.cerrar === true) {
    await prisma.sesionClase.update({ where: { id }, data: { activa: false, cerradaEn: new Date() } });
    return NextResponse.json({ ok: true });
  }
  const data: { diapositiva?: number; maxima?: number; llamado?: { increment: number }; reveladas?: string[] } = {};
  if (typeof body?.revelar === "string") {
    const existe = leccionPorSlug(s.leccion)?.diapositivas.some((d) => d.tipo === "pregunta" && d.id === body.revelar);
    if (!existe) return NextResponse.json({ error: "Pregunta no encontrada" }, { status: 400 });
    const sin = s.reveladas.filter((r) => r !== body.revelar);
    data.reveladas = body.mostrar === false ? sin : [...sin, body.revelar];
  }
  if (Number.isInteger(body?.diapositiva)) {
    data.diapositiva = Math.max(0, Math.min(body.diapositiva, total - 1));
    if (data.diapositiva > s.maxima) data.maxima = data.diapositiva;
  }
  if (body?.llamar === true) data.llamado = { increment: 1 };
  const nueva = await prisma.sesionClase.update({ where: { id }, data });
  return NextResponse.json({ sesion: { diapositiva: nueva.diapositiva, llamado: nueva.llamado, reveladas: nueva.reveladas } });
}
