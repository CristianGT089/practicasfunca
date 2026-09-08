import { NextResponse } from "next/server";
import { prisma } from "@/lib/nucleo/prisma";
import { requireAdmin } from "@/lib/nucleo/auth";

/**
 * La sesión de turnero abierta más reciente. En la sala se trabaja una a la vez, así que
 * cada pantalla (registro / tablero) solo pregunta "¿cuál está activa?" sin más contexto.
 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

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
