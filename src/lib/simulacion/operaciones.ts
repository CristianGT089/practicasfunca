import { prisma } from "@/lib/nucleo/prisma";
import type { TipoSimulacion } from "@prisma/client";
import { CATEGORIAS_PRIORIDAD_DEFAULT, SERVICIOS_DEFAULT } from "@/lib/turnero/config";
import { abrirSesion, cerrarSesion } from "@/lib/turnero/operaciones";
import { generarPacientes, type NombreSolicitado, type PacienteGenerado } from "./generador";

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
}) {
  const generados = await generarPacientes(
    opts.pacientes && opts.pacientes.length > 0 ? opts.pacientes : opts.cantidadPacientes ?? 0
  );

  const simulacion = await prisma.simulacion.create({
    data: {
      nombre: opts.nombre,
      tipo: opts.tipo,
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
  const [generado] = await generarPacientes([{ nombre: paciente.nombre, genero: paciente.genero }]);

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

  if (simulacion.sesionTurneroId) {
    await cerrarSesion(simulacion.sesionTurneroId);
  }

  const pacientes = await prisma.paciente.findMany({ where: { simulacionId }, select: { id: true } });
  const pacienteIds = pacientes.map((p) => p.id);

  await prisma.entregaSimulacion.deleteMany({ where: { simulacionId } });
  await prisma.recetaElectronica.deleteMany({ where: { pacienteId: { in: pacienteIds } } });
  await prisma.ticket.updateMany({ where: { pacienteId: { in: pacienteIds } }, data: { pacienteId: null } });
  await prisma.paciente.deleteMany({ where: { id: { in: pacienteIds } } });

  await prisma.simulacion.update({ where: { id: simulacionId }, data: { estado: "CERRADA", cerradaEn: new Date() } });

  // El turnero era exclusivo de esta simulación: se desactiva para que no quede como
  // "turnero disponible" en Control, ya sin ningún uso.
  await prisma.turnero.update({ where: { id: simulacion.turneroId }, data: { activo: false } });
}

export async function obtenerSimulacion(simulacionId: string) {
  return prisma.simulacion.findUnique({ where: { id: simulacionId }, include: incluirPacientes });
}
