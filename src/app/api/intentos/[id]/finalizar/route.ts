import { NextResponse } from "next/server";
import { prisma } from "@/lib/nucleo/prisma";
import { requireUser } from "@/lib/nucleo/auth";
import { calificarIntento } from "@/lib/nucleo/calificacion";
import { intentoConEscenarioInclude, type CalificacionModulo } from "@/lib/modulos/contrato";
import { obtenerModuloSimulacion } from "@/lib/modulos/registroSimulacion";
import { calcularTrato, normalizarGuion, PESO_TRATO } from "@/lib/escena/guion";

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
  const resultadoObtenido = (body?.resultado as string | undefined) ?? null;

  // Si el módulo califica por su cuenta (ej. contenido de un odontograma), manda él;
  // si no, checklist de acciones + resultado genérico.
  const modulo = obtenerModuloSimulacion(intento.escenario.modulo.slug);
  let resultado: CalificacionModulo;
  if (modulo?.calificar) {
    resultado = modulo.calificar({ escenario: intento.escenario, acciones: intento.acciones, resultadoObtenido });
  } else {
    const generico = calificarIntento(
      intento.escenario.pasos,
      intento.acciones,
      intento.escenario.resultadoEsperado,
      resultadoObtenido
    );
    resultado = {
      ...generico,
      detallePasos: generico.detallePasos.map((d) => ({
        descripcion: d.paso.descripcion,
        obligatorio: d.paso.obligatorio,
        cumplido: d.cumplido,
      })),
    };
  }

  // Trato al paciente: si el caso tiene guion y el estudiante eligió respuestas, pesa un 15 %.
  const guion = normalizarGuion(intento.escenario.guion);
  if (guion) {
    const respondidas = intento.acciones
      .filter((a) => a.tipo === "RESPONDER")
      .map((a) => a.payload as { momento?: unknown; indice?: unknown } | null)
      .filter((p): p is { momento: string; indice: number } => typeof p?.momento === "string" && typeof p?.indice === "number");
    const trato = calcularTrato(guion, respondidas);
    if (trato !== null) {
      resultado = {
        ...resultado,
        puntajeFinal: Math.round(resultado.puntajeFinal * (1 - PESO_TRATO) + trato * PESO_TRATO),
        detallePasos: [
          ...resultado.detallePasos,
          { descripcion: `Trato al paciente: ${trato}% (cuenta el ${PESO_TRATO * 100} % de la nota)`, obligatorio: false, cumplido: trato >= 60 },
        ],
        extra: { ...resultado.extra, trato },
      };
    }
  }

  // Marca cada acción con si contó como correcta dentro del checklist
  await prisma.$transaction(
    resultado.accionesEvaluadas.map(({ accion, esCorrecta }) =>
      prisma.accion.update({ where: { id: accion.id }, data: { esCorrecta } })
    )
  );

  const actualizado = await prisma.intento.update({
    where: { id: intentoId },
    data: {
      estado: "COMPLETADO",
      finalizadoEn: new Date(),
      puntajeProceso: resultado.puntajeProceso,
      puntajeResultado: resultado.puntajeResultado,
      puntajeFinal: resultado.puntajeFinal,
      resultadoObtenido,
    },
  });

  return NextResponse.json({
    intento: actualizado,
    detallePasos: resultado.detallePasos,
    ...resultado.extra,
  });
}
