import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { abrirFactura } from "@/lib/simulacion/recepcionJornada";
import { usuarioYJornada } from "../comun";

const schema = z.object({ factura: z.string().trim().min(1).max(30) });

/** El receptor abre un pedido con el número de la factura que le entrega el transportador. */
export async function POST(req: NextRequest) {
  const ctx = await usuarioYJornada();
  if (!ctx) return NextResponse.json({ error: "No hay una jornada de recepción abierta" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const factura = await abrirFactura(ctx.jornada.id, parsed.data.factura, ctx.usuario);
  if (!factura) return NextResponse.json({ error: "No hay ningún pedido con esa factura en esta jornada" }, { status: 404 });
  return NextResponse.json({ factura });
}
