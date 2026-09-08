import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/nucleo/prisma";
import { requireAdmin } from "@/lib/nucleo/auth";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  const usado = await prisma.escenarioFarmacia.findFirst({ where: { pacienteId: id } });
  if (usado) {
    return NextResponse.json(
      { error: "No se puede eliminar: está usado en al menos un escenario" },
      { status: 409 }
    );
  }

  await prisma.paciente.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
