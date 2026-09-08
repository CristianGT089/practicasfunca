import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/nucleo/auth";
import { avanzarCaso, reiniciarSesion, snapshotPractica } from "@/lib/modulos/dispensacion/practica";

export async function GET() {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  return NextResponse.json(await snapshotPractica(usuario.id));
}

export async function POST(req: NextRequest) {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const parsed = z
    .object({ accion: z.enum(["siguiente", "reiniciar"]) })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Acción inválida" }, { status: 400 });

  if (parsed.data.accion === "reiniciar") {
    await reiniciarSesion(usuario.id);
  } else {
    await avanzarCaso(usuario.id);
  }
  return NextResponse.json(await snapshotPractica(usuario.id));
}
