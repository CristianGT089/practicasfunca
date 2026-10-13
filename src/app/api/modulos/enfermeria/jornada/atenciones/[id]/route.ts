import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/nucleo/auth";
import { guardarHoja } from "@/lib/modulos/enfermeria/jornada";

/** Guardado automático de la hoja mientras el estudiante escribe. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  try {
    await guardarHoja(usuario, id, body?.hoja);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
