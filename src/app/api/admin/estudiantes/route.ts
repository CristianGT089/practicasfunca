import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/nucleo/prisma";
import { requireAdmin } from "@/lib/nucleo/auth";
import { generarPassword } from "@/lib/nucleo/passwords";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const estudiantes = await prisma.usuario.findMany({
    where: { rol: "ESTUDIANTE" },
    orderBy: { creadoEn: "desc" },
    select: {
      id: true,
      nombre: true,
      usuario: true,
      activo: true,
      temporal: true,
      rutaDirecta: true,
      genero: true,
      creadoEn: true,
    },
  });

  return NextResponse.json({ estudiantes });
}

const GENEROS_VALIDOS = new Set(["MASCULINO", "FEMENINO", "OTRO"]);

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const nombre = (body?.nombre as string | undefined)?.trim();
  const usuario = (body?.usuario as string | undefined)?.trim().toLowerCase();
  const generoCrudo = body?.genero as string | null | undefined;
  const genero = generoCrudo && GENEROS_VALIDOS.has(generoCrudo) ? generoCrudo : null;

  if (!nombre || !usuario) {
    return NextResponse.json({ error: "Nombre y usuario son requeridos" }, { status: 400 });
  }

  const existente = await prisma.usuario.findUnique({ where: { usuario } });
  if (existente) {
    return NextResponse.json({ error: "Ese nombre de usuario ya existe" }, { status: 409 });
  }

  const passwordTemporal = generarPassword();
  const passwordHash = await bcrypt.hash(passwordTemporal, 10);

  const creado = await prisma.usuario.create({
    data: { nombre, usuario, passwordHash, rol: "ESTUDIANTE", genero: genero as "MASCULINO" | "FEMENINO" | "OTRO" | null },
    select: {
      id: true,
      nombre: true,
      usuario: true,
      activo: true,
      temporal: true,
      rutaDirecta: true,
      genero: true,
      creadoEn: true,
    },
  });

  return NextResponse.json({ estudiante: creado, passwordTemporal });
}
