import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/nucleo/prisma";
import { requireAdmin } from "@/lib/nucleo/auth";
import { casoSchema } from "@/lib/modulos/dispensacion/esquemas";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  const parsed = casoSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos", detalle: parsed.error.issues }, { status: 400 });

  const { formulas, ...caso } = parsed.data;
  // Las fórmulas se reemplazan por completo (más simple que hacer diff).
  await prisma.formulaPresentada.deleteMany({ where: { casoId: id } });
  await prisma.casoDispensacion.update({
    where: { id },
    data: {
      ...caso,
      formulas: {
        create: formulas.map((f) => ({
          medico: f.medico,
          registroMedico: f.registroMedico,
          ips: f.ips,
          fechaEmision: new Date(f.fechaEmision),
          diasVigencia: f.diasVigencia,
          cargadaEnSistema: f.cargadaEnSistema,
          nota: f.nota,
          renglones: { create: f.renglones },
        })),
      },
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  await prisma.entregaDispensacion.deleteMany({ where: { casoId: id } });
  await prisma.casoDispensacion.delete({ where: { id } });
  return NextResponse.json({ eliminado: true });
}
