import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/nucleo/prisma";
import { puedeGestionarEstudiante, requireGestor } from "@/lib/nucleo/permisos";
import { generarPassword } from "@/lib/nucleo/passwords";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gestor = await requireGestor();
  if (!gestor) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  if (!(await puedeGestionarEstudiante(gestor, id))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const passwordTemporal = generarPassword();
  const passwordHash = await bcrypt.hash(passwordTemporal, 10);

  await prisma.usuario.update({ where: { id }, data: { passwordHash } });

  return NextResponse.json({ passwordTemporal });
}
