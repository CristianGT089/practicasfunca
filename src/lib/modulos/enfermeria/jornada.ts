/**
 * Estación de enfermería de la jornada presencial "Ronda de medicamentos" (/panel/enfermeria):
 * el estudiante busca al paciente (un compañero con manilla) por el documento, revisa el
 * kárdex y diligencia la hoja de enfermería. Sin nota ni pistas en pantalla: califica el
 * sistema al final. Ver docs/enfermeria.md.
 */
import type { Usuario } from "@prisma/client";
import { prisma } from "@/lib/nucleo/prisma";
import { hojaVacia, medicamentoVacio, normalizarHoja, type HojaEnfermeria } from "./hoja";
import { casoRonda, vigenciaOrden, type CasoRonda } from "./ronda";

/** La ronda abierta que le corresponde a esta cuenta (estación, participante o grupo). */
export async function jornadaActiva(usuario: Usuario) {
  const base = { tipo: "ENFERMERIA" as const, estado: "ABIERTA" as const };
  const donde = usuario.sesionTurneroId
    ? { ...base, sesionTurneroId: usuario.sesionTurneroId }
    : usuario.rol === "ESTUDIANTE"
      ? { ...base, OR: [{ participantes: { some: { usuarioId: usuario.id } } }, { grupo: { estudiantes: { some: { id: usuario.id } } } }] }
      : base;
  return prisma.simulacion.findFirst({
    where: donde,
    orderBy: { abiertaEn: "desc" },
    select: { id: true, nombre: true, situaciones: true, abiertaEn: true, turnero: { select: { numeroEspacios: true } } },
  });
}

/** Lo que ve el estudiante del paciente: datos, manilla y kárdex (con fechas de vigencia ya resueltas). */
export function fichaDePaciente(c: CasoRonda, diaRonda: Date) {
  return {
    codigo: c.codigo,
    paciente: c.paciente,
    horaRonda: c.horaRonda,
    calculo: c.calculo ? { clave: c.calculo.clave, pregunta: c.calculo.pregunta, unidad: c.calculo.unidad } : null,
    ordenes: c.ordenes.map((o) => {
      const v = vigenciaOrden(o, diaRonda);
      return {
        medicamento: o.medicamento,
        dosis: o.dosis,
        via: o.via,
        frecuencia: o.frecuencia,
        hora: o.hora,
        medico: o.medico,
        firmada: o.firmada,
        emitida: v.emitida.toISOString(),
        vence: v.vence.toISOString(),
        ultimaAdministracion: o.ultimaAdministracion ?? null,
        nota: o.nota ?? null,
      };
    }),
  };
}

const soloDigitos = (t: string) => t.replace(/\D/g, "");

/** Busca, entre los casos de la ronda, al paciente con ese documento (el de la manilla). */
export function buscarPaciente(codigos: string[], documento: string) {
  const limpio = soloDigitos(documento);
  if (!limpio) return null;
  return codigos.map((c) => casoRonda(c)).find((c) => c && soloDigitos(c.paciente.documento) === limpio) ?? null;
}

/** Hoja inicial: identificación desde el kárdex y una fila por cada orden médica (sin decidir). */
export function hojaInicial(c: CasoRonda): HojaEnfermeria {
  return {
    ...hojaVacia(),
    servicio: c.paciente.servicio,
    cama: c.paciente.cama,
    diagnosticoMedico: c.paciente.diagnostico,
    medicamentos: c.ordenes.map((o) => ({
      ...medicamentoVacio(),
      medicamento: o.medicamento,
      dosis: o.dosis,
      via: o.via,
      frecuencia: o.frecuencia,
      hora: /^\d{2}:\d{2}$/.test(o.hora) ? o.hora : "",
    })),
  };
}

async function participanteEnEstacion(simulacionId: string, estacion: number) {
  const a = await prisma.asignacionEspacio.findFirst({ where: { simulacionId, espacioNumero: estacion }, orderBy: { desde: "desc" } });
  return a?.participanteId ?? null;
}

/**
 * Abre la hoja de ese paciente en esta estación, o retoma la que quedó abierta. Queda a
 * nombre de quien el docente puso en la estación en ese momento.
 */
export async function abrirAtencion(usuario: Usuario, simulacionId: string, codigo: string, estacion: number) {
  const simulacion = await prisma.simulacion.findUnique({ where: { id: simulacionId } });
  const caso = casoRonda(codigo);
  if (!simulacion || simulacion.tipo !== "ENFERMERIA" || !caso || !simulacion.situaciones.includes(codigo)) {
    throw new Error("Paciente no encontrado en esta ronda");
  }
  const abierta = await prisma.atencionJornada.findFirst({
    where: { simulacionId, situaciones: { has: codigo }, espacioNumero: estacion, usuarioId: usuario.id, cerradaEn: null },
    orderBy: { creadoEn: "desc" },
  });
  if (abierta) return abierta;
  return prisma.atencionJornada.create({
    data: {
      simulacionId,
      usuarioId: usuario.id,
      espacioNumero: estacion,
      llamadoEn: new Date(),
      participanteId: await participanteEnEstacion(simulacionId, estacion),
      pacienteNombre: caso.paciente.nombre,
      pacienteCedula: caso.paciente.documento,
      situaciones: [codigo],
      historia: hojaInicial(caso),
    },
  });
}

async function atencionEditable(usuario: Usuario, atencionId: string) {
  const a = await prisma.atencionJornada.findUnique({ where: { id: atencionId }, include: { simulacion: true } });
  if (!a || a.simulacion.tipo !== "ENFERMERIA" || a.usuarioId !== usuario.id) throw new Error("Atención no encontrada");
  if (a.simulacion.estado !== "ABIERTA") throw new Error("La ronda ya terminó");
  if (a.cerradaEn) throw new Error("Esta hoja ya se cerró");
  return a;
}

export async function guardarHoja(usuario: Usuario, atencionId: string, hoja: unknown) {
  await atencionEditable(usuario, atencionId);
  return prisma.atencionJornada.update({ where: { id: atencionId }, data: { historia: normalizarHoja(hoja), actualizadaEn: new Date() } });
}

export async function cerrarHoja(usuario: Usuario, atencionId: string, hoja: unknown) {
  await atencionEditable(usuario, atencionId);
  return prisma.atencionJornada.update({
    where: { id: atencionId },
    data: { historia: normalizarHoja(hoja), actualizadaEn: new Date(), cerradaEn: new Date() },
  });
}
