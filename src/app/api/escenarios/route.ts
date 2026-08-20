import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const escenarios = await prisma.escenario.findMany({
    where: { activo: true, soloTurno: false },
    orderBy: { creadoEn: "asc" },
    select: {
      id: true,
      titulo: true,
      intentos: {
        where: { usuarioId: usuario.id },
        orderBy: { iniciadoEn: "desc" },
        take: 1,
        select: {
          id: true,
          estado: true,
          puntajeFinal: true,
          puntajeProceso: true,
          puntajeResultado: true,
          finalizadoEn: true,
        },
      },
    },
  });

  return NextResponse.json({ escenarios });
}
