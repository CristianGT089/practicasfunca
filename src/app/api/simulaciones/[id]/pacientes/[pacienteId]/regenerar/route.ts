import { NextResponse } from "next/server";
import { requireGestorDeJornada } from "@/lib/simulacion/permisos";
import { regenerarPaciente } from "@/lib/simulacion/operaciones";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string; pacienteId: string }> }) {
  const { id, pacienteId } = await params;
  if (!(await requireGestorDeJornada(id))) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  try {
    const paciente = await regenerarPaciente(id, pacienteId);
    return NextResponse.json({ paciente });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
