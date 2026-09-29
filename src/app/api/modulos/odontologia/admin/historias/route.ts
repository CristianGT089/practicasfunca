import { NextResponse } from "next/server";
import { prisma } from "@/lib/nucleo/prisma";
import { filtroEstudiantes, requireGestorDeModulo } from "@/lib/nucleo/permisos";

export async function GET() {
  const admin = await requireGestorDeModulo("odontologia");
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const intentos = await prisma.intento.findMany({
    where: { escenario: { modulo: { slug: "odontologia" } }, usuario: filtroEstudiantes(admin) },
    orderBy: { iniciadoEn: "desc" },
    take: 300,
    select: {
      id: true,
      estado: true,
      modo: true,
      iniciadoEn: true,
      finalizadoEn: true,
      puntajeFinal: true,
      usuario: { select: { nombre: true, usuario: true } },
      escenario: { select: { titulo: true } },
    },
  });
  return NextResponse.json({ intentos });
}
