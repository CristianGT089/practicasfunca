import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { TipoAccion } from "@prisma/client";
import { estaFueraDeChecklist, contarPasosCumplidos } from "@/lib/peligros";
import { perderCorazon } from "@/lib/vidas";
import { serializarReceta } from "@/lib/recetaOnline";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id: intentoId } = await params;
  const intento = await prisma.intento.findUnique({
    where: { id: intentoId },
    include: { escenario: { include: { paciente: true, pasos: true, items: true } }, acciones: true },
  });
  if (!intento || intento.usuarioId !== usuario.id) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  if (intento.estado !== "EN_PROGRESO") {
    return NextResponse.json({ error: "Este intento ya fue finalizado" }, { status: 400 });
  }

  const cedulaEntregada = intento.acciones.some(
    (a) => a.tipo === TipoAccion.SOLICITAR_CEDULA && (a.payload as { entregada?: boolean } | null)?.entregada
  );
  if (!cedulaEntregada) {
    return NextResponse.json(
      { error: "No puedes buscar una receta en línea sin haber validado primero la identidad del paciente." },
      { status: 400 }
    );
  }

  const paciente = intento.escenario.paciente;
  const medicamentoIds = intento.escenario.items.map((i) => i.medicamentoId);
  const recetas = paciente
    ? await prisma.recetaElectronica.findMany({
        where: { pacienteId: paciente.id, medicamentoId: { in: medicamentoIds } },
      })
    : [];
  const resultados = recetas.map(serializarReceta);
  const payload = { resultados };

  let fueraDeChecklist = false;
  if (intento.modo === "DIFICIL") {
    fueraDeChecklist = estaFueraDeChecklist(TipoAccion.BUSCAR_RECETA_ONLINE, payload, intento.escenario.pasos);
  }

  const accion = await prisma.accion.create({
    data: { intentoId, tipo: TipoAccion.BUSCAR_RECETA_ONLINE, payload, esError: fueraDeChecklist },
  });

  let vidas = intento.vidas;
  let estado: "EN_PROGRESO" | "PERDIDO" = "EN_PROGRESO";
  if (fueraDeChecklist) {
    ({ vidas, estado } = await perderCorazon(intentoId, intento));
  }

  const todasLasAcciones = [...intento.acciones, accion];
  const progreso = contarPasosCumplidos(intento.escenario.pasos, todasLasAcciones);
  const erroresTotales = todasLasAcciones.filter((a) => a.esError).length;
  const precision = Math.round(((todasLasAcciones.length - erroresTotales) / todasLasAcciones.length) * 100);

  return NextResponse.json({ resultados, vidas, estado, progreso, precision });
}
