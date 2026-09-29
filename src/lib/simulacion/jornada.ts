/**
 * Jornada presencial evaluada (modelo `Simulacion`): participantes, quién está en cada
 * ventanilla, finalizar, confirmar quién atendió a quién y calificar. Ver
 * docs/plan-mejoras.md (Fase 2) y docs/simulacion.md.
 *
 * Estados: BORRADOR → ABIERTA → EN_REVISION (finalizada por el docente, falta confirmar)
 * → CERRADA (calificada; los pacientes generados se borran, el reporte queda en
 * AtencionJornada).
 */
import { prisma } from "@/lib/nucleo/prisma";
import { emitirCambio } from "@/lib/turnero/eventos";
import { cerrarSimulacion } from "./operaciones";
import { evaluarAtencionDispensario, type ClaveCriterio, type Criterio } from "./evaluacion";
import { ponderar, PESOS, revisarHistoria } from "@/lib/modulos/odontologia/calificacion";
import { historiaVacia, normalizarEsperado, normalizarHistoria, REMISIONES } from "@/lib/modulos/odontologia/historia";
import { denticionDe } from "@/lib/modulos/odontologia/consultorio";
import { CRITERIOS_RUBRICA, NIVELES, normalizarRubrica, puntajeRubrica } from "@/lib/modulos/odontologia/rubrica";
import { Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Participantes y ventanillas
// ---------------------------------------------------------------------------

/** Suma un participante: un estudiante registrado o un invitado con solo el nombre. */
export async function agregarParticipante(simulacionId: string, datos: { nombre?: string; usuarioId?: string | null }) {
  const simulacion = await prisma.simulacion.findUnique({ where: { id: simulacionId } });
  if (!simulacion || simulacion.estado === "CERRADA") throw new Error("La jornada ya está cerrada");

  if (datos.usuarioId) {
    const usuario = await prisma.usuario.findUnique({ where: { id: datos.usuarioId } });
    if (!usuario) throw new Error("Estudiante no encontrado");
    const ya = await prisma.participanteJornada.findFirst({ where: { simulacionId, usuarioId: usuario.id } });
    if (ya) return ya;
    return prisma.participanteJornada.create({ data: { simulacionId, usuarioId: usuario.id, nombre: usuario.nombre } });
  }
  const nombre = datos.nombre?.trim();
  if (!nombre) throw new Error("Escribe el nombre del invitado");
  return prisma.participanteJornada.create({ data: { simulacionId, nombre, invitado: true } });
}

/** "Desde ahora, en la ventanilla N está X" (o nadie, con null). */
export async function asignarVentanilla(simulacionId: string, espacioNumero: number, participanteId: string | null) {
  if (participanteId) {
    const p = await prisma.participanteJornada.findUnique({ where: { id: participanteId } });
    if (!p || p.simulacionId !== simulacionId) throw new Error("Participante no encontrado en esta jornada");
  }
  const asignacion = await prisma.asignacionEspacio.create({ data: { simulacionId, espacioNumero, participanteId } });
  const simulacion = await prisma.simulacion.findUnique({ where: { id: simulacionId }, select: { sesionTurneroId: true } });
  if (simulacion?.sesionTurneroId) emitirCambio(simulacion.sesionTurneroId);
  return asignacion;
}

/** Quién está ahora en cada ventanilla. */
export async function ventanillasActuales(simulacionId: string): Promise<Record<number, string | null>> {
  const asignaciones = await prisma.asignacionEspacio.findMany({ where: { simulacionId }, orderBy: { desde: "asc" } });
  const actual: Record<number, string | null> = {};
  for (const a of asignaciones) actual[a.espacioNumero] = a.participanteId;
  return actual;
}

/** Quién estaba en una ventanilla en un momento dado (la última asignación antes de ese momento). */
function participanteEn(
  asignaciones: { espacioNumero: number; participanteId: string | null; desde: Date }[],
  espacioNumero: number,
  momento: Date
): string | null {
  let quien: string | null = null;
  for (const a of asignaciones) {
    if (a.espacioNumero !== espacioNumero || a.desde.getTime() > momento.getTime()) continue;
    quien = a.participanteId;
  }
  return quien;
}

// ---------------------------------------------------------------------------
// Finalizar y confirmar
// ---------------------------------------------------------------------------

/**
 * El docente termina la jornada: se cierra el turnero (nadie más saca ni llama turnos) y se
 * arma la lista de atenciones con el estudiante que estaba en cada ventanilla cuando se
 * llamó el turno. Los datos (pacientes, entregas, puestos) se conservan hasta calificar.
 */
export async function finalizarJornada(simulacionId: string) {
  const simulacion = await prisma.simulacion.findUnique({ where: { id: simulacionId } });
  if (!simulacion || simulacion.estado !== "ABIERTA") throw new Error("Solo se puede finalizar una jornada abierta");

  if (simulacion.sesionTurneroId) {
    await prisma.sesionTurnero.update({
      where: { id: simulacion.sesionTurneroId },
      data: { estado: "CERRADA", cerradaEn: new Date() },
    });
    emitirCambio(simulacion.sesionTurneroId);
  }

  // En Odontología las atenciones ya existen: se crean cuando el estudiante abre la historia.
  if (simulacion.tipo === "ODONTOLOGIA") {
    await prisma.simulacion.update({ where: { id: simulacionId }, data: { estado: "EN_REVISION" } });
    return;
  }

  const [tickets, asignaciones, pacientes, entregas] = await Promise.all([
    simulacion.sesionTurneroId
      ? prisma.ticket.findMany({
          where: { sesionId: simulacion.sesionTurneroId, pacienteId: { not: null }, estado: { in: ["LLAMADO", "ATENDIDO"] } },
          orderBy: { llamadoEn: "asc" },
        })
      : Promise.resolve([]),
    prisma.asignacionEspacio.findMany({ where: { simulacionId }, orderBy: { desde: "asc" } }),
    prisma.paciente.findMany({ where: { simulacionId }, select: { id: true, nombre: true, cedula: true, situaciones: true } }),
    prisma.entregaSimulacion.findMany({ where: { simulacionId }, select: { pacienteId: true } }),
  ]);
  const porId = new Map(pacientes.map((p) => [p.id, p]));

  // Un turno por paciente (si se le sacó más de uno, cuenta el último que se llamó).
  const ultimoTicket = new Map<string, (typeof tickets)[number]>();
  for (const t of tickets) ultimoTicket.set(t.pacienteId!, t);

  const datos = [...ultimoTicket.values()].map((t) => {
    const p = porId.get(t.pacienteId!)!;
    const momento = t.llamadoEn ?? t.emitidoEn;
    return {
      simulacionId,
      pacienteId: p.id,
      pacienteNombre: p.nombre,
      pacienteCedula: p.cedula,
      situaciones: p.situaciones,
      ticketCodigo: t.codigo,
      espacioNumero: t.espacioNumero,
      llamadoEn: momento,
      participanteId: t.espacioNumero ? participanteEn(asignaciones, t.espacioNumero, momento) : null,
    };
  });

  // Pacientes que alguien atendió en el sistema sin turno (o con un turno que no se registró).
  const conEntregas = new Set(entregas.map((e) => e.pacienteId));
  for (const pacienteId of conEntregas) {
    if (ultimoTicket.has(pacienteId)) continue;
    const p = porId.get(pacienteId);
    if (!p) continue;
    datos.push({
      simulacionId,
      pacienteId: p.id,
      pacienteNombre: p.nombre,
      pacienteCedula: p.cedula,
      situaciones: p.situaciones,
      ticketCodigo: "",
      espacioNumero: null,
      llamadoEn: new Date(),
      participanteId: null,
    });
  }

  await prisma.$transaction([
    prisma.atencionJornada.deleteMany({ where: { simulacionId } }),
    prisma.atencionJornada.createMany({ data: datos.map((d) => ({ ...d, ticketCodigo: d.ticketCodigo || null })) }),
    prisma.simulacion.update({ where: { id: simulacionId }, data: { estado: "EN_REVISION" } }),
  ]);
}

/** Pacientes reales: el docente califica con la rúbrica y deja un comentario (antes de cerrar). */
export async function calificarConRubrica(simulacionId: string, atencionId: string, rubrica: unknown, comentario: string | null) {
  const atencion = await prisma.atencionJornada.findUnique({ where: { id: atencionId }, include: { simulacion: true } });
  if (!atencion || atencion.simulacionId !== simulacionId) throw new Error("Atención no encontrada");
  if (atencion.simulacion.estado === "CERRADA") throw new Error("La jornada ya se cerró");
  return prisma.atencionJornada.update({
    where: { id: atencionId },
    data: { rubrica: normalizarRubrica(rubrica), comentario: comentario?.trim() || null },
  });
}

/** El docente corrige quién atendió a un paciente en la vista de confirmación. */
export async function confirmarParticipante(simulacionId: string, atencionId: string, participanteId: string | null) {
  const atencion = await prisma.atencionJornada.findUnique({ where: { id: atencionId } });
  if (!atencion || atencion.simulacionId !== simulacionId) throw new Error("Atención no encontrada");
  if (participanteId) {
    const p = await prisma.participanteJornada.findUnique({ where: { id: participanteId } });
    if (!p || p.simulacionId !== simulacionId) throw new Error("Participante no encontrado en esta jornada");
  }
  return prisma.atencionJornada.update({ where: { id: atencionId }, data: { participanteId } });
}

// ---------------------------------------------------------------------------
// Calificar
// ---------------------------------------------------------------------------

/**
 * Califica cada atención con lo que registró el estudiante, guarda los criterios (copia
 * autosuficiente para el reporte) y cierra la jornada: borra pacientes, entregas y puestos.
 */
export async function calificarJornada(simulacionId: string) {
  const simulacion = await prisma.simulacion.findUnique({ where: { id: simulacionId } });
  if (!simulacion || simulacion.estado !== "EN_REVISION") throw new Error("Primero finaliza la jornada");

  const atenciones = await prisma.atencionJornada.findMany({ where: { simulacionId } });
  const ahora = new Date();

  if (simulacion.tipo === "ODONTOLOGIA") {
    for (const atencion of atenciones) {
      if (atencion.pacienteReal) await calificarAtencionReal(atencion.id, ahora);
      else await calificarAtencionOdontologia(atencion.id, ahora);
    }
    await cerrarSimulacion(simulacionId);
    return;
  }

  for (const atencion of atenciones) {
    if (!atencion.pacienteId) continue;
    const paciente = await prisma.paciente.findUnique({
      where: { id: atencion.pacienteId },
      include: { recetas: { include: { medicamento: { select: { id: true, nombre: true, principioActivo: true } } } } },
    });
    if (!paciente) continue;

    let criterios: Criterio[] = [];
    let puntaje: number | null = null;
    {
      const entregas = await prisma.entregaSimulacion.findMany({
        where: { simulacionId, pacienteId: paciente.id },
        include: { medicamento: { select: { nombre: true } }, recetaElectronica: { include: { medicamento: { select: { nombre: true } } } } },
      });
      const r = evaluarAtencionDispensario(
        paciente,
        entregas.map((e) => ({
          recetaElectronicaId: e.recetaElectronicaId,
          medicamentoId: e.medicamentoId,
          medicamentoNombre: e.medicamento?.nombre ?? e.recetaElectronica?.medicamento.nombre ?? "Medicamento",
          cantidad: e.cantidad,
          resultado: e.resultado,
          altoCostoMarcado: e.altoCostoMarcado,
          cuotaModeradora: e.cuotaModeradora,
        })),
        atencion.llamadoEn ?? ahora,
        simulacion.tipo === "FARMACIA" ? "FARMACIA" : "DISPENSARIO"
      );
      criterios = r.criterios;
      puntaje = r.puntaje;
    }

    await prisma.atencionJornada.update({
      where: { id: atencion.id },
      data: { criterios, puntaje, calificadaEn: ahora },
    });
  }

  await cerrarSimulacion(simulacionId);
}

/** Tipo de error de cada línea de la revisión de historia, para agrupar los errores comunes. */
function claveDeLinea(descripcion: string, cumplido: boolean): ClaveCriterio {
  if (descripcion.startsWith("Odontograma:")) {
    if (cumplido) return "ODONTOGRAMA_CORRECTO";
    if (descripcion.includes("faltó")) return "ODONTOGRAMA_FALTANTE";
    if (descripcion.includes("sobra")) return "ODONTOGRAMA_SOBRANTE";
    return "ODONTOGRAMA_CARA";
  }
  if (cumplido) return "HISTORIA_CORRECTA";
  if (descripcion.startsWith("Alerta")) return "ALERTA_MEDICA";
  if (descripcion.startsWith("Antecedentes")) return "ANTECEDENTES";
  if (descripcion.startsWith("Examen")) return "EXAMENES";
  if (descripcion.startsWith("Índice")) return "INDICE_PLACA";
  return "REMISION";
}

/**
 * Califica la historia de una atención de Odontología contra la historia esperada del caso,
 * con la misma revisión de la práctica virtual (odontograma, alerta, antecedentes, exámenes,
 * placa, remisión). Aquí no hay componente de proceso: el interrogatorio y el examen pasan
 * en vivo con el compañero y los observa el docente.
 */
async function calificarAtencionOdontologia(atencionId: string, ahora: Date) {
  const atencion = await prisma.atencionJornada.findUnique({
    where: { id: atencionId },
    include: { casoOdontologia: { include: { escenarioOdontologia: { include: { escenario: true } } } } },
  });
  const caso = atencion?.casoOdontologia?.escenarioOdontologia;
  if (!atencion || !caso) return;

  const esperado = normalizarEsperado(caso.esperado);
  const historia = atencion.historia ? normalizarHistoria(atencion.historia) : historiaVacia();
  const denticion = denticionDe(caso.denticion);
  const resultadoEsperado = caso.escenario.resultadoEsperado;
  const revision = revisarHistoria(esperado, historia, denticion, resultadoEsperado, atencion.remision);
  const etiquetaRemision = (c: string | null) => REMISIONES.find((r) => r.codigo === c)?.etiqueta ?? "sin elegir";

  const criterios: Criterio[] = [
    ...revision.lineas.map((l) => ({ clave: claveDeLinea(l.descripcion, l.cumplido), descripcion: l.descripcion, cumplido: l.cumplido })),
    {
      clave: atencion.remision === resultadoEsperado ? ("HISTORIA_CORRECTA" as const) : ("REMISION" as const),
      descripcion: `Conducta: ${etiquetaRemision(resultadoEsperado)}`,
      cumplido: atencion.remision === resultadoEsperado,
      detalle: atencion.remision === resultadoEsperado ? undefined : `Eligió: ${etiquetaRemision(atencion.remision)}.`,
    },
  ];
  const { proceso, ...contenido } = revision.puntajes;
  void proceso;

  await prisma.atencionJornada.update({
    where: { id: atencion.id },
    data: {
      criterios,
      puntaje: ponderar(contenido),
      calificadaEn: ahora,
      detalle: {
        revisionOdontologia: {
          puntajes: contenido,
          pesos: Object.fromEntries(Object.entries(PESOS).filter(([k]) => k !== "proceso")),
          denticion,
          odontogramaEsperado: esperado.odontograma,
          odontogramaObtenido: historia.odontograma,
          comparacion: revision.odontograma,
          placaEsperada: esperado.placa,
          remisionEsperada: resultadoEsperado,
          remisionObtenida: atencion.remision,
        },
      },
    },
  });
}

/**
 * Paciente real: la nota sale de la rúbrica que llenó el docente (sin rúbrica completa queda
 * sin nota). Al calificar se borran la historia y los datos del compañero: solo queda la
 * nota, la retroalimentación y el nombre abreviado.
 */
async function calificarAtencionReal(atencionId: string, ahora: Date) {
  const atencion = await prisma.atencionJornada.findUnique({ where: { id: atencionId } });
  if (!atencion) return;
  const rubrica = normalizarRubrica(atencion.rubrica);
  const criterios: Criterio[] = CRITERIOS_RUBRICA.map((c) => {
    const nivel = rubrica[c.codigo];
    return {
      clave: nivel === 2 ? ("HISTORIA_CORRECTA" as const) : ("RUBRICA" as ClaveCriterio),
      descripcion: c.etiqueta,
      cumplido: nivel === 2,
      detalle: nivel === undefined ? "Sin calificar." : `${NIVELES.find((n) => n.valor === nivel)?.etiqueta}.`,
    };
  });
  const [nombre, apellido] = atencion.pacienteNombre.split(" ");
  await prisma.atencionJornada.update({
    where: { id: atencion.id },
    data: {
      criterios,
      puntaje: puntajeRubrica(rubrica),
      calificadaEn: ahora,
      historia: Prisma.DbNull,
      pacienteReal: Prisma.DbNull,
      pacienteCedula: "",
      pacienteNombre: apellido ? `${nombre} ${apellido.charAt(0)}.` : nombre,
    },
  });
}

// ---------------------------------------------------------------------------
// Reporte
// ---------------------------------------------------------------------------

export async function reporteJornada(simulacionId: string) {
  const simulacion = await prisma.simulacion.findUnique({
    where: { id: simulacionId },
    include: {
      grupo: { select: { nombre: true } },
      participantes: { orderBy: { nombre: "asc" } },
      atenciones: { orderBy: [{ llamadoEn: "asc" }, { creadoEn: "asc" }], include: { participante: { select: { id: true, nombre: true, invitado: true } } } },
    },
  });
  if (!simulacion) return null;

  const atenciones = simulacion.atenciones.map((a) => ({
    id: a.id,
    ticketCodigo: a.ticketCodigo,
    espacioNumero: a.espacioNumero,
    llamadoEn: a.llamadoEn,
    pacienteNombre: a.pacienteNombre,
    situaciones: a.situaciones,
    participante: a.participante,
    criterios: (a.criterios as Criterio[] | null) ?? [],
    puntaje: a.puntaje,
    detalle: a.detalle,
    cerrada: a.cerradaEn !== null,
    pacienteReal: a.pacienteReal !== null || a.rubrica !== null,
    rubrica: a.rubrica,
    comentario: a.comentario,
  }));

  const porEstudiante = simulacion.participantes.map((p) => {
    const suyas = atenciones.filter((a) => a.participante?.id === p.id && a.puntaje !== null);
    const promedio = suyas.length ? Math.round(suyas.reduce((s, a) => s + (a.puntaje ?? 0), 0) / suyas.length) : null;
    return { id: p.id, nombre: p.nombre, invitado: p.invitado, atenciones: suyas.length, promedio };
  });

  const errores = new Map<string, number>();
  // En cuántas atenciones apareció cada error (no cuántas veces: un odontograma con 5 dientes
  // sin marcar es un solo caso con ese error).
  for (const a of atenciones) {
    for (const clave of new Set(a.criterios.filter((c) => !c.cumplido).map((c) => c.clave))) {
      errores.set(clave, (errores.get(clave) ?? 0) + 1);
    }
  }

  return {
    simulacion: {
      id: simulacion.id,
      nombre: simulacion.nombre,
      tipo: simulacion.tipo,
      estado: simulacion.estado,
      grupo: simulacion.grupo?.nombre ?? null,
      situaciones: simulacion.situaciones,
      pacientesReales: simulacion.pacientesReales,
      abiertaEn: simulacion.abiertaEn,
      cerradaEn: simulacion.cerradaEn,
    },
    atenciones,
    porEstudiante,
    erroresComunes: [...errores.entries()].sort((a, b) => b[1] - a[1]).map(([clave, veces]) => ({ clave, veces })),
  };
}
