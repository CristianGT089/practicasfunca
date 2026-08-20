import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const pacientes = await prisma.paciente.findMany({ orderBy: { nombre: "asc" } });
  return NextResponse.json({ pacientes });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const nombre = (body?.nombre as string | undefined)?.trim();
  const cedula = (body?.cedula as string | undefined)?.trim();
  const edad = Number(body?.edad ?? 0);

  if (!nombre || !cedula) {
    return NextResponse.json({ error: "Nombre y cédula son requeridos" }, { status: 400 });
  }

  const existente = await prisma.paciente.findUnique({ where: { cedula } });
  if (existente) {
    return NextResponse.json({ error: "Ya existe un paciente con esa cédula" }, { status: 409 });
  }

  const alergias = (body?.alergias as string | undefined)
    ?.split(",")
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean) ?? [];

  const paciente = await prisma.paciente.create({
    data: {
      nombre,
      cedula,
      edad,
      alergias,
      antecedentes: (body?.antecedentes as string | undefined)?.trim() || null,
    },
  });

  return NextResponse.json({ paciente });
}
