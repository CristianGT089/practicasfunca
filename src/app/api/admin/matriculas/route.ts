import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/nucleo/prisma";
import { requireAdmin } from "@/lib/nucleo/auth";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const [estudiantes, modulos, matriculas] = await Promise.all([
    prisma.usuario.findMany({ where: { rol: "ESTUDIANTE" }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true, usuario: true } }),
    prisma.modulo.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
    prisma.matricula.findMany({ select: { id: true, usuarioId: true, moduloId: true } }),
  ]);

  return NextResponse.json({ estudiantes, modulos, matriculas });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const usuarioId = body?.usuarioId as string | undefined;
  const moduloId = body?.moduloId as string | undefined;
  if (!usuarioId || !moduloId) {
    return NextResponse.json({ error: "usuarioId y moduloId son requeridos" }, { status: 400 });
  }

  const matricula = await prisma.matricula.upsert({
    where: { usuarioId_moduloId: { usuarioId, moduloId } },
    update: {},
    create: { usuarioId, moduloId },
  });
  return NextResponse.json({ matricula });
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const usuarioId = searchParams.get("usuarioId");
  const moduloId = searchParams.get("moduloId");
  if (!usuarioId || !moduloId) {
    return NextResponse.json({ error: "usuarioId y moduloId son requeridos" }, { status: 400 });
  }

  await prisma.matricula.delete({ where: { usuarioId_moduloId: { usuarioId, moduloId } } });
  return NextResponse.json({ ok: true });
}
