import { prisma } from "@/lib/nucleo/prisma";
import type { TipoSimulacion } from "@prisma/client";
import { CATEGORIAS_PRIORIDAD_DEFAULT, SERVICIOS_DEFAULT } from "@/lib/turnero/config";
import { abrirSesion, cerrarSesion, iniciarSesionPreparada, prepararSesion } from "@/lib/turnero/operaciones";
import { crearPuestosTemporales, eliminarUsuarios } from "@/lib/nucleo/estudiantesTemporales";
import { generarPassword } from "@/lib/nucleo/passwords";
import { cifrar, descifrar } from "@/lib/nucleo/cifrado";
import bcrypt from "bcryptjs";
import { MODULO_DE_TIPO_JORNADA } from "./permisos";
import { generarPacientes, type PacienteGenerado } from "./generador";
import { crearCasoDictado, type OpcionesDictado } from "@/lib/modulos/odontologia/dictadoJornada";
import { casoRonda } from "@/lib/modulos/enfermeria/ronda";
import { planAlAzar, planDeSituaciones, PROPORCION_NORMALES_DEFAULT, type CodigoSituacion } from "./situaciones";

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
export async function crearSimulacionBorrador(opts: OpcionesBorrador) {
  const simulacion = await crearBorrador(opts);
  await prepararPuestos(simulacion.id, opts.creadaPorId ?? null);
  return simulacion;
}

type OpcionesBorrador = {
  nombre: string;
  tipo: TipoSimulacion;
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
  /** Jornada de Odontología con compañeros examinados de verdad (sin casos). */
  pacientesReales?: boolean;
  /** Dictado de Odontología: el docente lee un caso y todos lo registran a la vez. */
  dictado?: OpcionesDictado | null;
  /** Ronda de medicamentos de Enfermería: códigos de los casos (lib/modulos/enfermeria/ronda.ts). */
  casosEnfermeria?: string[];
};

async function crearBorrador(opts: OpcionesBorrador) {
  if (opts.tipo === "ODONTOLOGIA") return crearJornadaOdontologia(opts);
  if (opts.tipo === "ENFERMERIA") return crearJornadaEnfermeria(opts);

  // Un caso por estudiante del grupo, con su nombre: cada uno lleva su fórmula a la
  // ventanilla cuando no está atendiendo. Los estudiantes quedan además como participantes
  // (se pueden sumar invitados en el momento, pero sin caso propio).
  const estudiantesGrupo = opts.grupoId
    ? await prisma.usuario.findMany({
        where: { gruposComoEstudiante: { some: { id: opts.grupoId } }, activo: true, temporal: false },
        orderBy: { nombre: "asc" },
        select: { id: true, nombre: true, genero: true },
      })
    : [];
  if (!opts.grupoId) throw new Error("Elige el grupo que hace la jornada: cada caso se arma con uno de sus estudiantes");
  if (estudiantesGrupo.length === 0) throw new Error("El grupo no tiene estudiantes: cada caso se arma con uno de ellos");

  const total = estudiantesGrupo.length;
  const situaciones = opts.situaciones ?? [];
  const plan =
    situaciones.length > 0
      ? planDeSituaciones(total, situaciones, opts.proporcionNormales ?? PROPORCION_NORMALES_DEFAULT)
      : planAlAzar(total, opts.tipo);
  const generados = await generarPacientes(
    estudiantesGrupo.map((e) => ({ estudianteId: e.id, nombre: e.nombre, genero: e.genero })),
    plan
  );

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
    tipoDocumento: p.tipoDocumento,
    edad: p.edad,
    ...(p.estudianteId ? { estudiante: { connect: { id: p.estudianteId } } } : {}),
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

  // Se conservan el estudiante que lleva el caso y sus situaciones (las eligió el docente o
  // ya se sortearon): "regenerar" es para el resto de la historia clínica y la fórmula.
  const estudiante = paciente.estudianteId
    ? await prisma.usuario.findUnique({ where: { id: paciente.estudianteId }, select: { id: true, nombre: true, genero: true } })
    : null;
  const interprete = estudiante
    ? { estudianteId: estudiante.id, nombre: estudiante.nombre, genero: estudiante.genero }
    : { estudianteId: null, nombre: paciente.personaRecogeNombre ?? paciente.nombre, genero: paciente.genero };
  const [generado] = await generarPacientes([interprete], [paciente.situaciones as CodigoSituacion[]]);

  await prisma.recetaElectronica.deleteMany({ where: { pacienteId } });
  await prisma.paciente.update({ where: { id: pacienteId }, data: aDatosPaciente(generado) });

  return prisma.paciente.findUnique({
    where: { id: pacienteId },
    include: { recetas: { include: { medicamento: { select: { nombre: true, presentacion: true } } } } },
  });
}

