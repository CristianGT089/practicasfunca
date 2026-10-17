import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { guardarRegistroItem } from "@/lib/simulacion/recepcionJornada";
import { usuarioYJornada } from "../comun";

const schema = z.object({
  itemId: z.string().min(1),
  registro: z.object({
    cantidadContada: z.number().int().min(0).max(100000),
    lote: z.string().trim().max(40),
    vencimiento: z.string().regex(/^\d{4}-\d{2}$/, "Vencimiento: mes y año"),
    registroInvima: z.string().trim().max(60),
    temperatura: z.number().min(-30).max(60).nullable(),
    empaqueIntegro: z.boolean(),
    decision: z.enum(["ACEPTAR", "RECHAZAR"]),
    motivo: z.enum(["VENCIMIENTO", "LOTE", "REGISTRO_SANITARIO", "CADENA_FRIO", "EMPAQUE", "FALTANTE", "NO_SOLICITADO"]).nullable(),
  }),
});

/** Lo que el receptor anotó de un producto al inspeccionarlo, y su decisión. */
export async function POST(req: NextRequest) {
  const ctx = await usuarioYJornada();
  if (!ctx) return NextResponse.json({ error: "No hay una jornada de recepción abierta" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  try {
    await guardarRegistroItem(ctx.jornada.id, parsed.data.itemId, parsed.data.registro);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
