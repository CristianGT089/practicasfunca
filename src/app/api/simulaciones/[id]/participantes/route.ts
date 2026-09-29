import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireGestorDeJornada } from "@/lib/simulacion/permisos";
import { agregarParticipante } from "@/lib/simulacion/jornada";

/** Suma a la jornada un estudiante registrado (usuarioId) o un invitado (nombre). En cualquier momento. */
const schema = z.object({ nombre: z.string().trim().max(80).optional(), usuarioId: z.string().min(1).nullable().optional() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await requireGestorDeJornada(id))) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  try {
    const participante = await agregarParticipante(id, parsed.data);
    return NextResponse.json({ participante }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
