import { NextResponse } from "next/server";
import { prisma } from "@/lib/nucleo/prisma";
import { requireUser } from "@/lib/nucleo/auth";

/**
 * La sesión de turnero abierta más reciente. En la sala se trabaja una a la vez, así que
 * cada pantalla (registro / tablero / dispensación) solo pregunta "¿cuál está activa?" sin
 * más contexto. Lectura: cualquier usuario logueado (lo necesita también el panel de
 * dispensación del estudiante, no solo las pantallas de admin).
 */
export async function GET() {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const sesion = await prisma.sesionTurnero.findFirst({
    where: { estado: "ABIERTA" },
    orderBy: { iniciadaEn: "desc" },
    select: { id: true, turnero: { select: { nombre: true } } },
  });

  return NextResponse.json({
    sesionId: sesion?.id ?? null,
    turneroNombre: sesion?.turnero.nombre ?? null,
  });
}
