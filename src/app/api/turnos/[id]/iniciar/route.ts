import { NextResponse } from "next/server";
import { prisma } from "@/lib/nucleo/prisma";
import { requireUser } from "@/lib/nucleo/auth";
import { calcularDesbloqueo } from "@/lib/nucleo/turnos";
import { ModoJuego } from "@prisma/client";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id: turnoId } = await params;
  const turno = await prisma.turno.findUnique({
    where: { id: turnoId },
    include: { items: { orderBy: { orden: "asc" } } },
  });
  if (!turno || !turno.activo || turno.items.length === 0) {
    return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });
  }

  const desbloqueado = await calcularDesbloqueo(usuario.id, turno);
  if (!desbloqueado) {
    return NextResponse.json({ error: "Todavía no desbloqueas este turno." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const modo = body?.modo as ModoJuego | undefined;
  const modoValido = modo && modo in ModoJuego ? modo : ModoJuego.FACIL;

  const existente = await prisma.intentoTurno.findFirst({
    where: { usuarioId: usuario.id, turnoId, estado: "EN_PROGRESO" },
    include: { intentos: { where: { estado: "EN_PROGRESO" }, take: 1 } },
  });

  if (existente) {
    const subIntentoActivo = existente.intentos[0];
    if (subIntentoActivo) {
      return NextResponse.json({ intentoId: subIntentoActivo.id });
    }
    // No debería pasar (se crea siempre en conjunto), pero por si acaso se recupera con uno nuevo.
    const item = turno.items[existente.indice];
    const nuevo = await prisma.intento.create({
      data: {
        usuarioId: usuario.id,
        escenarioId: item.escenarioId,
        modo: existente.modo,
        vidas: existente.vidas,
        intentoTurnoId: existente.id,
      },
    });
    return NextResponse.json({ intentoId: nuevo.id });
  }

  const intentoTurno = await prisma.intentoTurno.create({
    data: { usuarioId: usuario.id, turnoId, modo: modoValido },
  });
  const primerIntento = await prisma.intento.create({
    data: {
      usuarioId: usuario.id,
      escenarioId: turno.items[0].escenarioId,
      modo: modoValido,
      vidas: intentoTurno.vidas,
      intentoTurnoId: intentoTurno.id,
    },
  });

  return NextResponse.json({ intentoId: primerIntento.id });
}
