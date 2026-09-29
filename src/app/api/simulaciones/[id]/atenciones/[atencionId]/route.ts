import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireGestorDeJornada } from "@/lib/simulacion/permisos";
import { confirmarParticipante } from "@/lib/simulacion/jornada";

/** Vista de confirmación: corregir quién atendió a este paciente. */
const schema = z.object({ participanteId: z.string().min(1).nullable() });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; atencionId: string }> }) {
  const { id, atencionId } = await params;
  if (!(await requireGestorDeJornada(id))) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  try {
    await confirmarParticipante(id, atencionId, parsed.data.participanteId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
