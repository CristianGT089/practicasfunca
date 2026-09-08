import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/nucleo/auth";
import { abrirSesion } from "@/lib/turnero/operaciones";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const parsed = z
    .object({ turneroId: z.string().min(1) })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Falta turneroId" }, { status: 400 });
  }

  try {
    const sesion = await abrirSesion(parsed.data.turneroId);
    return NextResponse.json({ sesionId: sesion.id }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
