import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { alcanceAgenda, cambiarEstadoCita, guardarCita } from "@/lib/modulos/odontologia/agendaServidor";
import { aDatos, esquemaCita } from "../esquema";

const esquemaEstado = z.object({
  jornada: z.string().min(1).nullable().default(null),
  estado: z.enum(["PROGRAMADA", "CONFIRMADA", "ATENDIDA", "NO_ASISTIO", "CANCELADA"]),
});

/** Reprograma una cita (todos sus datos) o solo le cambia el estado. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  try {
    const soloEstado = esquemaEstado.safeParse(body);
    if (soloEstado.success && body && Object.keys(body).every((k) => k === "jornada" || k === "estado")) {
      const alcance = await alcanceAgenda(soloEstado.data.jornada);
      if (!alcance) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
      return NextResponse.json({ cita: await cambiarEstadoCita(alcance, id, soloEstado.data.estado) });
    }
    const parsed = esquemaCita.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
    const alcance = await alcanceAgenda(parsed.data.jornada);
    if (!alcance) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    return NextResponse.json({ cita: await guardarCita(alcance, aDatos(parsed.data), id) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
