/**
 * Consultorio de la jornada presencial de Odontología (/panel/odontologia): el estudiante
 * busca al paciente (un compañero con tarjeta) por su documento, redacta la historia y el
 * odontograma, y la cierra. Nada de esto le muestra nota ni pistas. Ver docs/odontologia.md.
 */
import type { Usuario } from "@prisma/client";
import { prisma } from "@/lib/nucleo/prisma";
import { normalizarHistoria } from "./historia";
import { denticionDe } from "./consultorio";
import { enumerar, esMenorDeEdad, faltantesAcudiente } from "./acudiente";

/** La jornada de Odontología abierta que le corresponde a esta cuenta (puesto, participante o grupo). */
export async function jornadaActiva(usuario: Usuario) {
  const base = { tipo: "ODONTOLOGIA" as const, estado: "ABIERTA" as const, dictado: false };
  const donde = usuario.sesionTurneroId
    ? { ...base, sesionTurneroId: usuario.sesionTurneroId }
    : usuario.rol === "ESTUDIANTE"
      ? {
          ...base,
          OR: [
            { participantes: { some: { usuarioId: usuario.id } } },
            { grupo: { estudiantes: { some: { id: usuario.id } } } },
          ],
        }
      : base; // docente/coordinación: la más reciente, para poder probar el consultorio
  return prisma.simulacion.findFirst({
    where: donde,
    orderBy: { abiertaEn: "desc" },
    select: { id: true, nombre: true, pacientesReales: true, turnero: { select: { numeroEspacios: true } } },
  });
}

/** Busca, entre los casos de la jornada, al paciente con ese documento (como en admisiones). */
export async function buscarPaciente(simulacionId: string, documento: string) {
  const limpio = documento.replace(/\D/g, "");
  if (!limpio) return null;
  const casos = await prisma.casoJornadaOdontologia.findMany({
    where: { simulacionId },
    include: { escenarioOdontologia: { include: { paciente: true } } },
  });
  const caso = casos.find((c) => c.escenarioOdontologia.paciente.documento.replace(/\D/g, "") === limpio);
  if (!caso) return null;
  return {
    casoId: caso.id,
    paciente: caso.escenarioOdontologia.paciente,
    denticion: denticionDe(caso.escenarioOdontologia.denticion),
  };
}

/** Participante que el docente puso en esa unidad en este momento. */
async function participanteEnUnidad(simulacionId: string, unidad: number) {
  const a = await prisma.asignacionEspacio.findFirst({
    where: { simulacionId, espacioNumero: unidad },
    orderBy: { desde: "desc" },
  });
  return a?.participanteId ?? null;
}

/**
 * Abre la historia de ese paciente en esta unidad, o retoma la que quedó abierta (si se
 * recarga la página o se cae el computador). Queda a nombre de quien está en la unidad.
 */
export async function abrirAtencion(usuario: Usuario, simulacionId: string, casoId: string, unidad: number) {
  const caso = await prisma.casoJornadaOdontologia.findUnique({
    where: { id: casoId },
    include: { escenarioOdontologia: { include: { paciente: true } } },
  });
  if (!caso || caso.simulacionId !== simulacionId) throw new Error("Paciente no encontrado en esta jornada");

  const abierta = await prisma.atencionJornada.findFirst({
    where: { simulacionId, casoOdontologiaId: casoId, espacioNumero: unidad, usuarioId: usuario.id, cerradaEn: null },
    orderBy: { creadoEn: "desc" },
  });
  if (abierta) return abierta;

  const p = caso.escenarioOdontologia.paciente;
  return prisma.atencionJornada.create({
    data: {
      simulacionId,
      casoOdontologiaId: casoId,
      usuarioId: usuario.id,
      espacioNumero: unidad,
      llamadoEn: new Date(),
      participanteId: await participanteEnUnidad(simulacionId, unidad),
      pacienteNombre: [p.nombres, p.primerApellido, p.segundoApellido].filter(Boolean).join(" "),
      pacienteCedula: p.documento,
    },
  });
}

