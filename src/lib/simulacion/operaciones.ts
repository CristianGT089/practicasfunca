import { prisma } from "@/lib/nucleo/prisma";
import type { TipoSimulacion } from "@prisma/client";
import { CATEGORIAS_PRIORIDAD_DEFAULT, SERVICIOS_DEFAULT } from "@/lib/turnero/config";
import { abrirSesion, cerrarSesion } from "@/lib/turnero/operaciones";
import { eliminarUsuarios } from "@/lib/nucleo/estudiantesTemporales";
import { generarPacientes, type NombreSolicitado, type PacienteGenerado } from "./generador";
import { planDeSituaciones, PROPORCION_NORMALES_DEFAULT, type CodigoSituacion } from "./situaciones";

const incluirPacientes = {
  pacientes: {
    orderBy: { creadoEn: "asc" as const },
    include: { recetas: { include: { medicamento: { select: { nombre: true, presentacion: true } } } } },
  },
};

/**
 * Cada Simulación es dueña de su propio Turnero — no tiene sentido elegir uno existente:
 * el mostrador libre y una Simulación no deberían compartir cola. Se crea junto con la
 * Simulación, con los servicios/categorías por defecto (se pueden ajustar después desde
 * "Configurar turnero" si hace falta, pero no es el camino esperado).
 */
export async function crearSimulacionBorrador(opts: {
  nombre: string;
  tipo: TipoSimulacion;
  // Uno de los dos: nombres puntuales (y género, si se sabe) o solo una cantidad al azar.
  pacientes?: NombreSolicitado[];
  cantidadPacientes?: number;
  numeroEspacios?: number;
  // Jornada presencial evaluada:
  grupoId?: string | null;
  creadaPorId?: string | null;
  /** Situaciones que el docente quiere practicar. Vacío = modo libre (se sortean). */
  situaciones?: CodigoSituacion[];
  /** Fracción de pacientes sin ninguna situación (0-1). */
  proporcionNormales?: number;
  /** Jornada de Odontología: ids de los casos (Escenario) que se atienden ese día. */
  casosOdontologiaIds?: string[];
}) {
  if (opts.tipo === "ODONTOLOGIA") return crearJornadaOdontologia(opts);

  const solicitud = opts.pacientes && opts.pacientes.length > 0 ? opts.pacientes : opts.cantidadPacientes ?? 0;
  const total = Array.isArray(solicitud) ? solicitud.length : solicitud;
  const situaciones = opts.situaciones ?? [];
  const plan =
    situaciones.length > 0
      ? planDeSituaciones(total, situaciones, opts.proporcionNormales ?? PROPORCION_NORMALES_DEFAULT)
      : undefined;
  const generados = await generarPacientes(solicitud, { plan });

  // Los estudiantes del grupo quedan como participantes; se pueden sumar más en el momento.
  const estudiantesGrupo = opts.grupoId
    ? await prisma.usuario.findMany({
        where: { gruposComoEstudiante: { some: { id: opts.grupoId } }, activo: true },
        orderBy: { nombre: "asc" },
        select: { id: true, nombre: true },
      })
    : [];

  const simulacion = await prisma.simulacion.create({
    data: {
      nombre: opts.nombre,
      tipo: opts.tipo,
      ...(opts.grupoId ? { grupo: { connect: { id: opts.grupoId } } } : {}),
      ...(opts.creadaPorId ? { creadaPor: { connect: { id: opts.creadaPorId } } } : {}),
      situaciones,
      participantes: { create: estudiantesGrupo.map((e) => ({ nombre: e.nombre, usuarioId: e.id })) },
      turnero: {
        create: {
          nombre: `Turnero — ${opts.nombre}`,
          numeroEspacios: opts.numeroEspacios ?? 3,
          servicios: SERVICIOS_DEFAULT,
          categorias: CATEGORIAS_PRIORIDAD_DEFAULT,
        },
      },
      pacientes: { create: generados.map(aDatosPaciente) },
    },
    include: incluirPacientes,
  });

  return simulacion;
}

