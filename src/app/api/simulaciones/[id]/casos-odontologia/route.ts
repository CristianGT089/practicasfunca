import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireGestorDeJornada } from "@/lib/simulacion/permisos";
import { asignarCasosOdontologia } from "@/lib/simulacion/operaciones";

const schema = z.object({ casosIds: z.array(z.string().min(1)).min(1, "Elige al menos un caso").max(40) });

/** En el borrador: los casos de la jornada (quitar o agregar), con sus intérpretes repartidos de nuevo. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await requireGestorDeJornada(id))) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  try {
    await asignarCasosOdontologia(id, parsed.data.casosIds);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
