import { NextResponse } from "next/server";
import { prisma } from "@/lib/nucleo/prisma";
import { requireUser } from "@/lib/nucleo/auth";
import { contarPasosCumplidos } from "@/lib/nucleo/checklist";
import { escenarioBaseSeguro, intentoConEscenarioInclude } from "@/lib/modulos/contrato";
import { obtenerModuloSimulacion } from "@/lib/modulos/registroSimulacion";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const intento = await prisma.intento.findUnique({
    where: { id },
    include: intentoConEscenarioInclude,
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

  // `pasos` (el checklist) se usa solo aquí para el conteo de progreso; nunca sale al cliente.
  const progreso = contarPasosCumplidos(intento.escenario.pasos, intento.acciones);
  const erroresTotales = intento.acciones.filter((a) => a.esError).length;
  const precision =
    intento.acciones.length > 0
      ? Math.round(((intento.acciones.length - erroresTotales) / intento.acciones.length) * 100)
      : 100;

  // Cada módulo decide qué exponer del escenario y qué datos extra necesita su "software".
  const modulo = obtenerModuloSimulacion(intento.escenario.modulo.slug);
  const escenarioSeguro = modulo
    ? modulo.proyectarEscenario(intento.escenario, intento.modo)
    : escenarioBaseSeguro(intento.escenario, intento.modo);
  const datosModulo = modulo?.cargarDatosIniciales ? await modulo.cargarDatosIniciales(prisma) : {};

  return NextResponse.json({
    intento: {
      ...intento,
      escenario: escenarioSeguro,
      intentoTurno: intentoTurnoInfo,
    },
    ...datosModulo,
    progreso,
    precision,
  });
}
