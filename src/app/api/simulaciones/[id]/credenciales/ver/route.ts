import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireGestorDeJornada } from "@/lib/simulacion/permisos";
import { verCredencialesPuestos } from "@/lib/simulacion/operaciones";

const schema = z.object({ password: z.string().min(1).max(200) });

/**
 * Vuelve a mostrar las contraseñas de las cuentas de los computadores. Pide la contraseña del
 * docente (o de coordinación) para que no las vea cualquiera que encuentre la sesión abierta.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gestor = await requireGestorDeJornada(id);
  if (!gestor) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Escribe tu contraseña" }, { status: 400 });
  if (!(await bcrypt.compare(parsed.data.password, gestor.passwordHash))) {
    return NextResponse.json({ error: "Tu contraseña no es correcta" }, { status: 401 });
  }
  try {
    return NextResponse.json({ cuentas: await verCredencialesPuestos(id) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
