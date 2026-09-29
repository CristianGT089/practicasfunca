import { NextResponse } from "next/server";
import { requireGestorDeJornada } from "@/lib/simulacion/permisos";
import { obtenerSimulacion } from "@/lib/simulacion/operaciones";
import { ventanillasActuales } from "@/lib/simulacion/jornada";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await requireGestorDeJornada(id))) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const simulacion = await obtenerSimulacion(id);
  if (!simulacion) return NextResponse.json({ error: "Simulación no encontrada" }, { status: 404 });

  return NextResponse.json({ simulacion, ventanillas: await ventanillasActuales(id) });
}
