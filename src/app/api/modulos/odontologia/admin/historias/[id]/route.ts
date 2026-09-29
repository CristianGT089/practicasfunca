import { NextResponse } from "next/server";
import { prisma } from "@/lib/nucleo/prisma";
import { puedeGestionarEstudiante, requireGestorDeModulo } from "@/lib/nucleo/permisos";
import { intentoConEscenarioInclude } from "@/lib/modulos/contrato";
import { simulacionOdontologia } from "@/lib/modulos/odontologia/simulacion";
import { denticionDe } from "@/lib/modulos/odontologia/consultorio";
import { historiaVacia } from "@/lib/modulos/odontologia/historia";
import { ultimaHistoria } from "@/lib/modulos/odontologia/reglas";

/** Historia diligenciada por un estudiante + la revisión contra la esperada (aunque no la haya cerrado). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireGestorDeModulo("odontologia");
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  const intento = await prisma.intento.findUnique({
    where: { id },
    include: { ...intentoConEscenarioInclude, usuario: { select: { nombre: true, usuario: true } } },
  });
  const o = intento?.escenario.odontologia;
  if (!intento || !o || !(await puedeGestionarEstudiante(admin, intento.usuarioId))) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const calificacion = simulacionOdontologia.calificar!({
    escenario: intento.escenario,
    acciones: intento.acciones,
    resultadoObtenido: intento.resultadoObtenido,
  });

  return NextResponse.json({
    intento: {
      id: intento.id,
      estado: intento.estado,
      modo: intento.modo,
      iniciadoEn: intento.iniciadoEn,
      finalizadoEn: intento.finalizadoEn,
      puntajeFinal: intento.puntajeFinal,
      usuario: intento.usuario,
      titulo: intento.escenario.titulo,
    },
    paciente: o.paciente,
    denticion: denticionDe(o.denticion),
    historia: ultimaHistoria(intento.acciones) ?? historiaVacia(),
    acciones: intento.acciones.map((a) => ({ tipo: a.tipo, creadoEn: a.creadoEn, esError: a.esError })),
    detallePasos: calificacion.detallePasos,
    ...calificacion.extra,
  });
}
