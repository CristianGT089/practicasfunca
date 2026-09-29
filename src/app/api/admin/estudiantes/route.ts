import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/nucleo/prisma";
import { filtroEstudiantes, filtroGrupos, requireGestor } from "@/lib/nucleo/permisos";
import { generarPassword } from "@/lib/nucleo/passwords";

export async function GET() {
  const gestor = await requireGestor();
  if (!gestor) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const estudiantes = await prisma.usuario.findMany({
    where: filtroEstudiantes(gestor),
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
      gruposComoEstudiante: { select: { id: true, nombre: true } },
    },
  });

  return NextResponse.json({ estudiantes });
}

const GENEROS_VALIDOS = new Set(["MASCULINO", "FEMENINO", "OTRO"]);

/**
 * Crea un estudiante. Un docente debe ponerlo en al menos uno de sus grupos (si no, no lo
 * volvería a ver); queda matriculado en los módulos de esos grupos.
 */
export async function POST(req: NextRequest) {
  const gestor = await requireGestor();
  if (!gestor) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const nombre = (body?.nombre as string | undefined)?.trim();
  const usuario = (body?.usuario as string | undefined)?.trim().toLowerCase();
  const generoCrudo = body?.genero as string | null | undefined;
  const genero = generoCrudo && GENEROS_VALIDOS.has(generoCrudo) ? generoCrudo : null;

  if (!nombre || !usuario) {
    return NextResponse.json({ error: "Nombre y usuario son requeridos" }, { status: 400 });
  }

  const grupoIdsPedidos = Array.isArray(body?.grupoIds) ? (body.grupoIds as unknown[]).filter((g): g is string => typeof g === "string") : [];
  const grupos = await prisma.grupo.findMany({
    where: { AND: [{ id: { in: grupoIdsPedidos } }, filtroGrupos(gestor)] },
    include: { modulos: { select: { id: true } } },
  });
  if (gestor.rol === "DOCENTE" && grupos.length === 0) {
    return NextResponse.json({ error: "Elige al menos uno de tus grupos para el estudiante" }, { status: 400 });
  }
  const moduloIds = [...new Set(grupos.flatMap((g) => g.modulos.map((m) => m.id)))];

  const existente = await prisma.usuario.findUnique({ where: { usuario } });
  if (existente) {
    return NextResponse.json({ error: "Ese nombre de usuario ya existe" }, { status: 409 });
  }

  const passwordTemporal = generarPassword();
  const passwordHash = await bcrypt.hash(passwordTemporal, 10);

  const creado = await prisma.usuario.create({
    data: {
      nombre,
      usuario,
      passwordHash,
      rol: "ESTUDIANTE",
      genero: genero as "MASCULINO" | "FEMENINO" | "OTRO" | null,
      creadoPorId: gestor.id,
      gruposComoEstudiante: { connect: grupos.map((g) => ({ id: g.id })) },
      matriculas: { create: moduloIds.map((moduloId) => ({ moduloId })) },
    },
    select: {
      id: true,
      nombre: true,
      usuario: true,
      activo: true,
      temporal: true,
      rutaDirecta: true,
      genero: true,
      creadoEn: true,
      gruposComoEstudiante: { select: { id: true, nombre: true } },
    },
  });

  return NextResponse.json({ estudiante: creado, passwordTemporal });
}
