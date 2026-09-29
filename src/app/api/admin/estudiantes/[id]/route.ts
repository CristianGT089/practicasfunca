import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/nucleo/prisma";
import { puedeGestionarEstudiante, requireGestor } from "@/lib/nucleo/permisos";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gestor = await requireGestor();
  if (!gestor) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  if (!(await puedeGestionarEstudiante(gestor, id))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const activo = body?.activo as boolean | undefined;

  if (typeof activo !== "boolean") {
    return NextResponse.json({ error: "Campo 'activo' requerido" }, { status: 400 });
  }

  const actualizado = await prisma.usuario.update({
    where: { id },
    data: { activo },
    select: { id: true, nombre: true, usuario: true, activo: true, temporal: true, rutaDirecta: true, creadoEn: true },
  });

  return NextResponse.json({ estudiante: actualizado });
}
