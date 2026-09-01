import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => null);

  const data: Record<string, unknown> = {};
  if (body?.nombre !== undefined) data.nombre = String(body.nombre).trim();
  if (body?.principioActivo !== undefined) data.principioActivo = String(body.principioActivo).trim();
  if (body?.presentacion !== undefined) data.presentacion = String(body.presentacion).trim();
  if (body?.requiereReceta !== undefined) data.requiereReceta = !!body.requiereReceta;
  if (body?.esControlado !== undefined) data.esControlado = !!body.esControlado;
  if (body?.stock !== undefined) data.stock = Number(body.stock);
  if (body?.precio !== undefined) data.precio = Number(body.precio);
  if (body?.tags !== undefined) {
    data.tags = String(body.tags)
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
  }

  const medicamento = await prisma.medicamento.update({ where: { id }, data });
  return NextResponse.json({ medicamento });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  const usado = await prisma.farmaciaItemEscenario.findFirst({ where: { medicamentoId: id } });
  if (usado) {
    return NextResponse.json(
      { error: "No se puede eliminar: está usado en al menos un escenario" },
      { status: 409 }
    );
  }

  await prisma.medicamento.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
