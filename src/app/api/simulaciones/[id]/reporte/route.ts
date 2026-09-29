import { NextResponse } from "next/server";
import { requireGestorDeJornada } from "@/lib/simulacion/permisos";
import { reporteJornada } from "@/lib/simulacion/jornada";

/** Atenciones (con sus criterios), resumen por estudiante y errores comunes. Sirve en revisión y cerrada. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await requireGestorDeJornada(id))) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const reporte = await reporteJornada(id);
  if (!reporte) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  return NextResponse.json(reporte);
}
