import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireGestorDeJornada } from "@/lib/simulacion/permisos";
import { asignarVentanilla, ventanillasActuales } from "@/lib/simulacion/jornada";

/** "Desde ahora, en la ventanilla N está X" (participanteId null = nadie). */
const schema = z.object({ espacioNumero: z.number().int().min(1).max(40), participanteId: z.string().min(1).nullable() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await requireGestorDeJornada(id))) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  try {
    await asignarVentanilla(id, parsed.data.espacioNumero, parsed.data.participanteId);
    return NextResponse.json({ ventanillas: await ventanillasActuales(id) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
