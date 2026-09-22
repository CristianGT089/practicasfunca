import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/nucleo/auth";
import { regenerarPaciente } from "@/lib/simulacion/operaciones";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string; pacienteId: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id, pacienteId } = await params;
  try {
    const paciente = await regenerarPaciente(id, pacienteId);
    return NextResponse.json({ paciente });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
