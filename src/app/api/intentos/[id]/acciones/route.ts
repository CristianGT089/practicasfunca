import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { TipoAccion } from "@prisma/client";
import { evaluarPeligroAgregar, estaFueraDeChecklist, contarPasosCumplidos } from "@/lib/peligros";
import { perderCorazon } from "@/lib/vidas";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id: intentoId } = await params;
  const intento = await prisma.intento.findUnique({
    where: { id: intentoId },
    include: { escenario: { include: { paciente: true, pasos: true } }, acciones: true },
  });
  if (!intento || intento.usuarioId !== usuario.id) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  if (intento.estado !== "EN_PROGRESO") {
    return NextResponse.json({ error: "Este intento ya fue finalizado" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const tipo = body?.tipo as TipoAccion | undefined;
  const payload = (body?.payload as Record<string, unknown> | undefined) ?? undefined;

  if (!tipo || !(tipo in TipoAccion)) {
    return NextResponse.json({ error: "Tipo de acción inválido" }, { status: 400 });
  }

  // ---------- Evaluar si esta acción es un error en tiempo real ----------
  let peligros: string[] = [];
  let fueraDeChecklist = false;

  if (tipo === TipoAccion.AGREGAR_A_VENTA && payload?.medicamentoId) {
    const medicamento = await prisma.medicamento.findUnique({ where: { id: payload.medicamentoId as string } });
    if (medicamento) {
      peligros = evaluarPeligroAgregar(
        medicamento,
        { recetaPresentada: intento.escenario.recetaPresentada, paciente: intento.escenario.paciente },
        intento.acciones
      );
    }
  }

  if (intento.modo === "DIFICIL") {
    fueraDeChecklist = estaFueraDeChecklist(tipo, payload ?? null, intento.escenario.pasos);
  }

  const esError = peligros.length > 0 || fueraDeChecklist;

  const accion = await prisma.accion.create({
    data: { intentoId, tipo, payload: payload as object | undefined, esError },
  });

  let vidas = intento.vidas;
  let estado: "EN_PROGRESO" | "PERDIDO" = "EN_PROGRESO";

  if (esError) {
    ({ vidas, estado } = await perderCorazon(intentoId, intento));
  }

  const todasLasAcciones = [...intento.acciones, accion];
  const progreso = contarPasosCumplidos(intento.escenario.pasos, todasLasAcciones);
  const erroresTotales = todasLasAcciones.filter((a) => a.esError).length;
  const precision = Math.round(((todasLasAcciones.length - erroresTotales) / todasLasAcciones.length) * 100);

  return NextResponse.json({
    accion,
    vidas,
    estado,
    error: esError ? { peligros, fueraDeChecklist } : null,
    progreso,
    precision,
  });
}
