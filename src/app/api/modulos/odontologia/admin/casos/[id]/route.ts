import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/nucleo/prisma";
import { requireGestorDeModulo } from "@/lib/nucleo/permisos";
import { casoOdontologiaSchema } from "@/lib/modulos/odontologia/esquemas";
import { actualizarCaso } from "@/lib/modulos/odontologia/admin";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireGestorDeModulo("odontologia");
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  const parsed = casoOdontologiaSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos", detalle: parsed.error.issues }, { status: 400 });

  const actualizado = await actualizarCaso(prisma, id, parsed.data);
  if (!actualizado) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

/** Con intentos de estudiantes no se borra (se perderían sus notas): se desactiva. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireGestorDeModulo("odontologia");
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  const escenario = await prisma.escenario.findUnique({
    where: { id },
    include: { odontologia: true, _count: { select: { intentos: true, turnoItems: true } } },
  });
  if (!escenario?.odontologia) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  if (escenario._count.intentos > 0 || escenario._count.turnoItems > 0) {
    await prisma.escenario.update({ where: { id }, data: { activo: false } });
    return NextResponse.json({ desactivado: true });
  }
  await prisma.escenario.delete({ where: { id } });
  await prisma.pacienteOdontologia.delete({ where: { id: escenario.odontologia.pacienteId } }).catch(() => null);
  return NextResponse.json({ eliminado: true });
}
