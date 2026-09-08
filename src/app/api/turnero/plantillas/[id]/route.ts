import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/nucleo/prisma";
import { requireAdmin } from "@/lib/nucleo/auth";
import { categoriaSchema, servicioSchema } from "@/lib/turnero/config";

const actualizarSchema = z.object({
  nombre: z.string().trim().min(1).max(80).optional(),
  numeroEspacios: z.number().int().min(1).max(20).optional(),
  servicios: z.array(servicioSchema).min(1).optional(),
  categorias: z.array(categoriaSchema).optional(),
  reglaPrioridad: z.enum(["ESTRICTA", "INTERCALADA"]).optional(),
  activo: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  const parsed = actualizarSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", detalle: parsed.error.issues }, { status: 400 });
  }

  const plantilla = await prisma.turnero.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ plantilla });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  // Si ya tuvo sesiones, se desactiva en vez de borrar (conserva el historial).
  const conSesiones = await prisma.sesionTurnero.count({ where: { turneroId: id } });
  if (conSesiones > 0) {
    await prisma.turnero.update({ where: { id }, data: { activo: false } });
    return NextResponse.json({ desactivada: true });
  }
  await prisma.turnero.delete({ where: { id } });
  return NextResponse.json({ eliminada: true });
}
