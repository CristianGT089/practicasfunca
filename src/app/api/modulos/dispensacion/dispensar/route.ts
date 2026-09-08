import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/nucleo/auth";
import { dispensarRenglon, rechazarRenglon } from "@/lib/modulos/dispensacion/practica";

const schema = z.union([
  z.object({ renglonId: z.string().min(1), cantidad: z.number().int().min(1) }),
  z.object({ renglonId: z.string().min(1), rechazar: z.literal(true), motivo: z.string().trim().max(200).default("") }),
]);

export async function POST(req: NextRequest) {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  try {
    if ("rechazar" in parsed.data) {
      await rechazarRenglon(usuario.id, parsed.data.renglonId, parsed.data.motivo);
    } else {
      await dispensarRenglon(usuario.id, parsed.data.renglonId, parsed.data.cantidad);
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
