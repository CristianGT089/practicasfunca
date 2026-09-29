import { NextResponse } from "next/server";
import { requireGestorDeJornada } from "@/lib/simulacion/permisos";
import { abrirSimulacion } from "@/lib/simulacion/operaciones";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gestor = await requireGestorDeJornada(id);
  if (!gestor) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  try {
    const resultado = await abrirSimulacion(id, gestor.id);
    return NextResponse.json(resultado);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
