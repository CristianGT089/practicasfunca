import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/nucleo/auth";
import { cerrarHoja } from "@/lib/modulos/enfermeria/jornada";

/** Cierra y firma la hoja. No devuelve nota: la ronda se califica al final. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  try {
    await cerrarHoja(usuario, id, body?.hoja);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
