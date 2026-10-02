/**
 * Dictado de Odontología en la base de datos: crear el caso que se dicta, la historia de cada
 * estudiante y lo que ve el docente en vivo. La lógica pura está en ./dictado.ts.
 * Ver docs/odontologia.md (Dictado).
 */
import type { Usuario } from "@prisma/client";
import { prisma } from "@/lib/nucleo/prisma";
import { esperadoVacio, normalizarEsperado, normalizarHistoria, type EsperadoOdontologia } from "./historia";
import { normalizarMarcas, ordenarMarcas } from "./odontograma";
import { denticionDe } from "./consultorio";
import { pasosParaCaso } from "./pasos";
import { generarCasoAleatorio, guionDictado, type SeccionesDictado } from "./dictado";

export type OpcionesDictado = {
  secciones: SeccionesDictado;
  /** ALEATORIO: lo arma el sistema. PROPIO: el docente marcó el odontograma (y la historia). EXISTENTE: un caso ya creado. */
  fuente: "ALEATORIO" | "PROPIO" | "EXISTENTE";
  denticion: "PERMANENTE" | "TEMPORAL";
  /** PROPIO: lo que marcó el docente. */
  esperado?: unknown;
  /** EXISTENTE: id del Escenario. */
  escenarioId?: string;
};

/** Título de los casos creados para un dictado: no se listan en Odontología → Casos. */
export const PREFIJO_CASO_DICTADO = "Dictado: ";

/**
 * Devuelve el EscenarioOdontologia que se dicta. Los casos al azar o marcados por el docente
 * se guardan inactivos (no aparecen en la práctica virtual) con un paciente inventado.
 */
export async function crearCasoDictado(nombreJornada: string, o: OpcionesDictado): Promise<string> {
  if (o.fuente === "EXISTENTE") {
    const caso = await prisma.escenarioOdontologia.findFirst({ where: { escenarioId: o.escenarioId ?? "" }, select: { id: true } });
    if (!caso) throw new Error("Ese caso no existe");
    return caso.id;
  }

  const completa = o.secciones === "COMPLETA";
  const generado = generarCasoAleatorio(o.denticion, completa);
  let esperado: EsperadoOdontologia = generado.esperado;
  // El docente puede partir de uno al azar (vista previa) y retocarlo: llega como esperado.
  if (o.fuente === "PROPIO" || (o.fuente === "ALEATORIO" && o.esperado)) {
    const marcado = normalizarEsperado(o.esperado);
    if (marcado.odontograma.length === 0) throw new Error("Marca al menos un hallazgo en el odontograma del caso");
    esperado = completa ? { ...marcado, placa: [] } : { ...esperadoVacio(), odontograma: marcado.odontograma };
  }
  esperado.odontograma = ordenarMarcas(normalizarMarcas(esperado.odontograma));
  esperado.requiereRadiografia = false;

  const modulo = await prisma.modulo.findUnique({ where: { slug: "odontologia" } });
  if (!modulo) throw new Error("El módulo de Odontología no existe");
  const escenario = await prisma.escenario.create({
    data: {
      moduloId: modulo.id,
      titulo: `${PREFIJO_CASO_DICTADO}${nombreJornada}`,
      descripcion: "Caso dictado en clase.",
      resultadoEsperado: "ATENCION_EN_CONSULTA",
      soloTurno: true,
      activo: false,
      pasos: { create: pasosParaCaso(esperado) },
      odontologia: {
        create: {
          denticion: o.denticion,
          motivoConsulta: generado.motivoConsulta,
          relatoAnamnesis: "Caso dictado por el docente.",
          esperado,
          paciente: { create: { ...generado.paciente, fechaNacimiento: new Date(generado.paciente.fechaNacimiento) } },
        },
      },
    },
    include: { odontologia: { select: { id: true } } },
  });
  return escenario.odontologia!.id;
}

