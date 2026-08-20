import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { generarPassword } from "@/lib/passwords";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  const passwordTemporal = generarPassword();
  const passwordHash = await bcrypt.hash(passwordTemporal, 10);

  await prisma.usuario.update({ where: { id }, data: { passwordHash } });

  return NextResponse.json({ passwordTemporal });
}
