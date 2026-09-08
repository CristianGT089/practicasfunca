import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/nucleo/prisma";
import { requireAdmin } from "@/lib/nucleo/auth";
import {
  CATEGORIAS_PRIORIDAD_DEFAULT,
  SERVICIOS_DEFAULT,
  categoriaSchema,
  servicioSchema,
} from "@/lib/turnero/config";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const plantillas = await prisma.turnero.findMany({
    orderBy: { creadoEn: "asc" },
    include: {
      sesiones: {
        where: { estado: "ABIERTA" },
        select: { id: true, iniciadaEn: true },
        take: 1,
      },
    },
  });

  return NextResponse.json({
    plantillas: plantillas.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      numeroEspacios: p.numeroEspacios,
      servicios: p.servicios,
      categorias: p.categorias,
      reglaPrioridad: p.reglaPrioridad,
      activo: p.activo,
      sesionActiva: p.sesiones[0]?.id ?? null,
    })),
  });
}

const crearSchema = z.object({
  nombre: z.string().trim().min(1).max(80),
  numeroEspacios: z.number().int().min(1).max(20).default(3),
  servicios: z.array(servicioSchema).min(1).default(SERVICIOS_DEFAULT),
  categorias: z.array(categoriaSchema).default(CATEGORIAS_PRIORIDAD_DEFAULT),
  reglaPrioridad: z.enum(["ESTRICTA", "INTERCALADA"]).default("ESTRICTA"),
});

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const parsed = crearSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", detalle: parsed.error.issues }, { status: 400 });
  }

  const plantilla = await prisma.turnero.create({ data: parsed.data });
  return NextResponse.json({ plantilla }, { status: 201 });
}
