import { NextResponse } from "next/server";
import { requireUser } from "@/lib/nucleo/auth";
import { prisma } from "@/lib/nucleo/prisma";

/** El docente terminó o descartó la guía de inicio: el Inicio deja de ofrecerla. */
export async function POST() {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  await prisma.usuario.update({ where: { id: usuario.id }, data: { guiaVistaEn: new Date() } });
  return NextResponse.json({ ok: true });
}
