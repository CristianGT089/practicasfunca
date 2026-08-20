import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function POST(_req: Request, { params }: { params: Promise<{ intentoTurnoId: string }> }) {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { intentoTurnoId } = await params;
  const intentoTurno = await prisma.intentoTurno.findUnique({
    where: { id: intentoTurnoId },
    include: {
      turno: { include: { items: { orderBy: { orden: "asc" } } } },
      intentos: { where: { estado: "COMPLETADO" } },
    },
  });
  if (!intentoTurno || intentoTurno.usuarioId !== usuario.id) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  if (intentoTurno.estado !== "EN_PROGRESO") {
    return NextResponse.json({ error: "Este turno ya fue finalizado" }, { status: 400 });
  }

  const items = intentoTurno.turno.items;
  const nuevoIndice = intentoTurno.indice + 1;

  if (nuevoIndice >= items.length) {
    const promedio =
      intentoTurno.intentos.length > 0
        ? Math.round(
            intentoTurno.intentos.reduce((sum, i) => sum + (i.puntajeFinal ?? 0), 0) / intentoTurno.intentos.length
          )
        : 0;
    await prisma.intentoTurno.update({
      where: { id: intentoTurnoId },
      data: { estado: "COMPLETADO", indice: nuevoIndice, puntajeFinal: promedio, finalizadoEn: new Date() },
    });
    return NextResponse.json({ terminado: true, puntajeFinal: promedio });
  }

  await prisma.intentoTurno.update({ where: { id: intentoTurnoId }, data: { indice: nuevoIndice } });
  const siguienteItem = items[nuevoIndice];
  const nuevoIntento = await prisma.intento.create({
    data: {
      usuarioId: usuario.id,
      escenarioId: siguienteItem.escenarioId,
      modo: intentoTurno.modo,
      vidas: intentoTurno.vidas,
      intentoTurnoId,
    },
  });

  return NextResponse.json({ terminado: false, intentoId: nuevoIntento.id });
}
