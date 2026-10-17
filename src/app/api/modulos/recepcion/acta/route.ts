import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { firmarActa } from "@/lib/simulacion/recepcionJornada";
import { usuarioYJornada } from "../comun";

const schema = z.object({ entregaId: z.string().min(1), observaciones: z.string().trim().max(1000).nullable().default(null) });

/** Cierra la recepción de un pedido: el acta firmada por quien recibe. */
export async function POST(req: NextRequest) {
  const ctx = await usuarioYJornada();
  if (!ctx) return NextResponse.json({ error: "No hay una jornada de recepción abierta" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  try {
    await firmarActa(ctx.jornada.id, parsed.data.entregaId, parsed.data.observaciones);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