export type PacienteRealDatos = {
  nombres: string;
  primerApellido: string;
  segundoApellido: string | null;
  tipoDocumento: string;
  documento: string;
  sexo: string;
  fechaNacimiento: string;
  eps: string | null;
  ocupacion: string | null;
};

/**
 * Jornada con pacientes reales: el estudiante registra al compañero (datos mínimos, con su
 * consentimiento) y abre su historia; o retoma la que dejó abierta para ese documento.
 */
export async function abrirAtencionReal(
  usuario: Usuario,
  simulacionId: string,
  paciente: PacienteRealDatos,
  denticion: string,
  unidad: number
) {
  const simulacion = await prisma.simulacion.findUnique({ where: { id: simulacionId } });
  if (!simulacion?.pacientesReales) throw new Error("Esta jornada es con casos, no con pacientes reales");
  const abierta = await prisma.atencionJornada.findFirst({
    where: { simulacionId, pacienteCedula: paciente.documento, espacioNumero: unidad, usuarioId: usuario.id, cerradaEn: null },
    orderBy: { creadoEn: "desc" },
  });
  if (abierta) return abierta;
  return prisma.atencionJornada.create({
    data: {
      simulacionId,
      usuarioId: usuario.id,
      espacioNumero: unidad,
      llamadoEn: new Date(),
      participanteId: await participanteEnUnidad(simulacionId, unidad),
      pacienteNombre: [paciente.nombres, paciente.primerApellido, paciente.segundoApellido].filter(Boolean).join(" "),
      pacienteCedula: paciente.documento,
      pacienteReal: paciente,
      denticion: denticionDe(denticion),
    },
  });
}

/** Solo quien la abrió escribe, y solo en una atención abierta de una jornada abierta. */
async function atencionEditable(usuario: Usuario, atencionId: string) {
  const a = await prisma.atencionJornada.findUnique({ where: { id: atencionId }, include: { simulacion: true } });
  if (!a || a.simulacion.tipo !== "ODONTOLOGIA" || a.usuarioId !== usuario.id) throw new Error("Atención no encontrada");
  if (a.simulacion.estado !== "ABIERTA") throw new Error("La jornada ya terminó");
  if (a.cerradaEn) throw new Error("Esta historia ya se cerró");
  if (a.simulacion.dictadoPausado) throw new Error("El docente pausó el dictado");
  return a;
}

export async function guardarHistoria(usuario: Usuario, atencionId: string, historia: unknown) {
  await atencionEditable(usuario, atencionId);
  return prisma.atencionJornada.update({
    where: { id: atencionId },
    data: { historia: normalizarHistoria(historia), actualizadaEn: new Date() },
  });
}

export async function cerrarHistoria(usuario: Usuario, atencionId: string, historia: unknown, remision: string) {
  const atencion = await atencionEditable(usuario, atencionId);
  const h = normalizarHistoria(historia);
  // Un menor no se atiende sin acudiente: sin sus datos y su consentimiento no se cierra.
  const nacimiento = await fechaNacimientoDe(atencion);
  if (nacimiento && esMenorDeEdad(nacimiento)) {
    const faltan = faltantesAcudiente(h.acudiente);
    if (faltan.length) throw new Error(`El paciente es menor de edad: falta ${enumerar(faltan)}`);
  }
  return prisma.atencionJornada.update({
    where: { id: atencionId },
    data: { historia: h, remision, actualizadaEn: new Date(), cerradaEn: new Date() },
  });
}

/** Fecha de nacimiento del paciente de una atención: la del caso o la del compañero registrado. */
async function fechaNacimientoDe(atencion: { casoOdontologiaId: string | null; pacienteReal: unknown }) {
  if (atencion.casoOdontologiaId) {
    const caso = await prisma.casoJornadaOdontologia.findUnique({
      where: { id: atencion.casoOdontologiaId },
      include: { escenarioOdontologia: { include: { paciente: { select: { fechaNacimiento: true } } } } },
    });
    return caso?.escenarioOdontologia.paciente.fechaNacimiento ?? null;
  }
  const real = atencion.pacienteReal as { fechaNacimiento?: string } | null;
  return real?.fechaNacimiento ?? null;
}
