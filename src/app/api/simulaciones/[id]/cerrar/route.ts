import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/nucleo/auth";
import { cerrarSimulacion } from "@/lib/simulacion/operaciones";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  try {
    await cerrarSimulacion(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
