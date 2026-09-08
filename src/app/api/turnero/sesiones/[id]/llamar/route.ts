import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/nucleo/auth";
import { llamarSiguiente } from "@/lib/turnero/operaciones";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  const parsed = z
    .object({ espacio: z.number().int().min(1) })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Falta el número de espacio" }, { status: 400 });

  try {
    const { ticket } = await llamarSiguiente(id, parsed.data.espacio);
    if (!ticket) return NextResponse.json({ vacia: true });
    return NextResponse.json({ codigo: ticket.codigo, espacio: parsed.data.espacio });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
