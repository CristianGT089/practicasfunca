import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/nucleo/auth";
import { obtenerSimulacion } from "@/lib/simulacion/operaciones";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  const simulacion = await obtenerSimulacion(id);
  if (!simulacion) return NextResponse.json({ error: "Simulación no encontrada" }, { status: 404 });

  return NextResponse.json({ simulacion });
}
