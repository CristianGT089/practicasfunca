import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/nucleo/prisma";
import { requireGestorDeModulo } from "@/lib/nucleo/permisos";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireGestorDeModulo("farmacia");
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  await prisma.medicamento.delete({ where: { id, origen: "CATALOGO_REAL" } });
  return NextResponse.json({ ok: true });
}
