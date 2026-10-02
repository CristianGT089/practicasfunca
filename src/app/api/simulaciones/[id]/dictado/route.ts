import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/nucleo/prisma";
import { requireGestorDeJornada } from "@/lib/simulacion/permisos";
import { estadoDictado } from "@/lib/modulos/odontologia/dictadoJornada";

/** Lo que ve el docente mientras dicta: guion y avance de cada estudiante. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await requireGestorDeJornada(id))) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const estado = await estadoDictado(id);
  if (!estado) return NextResponse.json({ error: "Esta jornada no es un dictado" }, { status: 404 });
  return NextResponse.json(estado);
}

/** Pausar / reanudar: en pausa nadie puede escribir. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await requireGestorDeJornada(id))) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const parsed = z.object({ pausado: z.boolean() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const s = await prisma.simulacion.findUnique({ where: { id } });
  if (!s?.dictado || s.estado !== "ABIERTA") return NextResponse.json({ error: "El dictado no está en curso" }, { status: 400 });
  await prisma.simulacion.update({ where: { id }, data: { dictadoPausado: parsed.data.pausado } });
  return NextResponse.json({ ok: true });
}
