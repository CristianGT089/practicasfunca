import { NextResponse } from "next/server";
import { requireGestorDeJornada } from "@/lib/simulacion/permisos";
import { regenerarCredencialesPuestos } from "@/lib/simulacion/operaciones";

/** Genera contraseñas nuevas para las cuentas de los computadores (no saca a nadie que ya entró). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await requireGestorDeJornada(id))) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  try {
    return NextResponse.json({ cuentas: await regenerarCredencialesPuestos(id) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
