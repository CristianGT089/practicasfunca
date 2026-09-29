import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/nucleo/auth";
import { buscarPaciente, jornadaActiva } from "@/lib/modulos/odontologia/jornada";

const schema = z.object({ documento: z.string().trim().min(3).max(30) });

export async function POST(req: NextRequest) {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const jornada = await jornadaActiva(usuario);
  if (!jornada) return NextResponse.json({ error: "No hay una jornada de odontología abierta" }, { status: 404 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Escribe el número de documento" }, { status: 400 });
  const r = await buscarPaciente(jornada.id, parsed.data.documento);
  if (!r) return NextResponse.json({ error: "No hay ningún paciente con ese documento en el sistema" }, { status: 404 });
  return NextResponse.json(r);
}