function aDatosPaciente(p: PacienteGenerado) {
  return {
    nombre: p.nombre,
    cedula: p.cedula,
    edad: p.edad,
    genero: p.genero,
    alergias: p.alergias,
    antecedentes: p.antecedentes,
    diagnostico: p.diagnostico,
    esAltoCosto: p.esAltoCosto,
    categoriaAfiliado: p.categoriaAfiliado,
    tipoRecogida: p.tipoRecogida,
    personaRecogeNombre: p.personaRecogeNombre,
    personaRecogeCedula: p.personaRecogeCedula,
    personaRecogeRelacion: p.personaRecogeRelacion,
    situaciones: p.situaciones,
    recetas: {
      create: p.renglones.map((r) => ({
        medicamentoId: r.medicamentoId,
        medico: r.medico,
        cantidadAutorizada: r.cantidadAutorizada,
        fechaEmision: r.fechaEmision,
        fechaVigencia: r.fechaVigencia,
      })),
    },
  };
}

/** Vuelve a tirar los dados para UN paciente puntual del borrador (antes de abrir). */
export async function regenerarPaciente(simulacionId: string, pacienteId: string) {
  const simulacion = await prisma.simulacion.findUnique({ where: { id: simulacionId } });
  if (!simulacion || simulacion.estado !== "BORRADOR") {
    throw new Error("Solo se puede regenerar mientras la simulación está en borrador");
  }
  const paciente = await prisma.paciente.findUnique({ where: { id: pacienteId } });
  if (!paciente || paciente.simulacionId !== simulacionId) throw new Error("Paciente no encontrado en esta simulación");

  // El nombre (y género) del paciente se conserva — es lo que el admin eligió a propósito
  // o ya se imprimió/mostró; "regenerar" es para el resto de la historia clínica, no para
  // cambiar de quién se trata.
  // Conserva las situaciones que le tocaron (las eligió el docente); en modo libre se
  // vuelven a sortear.
  const [generado] = await generarPacientes(
    [{ nombre: paciente.nombre, genero: paciente.genero }],
    simulacion.situaciones.length > 0 ? { plan: [paciente.situaciones as CodigoSituacion[]] } : {}
  );

  await prisma.recetaElectronica.deleteMany({ where: { pacienteId } });
  await prisma.paciente.update({ where: { id: pacienteId }, data: aDatosPaciente(generado) });

  return prisma.paciente.findUnique({
    where: { id: pacienteId },
    include: { recetas: { include: { medicamento: { select: { nombre: true, presentacion: true } } } } },
  });
}

/** Abre la sesión de turnero de esta simulación: de ahí en adelante se puede sacar turno. */
export async function abrirSimulacion(simulacionId: string) {
  const simulacion = await prisma.simulacion.findUnique({ where: { id: simulacionId } });
  if (!simulacion || simulacion.estado !== "BORRADOR") throw new Error("La simulación ya está abierta o cerrada");

  const sesion = await abrirSesion(simulacion.turneroId);

  await prisma.simulacion.update({
    where: { id: simulacionId },
    data: { estado: "ABIERTA", sesionTurneroId: sesion.id, abiertaEn: new Date() },
  });

  return { sesionTurneroId: sesion.id };
}

/**
 * Cierra el turnero de la simulación (arrastra los puestos temporales de esa sesión, ver
 * lib/turnero/operaciones.ts#cerrarSesion) y borra los pacientes/recetas generados — la
 * próxima simulación arranca desde cero, sin acumular cédulas de práctica.
 */
