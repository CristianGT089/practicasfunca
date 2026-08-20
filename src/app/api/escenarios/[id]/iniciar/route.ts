import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { ModoJuego } from "@prisma/client";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id: escenarioId } = await params;
  const escenario = await prisma.escenario.findUnique({ where: { id: escenarioId } });
  if (!escenario || !escenario.activo) {
    return NextResponse.json({ error: "Escenario no encontrado" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const modo = body?.modo as ModoJuego | undefined;
  const modoValido = modo && modo in ModoJuego ? modo : ModoJuego.FACIL;

  // Si ya existe un intento en progreso para este estudiante y escenario, lo reanuda (con su modo original).
  const existente = await prisma.intento.findFirst({
    where: { usuarioId: usuario.id, escenarioId, estado: "EN_PROGRESO" },
  });

  const intento =
    existente ??
    (await prisma.intento.create({
      data: { usuarioId: usuario.id, escenarioId, modo: modoValido },
    }));

  return NextResponse.json({ intentoId: intento.id });
}
