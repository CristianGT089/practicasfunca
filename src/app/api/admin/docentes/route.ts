import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/nucleo/prisma";
import { requireAdmin } from "@/lib/nucleo/auth";
import { generarPassword } from "@/lib/nucleo/passwords";

/** Docentes: solo coordinación (admin) los crea y les asigna módulos. */

const seleccion = {
  id: true,
  nombre: true,
  usuario: true,
  activo: true,
  creadoEn: true,
  matriculas: { select: { modulo: { select: { id: true, nombre: true } } } },
  gruposComoDocente: { select: { id: true, nombre: true } },
} as const;

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const [docentes, modulos] = await Promise.all([
    prisma.usuario.findMany({ where: { rol: "DOCENTE" }, orderBy: { nombre: "asc" }, select: seleccion }),
    prisma.modulo.findMany({ where: { activo: true }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
  ]);
  return NextResponse.json({ docentes, modulos });
}

const crearSchema = z.object({
  nombre: z.string().trim().min(1).max(80),
  usuario: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(40)
    .regex(/^[a-z0-9._-]+$/, "Solo letras, números, punto, guion y guion bajo"),
  moduloIds: z.array(z.string().min(1)).default([]),
});

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const parsed = crearSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  if (await prisma.usuario.findUnique({ where: { usuario: parsed.data.usuario } })) {
    return NextResponse.json({ error: "Ese nombre de usuario ya existe" }, { status: 409 });
  }

  const passwordTemporal = generarPassword();
  const docente = await prisma.usuario.create({
    data: {
      nombre: parsed.data.nombre,
      usuario: parsed.data.usuario,
      passwordHash: await bcrypt.hash(passwordTemporal, 10),
      rol: "DOCENTE",
      creadoPorId: admin.id,
      matriculas: { create: parsed.data.moduloIds.map((moduloId) => ({ moduloId })) },
    },
    select: seleccion,
  });
  return NextResponse.json({ docente, passwordTemporal }, { status: 201 });
}
