import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/nucleo/auth";
import { buscarMedicamentoSimulacion } from "@/lib/simulacion/dispensario";

const schema = z.object({
  simulacionId: z.string().min(1),
  cedula: z.string().trim().min(1).max(30),
  texto: z.string().trim().min(1).max(80),
});

export async function POST(req: NextRequest) {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const resultado = await buscarMedicamentoSimulacion(parsed.data.simulacionId, parsed.data.cedula, parsed.data.texto);
  return NextResponse.json(resultado);
}
