import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/nucleo/auth";
import { cerrarHistoria } from "@/lib/modulos/odontologia/jornada";

const schema = z.object({
  historia: z.unknown(),
  remision: z.enum(["ATENCION_EN_CONSULTA", "REMISION_ESPECIALISTA", "INTERCONSULTA_MEDICA"]),
});

/** Cierra y firma la historia. No devuelve nota: la jornada la califica el docente al final. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Elige la conducta antes de cerrar" }, { status: 400 });
  try {
    await cerrarHistoria(usuario, id, parsed.data.historia, parsed.data.remision);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
