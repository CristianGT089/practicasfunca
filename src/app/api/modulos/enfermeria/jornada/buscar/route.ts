import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/nucleo/auth";
import { buscarPaciente, fichaDePaciente, jornadaActiva } from "@/lib/modulos/enfermeria/jornada";

const schema = z.object({ documento: z.string().trim().min(3).max(30) });

/** Busca al paciente por el documento de su manilla. */
export async function POST(req: NextRequest) {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const jornada = await jornadaActiva(usuario);
  if (!jornada) return NextResponse.json({ error: "No hay una ronda de enfermería abierta" }, { status: 404 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Escribe el número de documento de la manilla" }, { status: 400 });
  const caso = buscarPaciente(jornada.situaciones, parsed.data.documento);
  if (!caso) return NextResponse.json({ error: "No hay ningún paciente hospitalizado con ese documento" }, { status: 404 });
  return NextResponse.json(fichaDePaciente(caso, jornada.abiertaEn ?? new Date()));
}
