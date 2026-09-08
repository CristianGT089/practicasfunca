import { NextResponse } from "next/server";
import { prisma } from "@/lib/nucleo/prisma";
import { requireAdmin } from "@/lib/nucleo/auth";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const totalEscenarios = await prisma.escenario.count({
    where: { activo: true, titulo: { not: { startsWith: "Tutorial" } } },
  });

  const usuarios = await prisma.usuario.findMany({
    where: { rol: "ESTUDIANTE" },
    orderBy: { nombre: "asc" },
    select: {
      id: true,
      nombre: true,
      usuario: true,
      intentos: {
        where: {
          estado: "COMPLETADO",
          escenario: { titulo: { not: { startsWith: "Tutorial" } } },
        },
        orderBy: { finalizadoEn: "desc" },
        select: {
          id: true,
          escenarioId: true,
          puntajeProceso: true,
          puntajeResultado: true,
          puntajeFinal: true,
          finalizadoEn: true,
          escenario: { select: { titulo: true } },
        },
      },
    },
  });

  return NextResponse.json({ usuarios, totalEscenarios });
}
