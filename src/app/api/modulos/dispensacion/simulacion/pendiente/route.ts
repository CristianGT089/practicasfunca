import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/nucleo/auth";
import { registrarPendienteSimulacion } from "@/lib/simulacion/dispensario";
import { numeroConstancia } from "@/lib/simulacion/pendientes";

// Lo que se le queda debiendo al paciente (Res. 1604 de 2013): cantidad y cómo lo recibe.
const schema = z.object({
  simulacionId: z.string().min(1),
  cedula: z.string().trim().min(1).max(30),
  recetaId: z.string().min(1),
  cantidad: z.number().int().min(1),
  modalidad: z.enum(["ESTABLECIMIENTO", "DOMICILIO"]),
  direccion: z.string().trim().max(200).nullable().default(null),
  telefono: z.string().trim().max(30).nullable().default(null),
});

export async function POST(req: NextRequest) {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  try {
    const p = await registrarPendienteSimulacion({ ...parsed.data, usuarioId: usuario.id });
    return NextResponse.json({ numero: numeroConstancia(p.numero), creadoEn: p.creadoEn.toISOString() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
