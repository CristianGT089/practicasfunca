import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/nucleo/prisma";
import { requireAdmin } from "@/lib/nucleo/auth";

const schema = z.object({
  medico: z.string().trim().min(1).max(80).optional(),
  cantidadAutorizada: z.number().int().min(1).optional(),
  cantidadRedimida: z.number().int().min(0).optional(),
  fechaEmision: z.string().optional(),
  fechaVigencia: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const { fechaEmision, fechaVigencia, ...resto } = parsed.data;
  const autorizacion = await prisma.recetaElectronica.update({
    where: { id },
    data: {
      ...resto,
      ...(fechaEmision ? { fechaEmision: new Date(fechaEmision) } : {}),
      ...(fechaVigencia ? { fechaVigencia: new Date(fechaVigencia) } : {}),
    },
  });
  return NextResponse.json({ autorizacion });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  await prisma.entregaDispensacion.deleteMany({ where: { recetaElectronicaId: id } });
  await prisma.recetaElectronica.delete({ where: { id } });
  return NextResponse.json({ eliminada: true });
}
