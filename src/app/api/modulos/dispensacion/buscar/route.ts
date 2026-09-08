import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/nucleo/auth";
import { buscarPaciente } from "@/lib/modulos/dispensacion/practica";

export async function POST(req: NextRequest) {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const parsed = z
    .object({ documento: z.string().trim().min(1).max(30) })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Documento inválido" }, { status: 400 });

  return NextResponse.json(await buscarPaciente(usuario.id, parsed.data.documento));
}
