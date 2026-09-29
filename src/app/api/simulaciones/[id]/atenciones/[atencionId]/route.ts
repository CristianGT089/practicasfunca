import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/nucleo/prisma";
import { requireGestorDeJornada } from "@/lib/simulacion/permisos";
import { calificarConRubrica, confirmarParticipante } from "@/lib/simulacion/jornada";

/** La historia de una atención, para que el docente la revise antes de cerrar la jornada. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; atencionId: string }> }) {
  const { id, atencionId } = await params;
  if (!(await requireGestorDeJornada(id))) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const a = await prisma.atencionJornada.findUnique({ where: { id: atencionId } });
  if (!a || a.simulacionId !== id) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  return NextResponse.json({
    atencion: {
      id: a.id,
      historia: a.historia,
      pacienteReal: a.pacienteReal,
      denticion: a.denticion,
      rubrica: a.rubrica,
      comentario: a.comentario,
      cerrada: a.cerradaEn !== null,
      remision: a.remision,
    },
  });
}

/** Confirmar quién atendió (participanteId) y, con pacientes reales, la rúbrica y el comentario. */
const schema = z.object({
  participanteId: z.string().min(1).nullable().optional(),
  rubrica: z.record(z.string(), z.number()).optional(),
  comentario: z.string().max(1000).nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; atencionId: string }> }) {
  const { id, atencionId } = await params;
  if (!(await requireGestorDeJornada(id))) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  try {
    if (parsed.data.participanteId !== undefined) await confirmarParticipante(id, atencionId, parsed.data.participanteId);
    if (parsed.data.rubrica !== undefined || parsed.data.comentario !== undefined) {
      const actual = await prisma.atencionJornada.findUnique({ where: { id: atencionId } });
      await calificarConRubrica(
        id,
        atencionId,
        parsed.data.rubrica ?? actual?.rubrica,
        parsed.data.comentario !== undefined ? parsed.data.comentario : (actual?.comentario ?? null)
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