/** Datos del caso de un dictado: paciente, dentición y lo esperado. */
async function casoDelDictado(simulacionId: string) {
  const caso = await prisma.casoJornadaOdontologia.findFirst({
    where: { simulacionId },
    orderBy: { orden: "asc" },
    include: { escenarioOdontologia: { include: { paciente: true } } },
  });
  return caso;
}

/** El dictado abierto en el que participa este estudiante (por participante o por grupo). */
export async function dictadoActivo(usuario: Usuario) {
  if (usuario.temporal) return null;
  return prisma.simulacion.findFirst({
    where: {
      tipo: "ODONTOLOGIA",
      dictado: true,
      estado: "ABIERTA",
      OR: [{ participantes: { some: { usuarioId: usuario.id } } }, { grupo: { estudiantes: { some: { id: usuario.id } } } }],
    },
    orderBy: { abiertaEn: "desc" },
    select: { id: true, nombre: true, dictadoSecciones: true, dictadoPausado: true },
  });
}

/**
 * Entra al dictado: devuelve su historia (la crea la primera vez, a su nombre). Si no estaba
 * en la lista de participantes (no era del grupo al crearlo), se agrega.
 */
export async function entrarAlDictado(usuario: Usuario, simulacionId: string) {
  const caso = await casoDelDictado(simulacionId);
  if (!caso) throw new Error("El dictado no tiene caso");
  const existente = await prisma.atencionJornada.findFirst({ where: { simulacionId, usuarioId: usuario.id } });
  const atencion =
    existente ??
    (await (async () => {
      const participante =
        (await prisma.participanteJornada.findFirst({ where: { simulacionId, usuarioId: usuario.id } })) ??
        (await prisma.participanteJornada.create({ data: { simulacionId, usuarioId: usuario.id, nombre: usuario.nombre } }));
      const p = caso.escenarioOdontologia.paciente;
      return prisma.atencionJornada.create({
        data: {
          simulacionId,
          casoOdontologiaId: caso.id,
          usuarioId: usuario.id,
          participanteId: participante.id,
          llamadoEn: new Date(),
          pacienteNombre: [p.nombres, p.primerApellido, p.segundoApellido].filter(Boolean).join(" "),
          pacienteCedula: p.documento,
        },
      });
    })());
  return {
    atencion: { id: atencion.id, historia: atencion.historia ? normalizarHistoria(atencion.historia) : null },
    paciente: caso.escenarioOdontologia.paciente,
    denticion: denticionDe(caso.escenarioOdontologia.denticion),
    motivoConsulta: caso.escenarioOdontologia.motivoConsulta,
  };
}

/** Lo que ve el docente mientras dicta: el guion y cómo va cada estudiante. */
export async function estadoDictado(simulacionId: string) {
  const simulacion = await prisma.simulacion.findUnique({
    where: { id: simulacionId },
    include: {
      participantes: { orderBy: { nombre: "asc" }, select: { id: true, nombre: true, usuarioId: true } },
      atenciones: { select: { id: true, participanteId: true, historia: true, actualizadaEn: true, creadoEn: true } },
    },
  });
  const caso = await casoDelDictado(simulacionId);
  if (!simulacion?.dictado || !caso) return null;
  const secciones = (simulacion.dictadoSecciones ?? "ODONTOGRAMA") as SeccionesDictado;
  const eo = caso.escenarioOdontologia;
  const esperado = normalizarEsperado(eo.esperado);
  return {
    secciones,
    pausado: simulacion.dictadoPausado,
    paciente: eo.paciente,
    denticion: denticionDe(eo.denticion),
    esperado,
    guion: guionDictado(esperado, secciones, eo.motivoConsulta),
    estudiantes: simulacion.participantes.map((p) => {
      const a = simulacion.atenciones.find((x) => x.participanteId === p.id);
      return {
        participanteId: p.id,
        nombre: p.nombre,
        conectado: Boolean(a),
        ultimoCambio: a ? (a.actualizadaEn ?? a.creadoEn) : null,
        marcas: a?.historia ? normalizarHistoria(a.historia).odontograma : [],
      };
    }),
  };
}
