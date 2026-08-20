import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { contarPasosCumplidos } from "@/lib/peligros";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const intento = await prisma.intento.findUnique({
    where: { id },
    include: {
      escenario: true,
      acciones: { orderBy: { creadoEn: "asc" } },
    },
  });

  if (!intento || intento.usuarioId !== usuario.id) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  let intentoTurnoInfo: { id: string; indice: number; total: number; vidas: number; titulo: string } | null = null;
  if (intento.intentoTurnoId) {
    const intentoTurno = await prisma.intentoTurno.findUnique({
      where: { id: intento.intentoTurnoId },
      include: { turno: { include: { items: true } } },
    });
    if (intentoTurno) {
      intentoTurnoInfo = {
        id: intentoTurno.id,
        indice: intentoTurno.indice,
        total: intentoTurno.turno.items.length,
        vidas: intentoTurno.vidas,
        titulo: intentoTurno.turno.titulo,
      };
    }
  }

  const medicamentos = await prisma.medicamento.findMany({
    orderBy: { nombre: "asc" },
  });

  // Los pasos esperados nunca se exponen al cliente (revelarían el checklist);
  // solo se usan aquí para calcular el conteo de progreso.
  const pasos = await prisma.pasoEsperado.findMany({ where: { escenarioId: intento.escenarioId } });
  const progreso = contarPasosCumplidos(pasos, intento.acciones);
  const erroresTotales = intento.acciones.filter((a) => a.esError).length;
  const precision =
    intento.acciones.length > 0
      ? Math.round(((intento.acciones.length - erroresTotales) / intento.acciones.length) * 100)
      : 100;

  // No se envía el pacienteId ni la actitud ante la cédula: eso solo se revela cuando el
  // estudiante la solicita y busca al paciente en el sistema, para que la ficha no llegue
  // "gratis" con la carga inicial de la página.
  const { pacienteId: _pacienteId, actitudCedula, descripcionDificil, ...escenarioSeguro } = intento.escenario;
  void _pacienteId;

  return NextResponse.json({
    intento: {
      ...intento,
      escenario: {
        ...escenarioSeguro,
        descripcion: intento.modo === "DIFICIL" && descripcionDificil ? descripcionDificil : escenarioSeguro.descripcion,
        mostrarIdentidad: intento.escenario.pacienteId !== null || actitudCedula !== null,
      },
      intentoTurno: intentoTurnoInfo,
    },
    medicamentos,
    progreso,
    precision,
  });
}
