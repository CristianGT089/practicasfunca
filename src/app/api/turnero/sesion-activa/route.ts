import { NextResponse } from "next/server";
import { prisma } from "@/lib/nucleo/prisma";
import { requireUser } from "@/lib/nucleo/auth";
import { marcarPuestoListo } from "@/lib/turnero/operaciones";

/**
 * La sesión de turnero abierta más reciente (o, si no hay, la preparada más reciente). Las
 * pantallas que abre el docente desde su jornada llevan `?sesion=` y no dependen de esto;
 * las cuentas de los computadores reciben siempre su propia sesión. Lectura: cualquier
 * usuario logueado (lo necesita también el panel de dispensación del estudiante).
 */
export async function GET() {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  await marcarPuestoListo(usuario);

  // La cuenta de un computador de jornada pertenece a una sesión: es la suya aunque haya
  // otras abiertas, y aunque todavía esté PREPARADA (el computador espera a que empiece).
  const sesion = usuario.sesionTurneroId
    ? await prisma.sesionTurnero.findFirst({
        where: { id: usuario.sesionTurneroId, estado: { in: ["PREPARADA", "ABIERTA"] } },
        select: { id: true, turnero: { select: { nombre: true } } },
      })
    : ((await prisma.sesionTurnero.findFirst({
        where: { estado: "ABIERTA" },
        orderBy: { iniciadaEn: "desc" },
        select: { id: true, turnero: { select: { nombre: true } } },
      })) ??
      // Ninguna en curso: la jornada preparada más reciente (el tablero muestra la espera).
      (await prisma.sesionTurnero.findFirst({
        where: { estado: "PREPARADA" },
        orderBy: { iniciadaEn: "desc" },
        select: { id: true, turnero: { select: { nombre: true } } },
      })));

  return NextResponse.json({
    sesionId: sesion?.id ?? null,
    turneroNombre: sesion?.turnero.nombre ?? null,
  });
}
