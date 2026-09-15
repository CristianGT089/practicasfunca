import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, requireUser } from "@/lib/nucleo/auth";
import { construirSnapshot } from "@/lib/turnero/snapshot";
import { ajustarEspacios, cerrarSesion } from "@/lib/turnero/operaciones";

// Lectura: cualquier usuario logueado (el panel de dispensación del estudiante también
// necesita el snapshot). Ajustar espacios / cerrar la sesión: solo admin (ver PATCH).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const snapshot = await construirSnapshot(id);
  if (!snapshot) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
  return NextResponse.json(snapshot);
}

const patchSchema = z.union([
  z.object({ numeroEspacios: z.number().int().min(1).max(20) }),
  z.object({ cerrar: z.literal(true) }),
]);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  try {
    if ("cerrar" in parsed.data) {
      const { puestosEliminados } = await cerrarSesion(id);
      return NextResponse.json({ ...(await construirSnapshot(id)), puestosEliminados });
    }
    await ajustarEspacios(id, parsed.data.numeroEspacios);
    return NextResponse.json(await construirSnapshot(id));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
