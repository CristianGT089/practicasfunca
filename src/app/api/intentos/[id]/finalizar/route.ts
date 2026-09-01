import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { calificarIntento } from "@/lib/calificacion";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id: intentoId } = await params;
  const intento = await prisma.intento.findUnique({
    where: { id: intentoId },
    include: { escenario: { include: { pasos: true } }, acciones: true },
  });
  if (!intento || intento.usuarioId !== usuario.id) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  if (intento.estado !== "EN_PROGRESO") {
    return NextResponse.json({ error: "Este intento ya fue finalizado" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const resultadoObtenido = body?.resultado as string | undefined;

  const resultado = calificarIntento(
    intento.escenario.pasos,
    intento.acciones,
    intento.escenario.resultadoEsperado,
    resultadoObtenido ?? null
  );

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
      resultadoObtenido: resultadoObtenido ?? null,
    },
  });

  return NextResponse.json({
    intento: actualizado,
    detallePasos: resultado.detallePasos.map((d) => ({
      descripcion: d.paso.descripcion,
      obligatorio: d.paso.obligatorio,
      cumplido: d.cumplido,
    })),
  });
}
