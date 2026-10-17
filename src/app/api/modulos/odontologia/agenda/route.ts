import { NextRequest, NextResponse } from "next/server";
import { alcanceAgenda, guardarCita, listarCitas } from "@/lib/modulos/odontologia/agendaServidor";
import { diaColombia, diasHabilesDesde, instanteColombia } from "@/lib/modulos/odontologia/agenda";
import { aDatos, esquemaCita } from "./esquema";

/**
 * Citas de una agenda: la real del consultorio (sin `jornada`) o la de práctica de una
 * jornada. `desde` (AAAA-MM-DD) y `dias` hábiles a mostrar.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const alcance = await alcanceAgenda(q.get("jornada"));
  if (!alcance) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const desde = /^\d{4}-\d{2}-\d{2}$/.test(q.get("desde") ?? "") ? q.get("desde")! : diaColombia(new Date());
  const n = Math.min(10, Math.max(1, Number(q.get("dias")) || 5));
  const dias = diasHabilesDesde(desde, n);
  const citas = await listarCitas(alcance.simulacionId, instanteColombia(dias[0], 0), instanteColombia(dias[dias.length - 1], 23, 59));
  return NextResponse.json({ dias, unidades: alcance.unidades, citas });
}

export async function POST(req: NextRequest) {
  const parsed = esquemaCita.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  const alcance = await alcanceAgenda(parsed.data.jornada);
  if (!alcance) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  try {
    const cita = await guardarCita(alcance, aDatos(parsed.data));
    return NextResponse.json({ cita }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
