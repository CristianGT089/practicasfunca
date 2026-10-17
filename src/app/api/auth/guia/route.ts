import { NextResponse } from "next/server";
import { requireUser } from "@/lib/nucleo/auth";
import { prisma } from "@/lib/nucleo/prisma";

/** El usuario terminó o saltó un recorrido guiado: deja de arrancar solo en esa pantalla. */
export async function POST(req: Request) {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { guia } = await req.json().catch(() => ({}));
  if (typeof guia !== "string" || !/^[a-z-]{1,40}$/.test(guia)) {
    return NextResponse.json({ error: "Recorrido inválido" }, { status: 400 });
  }
  if (!usuario.guiasVistas.includes(guia)) {
    await prisma.usuario.update({ where: { id: usuario.id }, data: { guiasVistas: { push: guia } } });
  }
  return NextResponse.json({ ok: true });
}
