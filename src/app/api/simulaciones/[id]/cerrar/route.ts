import { NextResponse } from "next/server";
import { requireGestorDeJornada } from "@/lib/simulacion/permisos";
import { cerrarSimulacion } from "@/lib/simulacion/operaciones";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await requireGestorDeJornada(id))) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  try {
    await cerrarSimulacion(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
