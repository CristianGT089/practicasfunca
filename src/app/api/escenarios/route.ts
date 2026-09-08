import { NextResponse } from "next/server";
import { prisma } from "@/lib/nucleo/prisma";
import { requireUser } from "@/lib/nucleo/auth";

export async function GET(req: Request) {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const moduloId = searchParams.get("moduloId");
  if (!moduloId) return NextResponse.json({ error: "Falta moduloId" }, { status: 400 });

  const matricula = await prisma.matricula.findUnique({
    where: { usuarioId_moduloId: { usuarioId: usuario.id, moduloId } },
  });
  if (!matricula && usuario.rol !== "ADMIN") {
    return NextResponse.json({ error: "No estás matriculado en este módulo" }, { status: 403 });
  }

  const escenarios = await prisma.escenario.findMany({
    where: { activo: true, soloTurno: false, moduloId },
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