export async function cerrarSimulacion(simulacionId: string) {
  const simulacion = await prisma.simulacion.findUnique({ where: { id: simulacionId } });
  if (!simulacion) throw new Error("Simulación no encontrada");

  // Primero las entregas: referencian a las cuentas de los puestos, que cerrarSesion borra.
  await prisma.entregaSimulacion.deleteMany({ where: { simulacionId } });

  if (simulacion.sesionTurneroId) {
    const sesion = await prisma.sesionTurnero.findUnique({ where: { id: simulacion.sesionTurneroId } });
    if (sesion?.estado === "ABIERTA") {
      await cerrarSesion(simulacion.sesionTurneroId);
    } else {
      // Ya se cerró al finalizar la jornada: quedan por borrar sus puestos.
      await cerrarSesionYPuestos(simulacion.sesionTurneroId);
    }
  }

  const pacientes = await prisma.paciente.findMany({ where: { simulacionId }, select: { id: true } });
  const pacienteIds = pacientes.map((p) => p.id);

  await prisma.recetaElectronica.deleteMany({ where: { pacienteId: { in: pacienteIds } } });
  await prisma.ticket.updateMany({ where: { pacienteId: { in: pacienteIds } }, data: { pacienteId: null } });
  await prisma.paciente.deleteMany({ where: { id: { in: pacienteIds } } });

  await prisma.simulacion.update({ where: { id: simulacionId }, data: { estado: "CERRADA", cerradaEn: new Date() } });

  // El turnero era exclusivo de esta simulación: se desactiva para que no quede como
  // "turnero disponible" en Control, ya sin ningún uso.
  await prisma.turnero.update({ where: { id: simulacion.turneroId }, data: { activo: false } });
}

export async function obtenerSimulacion(simulacionId: string) {
  return prisma.simulacion.findUnique({
    where: { id: simulacionId },
    include: {
      ...incluirPacientes,
      grupo: { select: { id: true, nombre: true } },
      participantes: { orderBy: { creadoEn: "asc" }, select: { id: true, nombre: true, invitado: true, usuarioId: true } },
      turnero: { select: { numeroEspacios: true } },
      casosOdontologia: {
        orderBy: { orden: "asc" },
        include: {
          escenarioOdontologia: {
            include: { paciente: true, escenario: { select: { titulo: true, resultadoEsperado: true } } },
          },
        },
      },
    },
  });
}

/**
 * Jornada de Odontología: no hay pacientes generados. Los pacientes son casos de la práctica
 * virtual que interpretan compañeros con una tarjeta impresa; el estudiante los busca por
 * documento en el consultorio (/panel/odontologia).
 */
async function crearJornadaOdontologia(opts: {
  nombre: string;
  numeroEspacios?: number;
  grupoId?: string | null;
  creadaPorId?: string | null;
  casosOdontologiaIds?: string[];
}) {
  // Los ids son de los casos (Escenario), como los lista Odontología → Casos.
  const casos = await prisma.escenarioOdontologia.findMany({
    where: { escenarioId: { in: opts.casosOdontologiaIds ?? [] }, escenario: { activo: true } },
    select: { id: true },
  });
  if (casos.length === 0) throw new Error("Elige al menos un caso de odontología");
  const estudiantesGrupo = opts.grupoId
    ? await prisma.usuario.findMany({
        where: { gruposComoEstudiante: { some: { id: opts.grupoId } }, activo: true },
        orderBy: { nombre: "asc" },
        select: { id: true, nombre: true },
      })
    : [];
  return prisma.simulacion.create({
    data: {
      nombre: opts.nombre,
      tipo: "ODONTOLOGIA",
      ...(opts.grupoId ? { grupo: { connect: { id: opts.grupoId } } } : {}),
      ...(opts.creadaPorId ? { creadaPor: { connect: { id: opts.creadaPorId } } } : {}),
      participantes: { create: estudiantesGrupo.map((e) => ({ nombre: e.nombre, usuarioId: e.id })) },
      casosOdontologia: { create: casos.map((c, i) => ({ escenarioOdontologiaId: c.id, orden: i })) },
      turnero: {
        create: {
          nombre: `Unidades — ${opts.nombre}`,
          numeroEspacios: opts.numeroEspacios ?? 3,
          servicios: SERVICIOS_DEFAULT,
          categorias: CATEGORIAS_PRIORIDAD_DEFAULT,
        },
      },
    },
    include: incluirPacientes,
  });
}

async function cerrarSesionYPuestos(sesionId: string) {
  const puestos = await prisma.usuario.findMany({ where: { sesionTurneroId: sesionId }, select: { id: true } });
  await eliminarUsuarios(puestos.map((u) => u.id));
}
