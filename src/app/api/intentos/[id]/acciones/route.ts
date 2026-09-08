import { NextResponse } from "next/server";
import { prisma } from "@/lib/nucleo/prisma";
import { requireUser } from "@/lib/nucleo/auth";
import { perderCorazon } from "@/lib/nucleo/vidas";
import { contarPasosCumplidos } from "@/lib/nucleo/checklist";
import { intentoConEscenarioInclude } from "@/lib/modulos/contrato";
import { obtenerModuloSimulacion } from "@/lib/modulos/registroSimulacion";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id: intentoId } = await params;
  const intento = await prisma.intento.findUnique({
    where: { id: intentoId },
    include: intentoConEscenarioInclude,
  });
  if (!intento || intento.usuarioId !== usuario.id) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  if (intento.estado !== "EN_PROGRESO") {
    return NextResponse.json({ error: "Este intento ya fue finalizado" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const tipo = body?.tipo as string | undefined;
  const payload = (body?.payload as Record<string, unknown> | undefined) ?? undefined;

  if (!tipo) {
    return NextResponse.json({ error: "Tipo de acción inválido" }, { status: 400 });
  }

  // ---------- Evaluar si esta acción es un error en tiempo real ----------
  // El motor no conoce las reglas de cada módulo: delega en su `ModuloSimulacion`.
  const modulo = obtenerModuloSimulacion(intento.escenario.modulo.slug);
  const { peligros, fueraDeChecklist } = modulo
    ? await modulo.evaluarAccion({
        tipo,
        payload,
        modo: intento.modo,
        escenario: intento.escenario,
        accionesPrevias: intento.acciones,
        prisma,
      })
    : { peligros: [] as string[], fueraDeChecklist: false };

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