/** Pantalla a la que entra cada computador según el tipo de jornada, y cómo se llama su espacio. */
const PUESTOS_POR_TIPO = {
  FARMACIA: { ruta: "/panel/catalogo", prefijo: "Ventanilla" },
  DISPENSARIO: { ruta: "/panel/dispensacion", prefijo: "Ventanilla" },
  ODONTOLOGIA: { ruta: "/panel/odontologia", prefijo: "Unidad" },
  ENFERMERIA: { ruta: "/panel/enfermeria", prefijo: "Estación" },
} as const;

/**
 * Deja la jornada lista desde el borrador, para que el docente lo tenga todo antes de
 * iniciar: el turnero en estado PREPARADA (con sus espacios, pero sin turnos) y una cuenta
 * por espacio ("Ventanilla 1", "Unidad 2"...) que entra directo a su pantalla y ya sabe qué
 * espacio es. Los computadores pueden iniciar sesión antes de clase: esperan hasta que la
 * jornada empieza. El dictado no usa computadores de puesto.
 */
async function prepararPuestos(simulacionId: string, creadoPorId: string | null) {
  const simulacion = await prisma.simulacion.findUnique({ where: { id: simulacionId } });
  if (!simulacion || simulacion.dictado || simulacion.sesionTurneroId) return;
  const sesion = await prepararSesion(simulacion.turneroId, PUESTOS_POR_TIPO[simulacion.tipo].prefijo);
  await prisma.simulacion.update({ where: { id: simulacionId }, data: { sesionTurneroId: sesion.id } });
  await crearCuentasDeEspacios(simulacionId, sesion.id, creadoPorId);
}

async function crearCuentasDeEspacios(simulacionId: string, sesionTurneroId: string, creadoPorId: string | null | undefined) {
  const simulacion = await prisma.simulacion.findUniqueOrThrow({ where: { id: simulacionId }, include: { turnero: true } });
  const modulo = await prisma.modulo.findUnique({ where: { slug: MODULO_DE_TIPO_JORNADA[simulacion.tipo] } });
  if (!modulo) return [];
  const config = PUESTOS_POR_TIPO[simulacion.tipo];
  return crearPuestosTemporales({
    moduloIds: [modulo.id],
    rutaDirecta: config.ruta,
    sesionTurneroId,
    cantidad: simulacion.turnero.numeroEspacios,
    prefijo: config.prefijo,
    creadoPorId,
    numerarEspacios: true,
  });
}

/**
 * Inicia la jornada: el turnero preparado empieza a funcionar y los computadores que ya
 * habían entrado se activan solos. Las jornadas creadas antes de preparar los puestos en el
 * borrador crean aquí su turnero y sus cuentas, y devuelven las contraseñas.
 */
export async function abrirSimulacion(simulacionId: string, creadoPorId?: string | null) {
  const simulacion = await prisma.simulacion.findUnique({ where: { id: simulacionId } });
  if (!simulacion || simulacion.estado !== "BORRADOR") throw new Error("La simulación ya está abierta o cerrada");

  // Dictado: cada estudiante entra con su propia cuenta; no hay turnos ni computadores.
  if (simulacion.dictado) {
    await prisma.simulacion.update({ where: { id: simulacionId }, data: { estado: "ABIERTA", abiertaEn: new Date() } });
    return { sesionTurneroId: null, cuentas: [] };
  }

  let sesionId = simulacion.sesionTurneroId;
  let cuentas: { nombre: string; usuario: string; password: string }[] = [];
  if (!sesionId) {
    sesionId = (await abrirSesion(simulacion.turneroId)).id;
    cuentas = await crearCuentasDeEspacios(simulacionId, sesionId, creadoPorId);
  }

  await prisma.simulacion.update({
    where: { id: simulacionId },
    data: { estado: "ABIERTA", sesionTurneroId: sesionId, abiertaEn: new Date() },
  });
  if (simulacion.sesionTurneroId) await iniciarSesionPreparada(sesionId);

  return { sesionTurneroId: sesionId, cuentas };
}

/**
 * Las contraseñas actuales de las cuentas de los computadores (descifradas), para volver a
 * mostrarlas. Quien llama ya verificó la contraseña del docente.
 */
export async function verCredencialesPuestos(simulacionId: string) {
  const simulacion = await prisma.simulacion.findUnique({ where: { id: simulacionId } });
  if (!simulacion?.sesionTurneroId || (simulacion.estado !== "BORRADOR" && simulacion.estado !== "ABIERTA")) {
    throw new Error("La jornada ya terminó: sus computadores no tienen cuenta");
  }
  const puestos = await prisma.usuario.findMany({
    where: { sesionTurneroId: simulacion.sesionTurneroId },
    orderBy: [{ espacioNumero: "asc" }, { nombre: "asc" }],
  });
  return puestos.map((p) => ({
    nombre: p.nombre,
    usuario: p.usuario,
    // null = cuenta creada antes de guardar contraseñas cifradas: hay que generar una nueva.
    password: p.passwordCifrada ? descifrar(p.passwordCifrada) : null,
  }));
}

