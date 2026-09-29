import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/nucleo/prisma";
import { requireAdmin } from "@/lib/nucleo/auth";
import { filtroModulos, requireGestor } from "@/lib/nucleo/permisos";

/** Lectura: coordinación ve todos; un docente, solo los suyos. Crear y editar es solo del admin. */
export async function GET() {
  const gestor = await requireGestor();
  if (!gestor) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const modulos = await prisma.modulo.findMany({
    where: await filtroModulos(gestor),
    orderBy: { nombre: "asc" },
    include: { _count: { select: { escenarios: true, matriculas: true } } },
  });
  return NextResponse.json({ modulos });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const slug = (body?.slug as string | undefined)?.trim().toLowerCase().replace(/\s+/g, "_");
  const nombre = (body?.nombre as string | undefined)?.trim();
  const descripcion = (body?.descripcion as string | undefined)?.trim() || null;
  const colorTema = (body?.colorTema as string | undefined)?.trim() || null;

  if (!slug || !nombre) {
    return NextResponse.json({ error: "slug y nombre son requeridos" }, { status: 400 });
  }

  const modulo = await prisma.modulo.create({ data: { slug, nombre, descripcion, colorTema } });
  return NextResponse.json({ modulo });
}
