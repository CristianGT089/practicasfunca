import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/nucleo/auth";
import { registrarRecogida } from "@/lib/simulacion/dispensario";

// Quién reclama: lo decide el estudiante comparando los documentos con la fórmula (ver
// registrarRecogida en dispensario.ts).
const schema = z.object({
  simulacionId: z.string().min(1),
  cedula: z.string().trim().min(1).max(30),
  decision: z.enum(["PACIENTE", "TERCERO", "NO_ENTREGA"]),
  documentoQuienReclama: z.string().trim().max(30).nullable().default(null),
});

export async function POST(req: NextRequest) {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  try {
    await registrarRecogida({ ...parsed.data, usuarioId: usuario.id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