/**
 * Nuevas contraseñas para las cuentas de los computadores de la jornada (por si se
 * perdieron las primeras). Los computadores que ya entraron siguen dentro: la sesión no
 * depende de la contraseña.
 */
export async function regenerarCredencialesPuestos(simulacionId: string) {
  const simulacion = await prisma.simulacion.findUnique({ where: { id: simulacionId } });
  if (!simulacion?.sesionTurneroId || (simulacion.estado !== "BORRADOR" && simulacion.estado !== "ABIERTA")) {
    throw new Error("La jornada ya terminó: sus computadores no tienen cuenta");
  }
  const puestos = await prisma.usuario.findMany({
    where: { sesionTurneroId: simulacion.sesionTurneroId },
    orderBy: [{ espacioNumero: "asc" }, { nombre: "asc" }],
  });
  const cuentas: { nombre: string; usuario: string; password: string }[] = [];
  for (const p of puestos) {
    const password = generarPassword();
    await prisma.usuario.update({
      where: { id: p.id },
      data: { passwordHash: await bcrypt.hash(password, 10), passwordCifrada: cifrar(password) },
    });
    cuentas.push({ nombre: p.nombre, usuario: p.usuario, password });
  }
  return cuentas;
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
  pacientesReales?: boolean;
  dictado?: OpcionesDictado | null;
}) {
  if (opts.dictado) return crearDictado({ ...opts, dictado: opts.dictado });
  // Los ids son de los casos (Escenario), como los lista Odontología → Casos. Con pacientes
  // reales no hay casos: el estudiante registra al compañero que examina.
  const casos = opts.pacientesReales
    ? []
    : await prisma.escenarioOdontologia.findMany({
        where: { escenarioId: { in: opts.casosOdontologiaIds ?? [] }, escenario: { activo: true } },
        select: { id: true },
      });
  if (!opts.pacientesReales && casos.length === 0) throw new Error("Elige al menos un caso de odontología");
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
      pacientesReales: opts.pacientesReales ?? false,
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

/**
 * Dictado: un solo caso (al azar, marcado por el docente o uno existente) y los estudiantes
 * del grupo como participantes. Cada uno abre su historia al entrar.
 */
async function crearDictado(opts: { nombre: string; grupoId?: string | null; creadaPorId?: string | null; dictado: OpcionesDictado }) {
  const escenarioOdontologiaId = await crearCasoDictado(opts.nombre, opts.dictado);
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
      dictado: true,
      dictadoSecciones: opts.dictado.secciones,
      ...(opts.grupoId ? { grupo: { connect: { id: opts.grupoId } } } : {}),
      ...(opts.creadaPorId ? { creadaPor: { connect: { id: opts.creadaPorId } } } : {}),
      participantes: { create: estudiantesGrupo.map((e) => ({ nombre: e.nombre, usuarioId: e.id })) },
      casosOdontologia: { create: [{ escenarioOdontologiaId, orden: 0 }] },
      turnero: {
        create: {
          nombre: `Dictado — ${opts.nombre}`,
          numeroEspacios: 1,
          servicios: SERVICIOS_DEFAULT,
          categorias: CATEGORIAS_PRIORIDAD_DEFAULT,
        },
      },
    },
    include: incluirPacientes,
  });
}

/**
 * Ronda de medicamentos de Enfermería: los casos son del catálogo en código; la jornada
 * guarda sus códigos en `situaciones`. Cada estación es un computador con su cuenta.
 */
async function crearJornadaEnfermeria(opts: {
  nombre: string;
  numeroEspacios?: number;
  grupoId?: string | null;
  creadaPorId?: string | null;
  casosEnfermeria?: string[];
}) {
  const codigos = [...new Set(opts.casosEnfermeria ?? [])].filter((c) => casoRonda(c));
  if (codigos.length === 0) throw new Error("Elige al menos un caso de la ronda");
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
      tipo: "ENFERMERIA",
      situaciones: codigos,
      ...(opts.grupoId ? { grupo: { connect: { id: opts.grupoId } } } : {}),
      ...(opts.creadaPorId ? { creadaPor: { connect: { id: opts.creadaPorId } } } : {}),
      participantes: { create: estudiantesGrupo.map((e) => ({ nombre: e.nombre, usuarioId: e.id })) },
      turnero: {
        create: {
          nombre: `Estaciones — ${opts.nombre}`,
          numeroEspacios: opts.numeroEspacios ?? 1,
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
  // Un borrador descartado deja su sesión PREPARADA: se cierra para que no quede colgando.
  await prisma.sesionTurnero.updateMany({ where: { id: sesionId, estado: "PREPARADA" }, data: { estado: "CERRADA", cerradaEn: new Date() } });
}
