import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  // Esta pantalla administra los medicamentos ficticios de los escenarios calificados.
  // El catálogo real importado del Excel (origen CATALOGO_REAL) es de solo consulta para
  // el estudiante en /panel/catalogo y no se edita acá.
  const medicamentos = await prisma.medicamento.findMany({
    where: { origen: "PRACTICA" },
    orderBy: { nombre: "asc" },
  });
  return NextResponse.json({ medicamentos });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const nombre = (body?.nombre as string | undefined)?.trim();
  const principioActivo = (body?.principioActivo as string | undefined)?.trim();
  const presentacion = (body?.presentacion as string | undefined)?.trim();

  if (!nombre || !principioActivo || !presentacion) {
    return NextResponse.json({ error: "Nombre, principio activo y presentación son requeridos" }, { status: 400 });
  }

  const tags = (body?.tags as string | undefined)
    ?.split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean) ?? [];

  const medicamento = await prisma.medicamento.create({
    data: {
      nombre,
      principioActivo,
      presentacion,
      requiereReceta: !!body?.requiereReceta,
      esControlado: !!body?.esControlado,
      stock: Number(body?.stock ?? 0),
      precio: Number(body?.precio ?? 0),
      tags,
    },
  });

  return NextResponse.json({ medicamento });
}
