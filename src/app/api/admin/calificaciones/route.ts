import { NextResponse } from "next/server";
import { prisma } from "@/lib/nucleo/prisma";
import { filtroEstudiantes, filtroModulos, requireGestor } from "@/lib/nucleo/permisos";

export async function GET() {
  const gestor = await requireGestor();
  if (!gestor) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  // Un docente ve solo a sus estudiantes y solo los casos de sus módulos.
  const modulo = await filtroModulos(gestor);
  const totalEscenarios = await prisma.escenario.count({
    where: { activo: true, titulo: { not: { startsWith: "Tutorial" } }, modulo },
  });

  const usuarios = await prisma.usuario.findMany({
    where: filtroEstudiantes(gestor),
    orderBy: { nombre: "asc" },
    select: {
      id: true,
      nombre: true,
      usuario: true,
      intentos: {
        where: {
          estado: "COMPLETADO",
          escenario: { titulo: { not: { startsWith: "Tutorial" } }, modulo },
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
