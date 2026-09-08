import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/nucleo/prisma";
import { requireAdmin } from "@/lib/nucleo/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const activo = body?.activo as boolean | undefined;

  if (typeof activo !== "boolean") {
    return NextResponse.json({ error: "Campo 'activo' requerido" }, { status: 400 });
  }

  const escenario = await prisma.escenario.update({ where: { id }, data: { activo } });
  return NextResponse.json({ escenario });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  const tieneIntentos = await prisma.intento.findFirst({ where: { escenarioId: id } });
  if (tieneIntentos) {
    return NextResponse.json(
      { error: "No se puede eliminar: ya tiene intentos de estudiantes. Desactívalo en su lugar." },
      { status: 409 }
    );
  }

  await prisma.escenario.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
