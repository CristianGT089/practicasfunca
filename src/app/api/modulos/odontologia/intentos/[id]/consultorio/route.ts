import { NextResponse } from "next/server";
import { prisma } from "@/lib/nucleo/prisma";
import { requireUser } from "@/lib/nucleo/auth";
import { intentoConEscenarioInclude } from "@/lib/modulos/contrato";
import { informacionRevelada } from "@/lib/modulos/odontologia/consultorio";
import { ultimaHistoria } from "@/lib/modulos/odontologia/reglas";

/**
 * Lo que el estudiante ya descubrió en el consultorio (según las acciones que registró) y
 * la última historia que guardó, para retomar el caso donde lo dejó.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const intento = await prisma.intento.findUnique({ where: { id }, include: intentoConEscenarioInclude });
  if (!intento || intento.usuarioId !== usuario.id || !intento.escenario.odontologia) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    informacion: informacionRevelada(intento.escenario, intento.acciones, intento.modo),
    historia: ultimaHistoria(intento.acciones),
  });
}
