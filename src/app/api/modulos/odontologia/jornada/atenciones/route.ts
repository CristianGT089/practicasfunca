import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/nucleo/auth";
import { abrirAtencion, jornadaActiva } from "@/lib/modulos/odontologia/jornada";

const schema = z.object({ casoId: z.string().min(1), unidad: z.number().int().min(1).max(40) });

/** Abre (o retoma) la historia de un paciente en esta unidad. */
export async function POST(req: NextRequest) {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const jornada = await jornadaActiva(usuario);
  if (!jornada) return NextResponse.json({ error: "No hay una jornada de odontología abierta" }, { status: 404 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  try {
    const a = await abrirAtencion(usuario, jornada.id, parsed.data.casoId, parsed.data.unidad);
    return NextResponse.json({ atencion: { id: a.id, historia: a.historia } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
