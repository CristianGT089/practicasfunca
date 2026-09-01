import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { calcularDesbloqueo } from "@/lib/turnos";

export async function GET(req: Request) {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const moduloId = searchParams.get("moduloId");
  if (!moduloId) return NextResponse.json({ error: "Falta moduloId" }, { status: 400 });

  const turnos = await prisma.turno.findMany({
    where: { activo: true, moduloId },
    orderBy: { creadoEn: "asc" },
    include: { items: true },
  });

  const resultado = await Promise.all(
    turnos.map(async (t) => {
      const desbloqueado = await calcularDesbloqueo(usuario.id, t);
      const ultimo = await prisma.intentoTurno.findFirst({
        where: { usuarioId: usuario.id, turnoId: t.id },
        orderBy: { iniciadoEn: "desc" },
        select: { id: true, estado: true, vidas: true, indice: true, puntajeFinal: true },
      });
      return {
        id: t.id,
        titulo: t.titulo,
        descripcion: t.descripcion,
        totalCasos: t.items.length,
        desbloqueado,
        ultimo,
      };
    })
  );

  return NextResponse.json({ turnos: resultado });
}
