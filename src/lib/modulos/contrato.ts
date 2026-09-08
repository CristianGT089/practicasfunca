/**
 * Contrato que implementa cada módulo para engancharse al motor genérico de intentos.
 *
 * El núcleo (endpoints de `api/intentos/*`) no sabe nada de farmacia/enfermería/primera
 * infancia: solo pide `obtenerModuloSimulacion(slug)` y delega en él la evaluación de
 * acciones en tiempo real. Agregar un módulo = crear su `simulacion.ts` y registrarlo.
 */
import { Prisma, type Accion, type ModoJuego, type PrismaClient } from "@prisma/client";

/**
 * `include` compartido para traer un `Intento` con su escenario y todas las extensiones
 * de módulo. Se define una sola vez para que el tipo derivado sea idéntico en cada
 * endpoint y en cada implementación de módulo.
 */
export const intentoConEscenarioInclude = {
  escenario: {
    include: {
      modulo: true,
      pasos: true,
      farmacia: { include: { paciente: true } },
      enfermeria: { include: { paciente: true, ordenMedica: true } },
      infancia: { include: { nino: { include: { registrosCrecimiento: { orderBy: { fecha: "asc" } } } } } },
    },
  },
  acciones: { orderBy: { creadoEn: "asc" } },
} satisfies Prisma.IntentoInclude;

export type IntentoConEscenario = Prisma.IntentoGetPayload<{
  include: typeof intentoConEscenarioInclude;
}>;

export type EscenarioConExtensiones = IntentoConEscenario["escenario"];

export type ResultadoEvaluacion = {
  /** Razones por las que la acción es clínicamente peligrosa (vacío = sin peligro). */
  peligros: string[];
  /** True si, en modo difícil, la acción no corresponde a ningún paso del checklist. */
  fueraDeChecklist: boolean;
};

export type ContextoEvaluacion = {
  tipo: string;
  payload: Record<string, unknown> | null | undefined;
  modo: ModoJuego;
  escenario: EscenarioConExtensiones;
  accionesPrevias: Accion[];
  prisma: PrismaClient;
};

export interface ModuloSimulacion {
  slug: string;
  /** Evalúa en caliente si una acción del estudiante es un error (cuesta un corazón). */
  evaluarAccion(ctx: ContextoEvaluacion): Promise<ResultadoEvaluacion>;
  /**
   * Proyección del escenario segura para enviar al cliente en la carga inicial: nunca
   * incluye `pasos` (el checklist), `descripcionDificil`, ni datos del paciente que solo
   * deben revelarse cuando el estudiante los pide explícitamente dentro del caso.
   */
  proyectarEscenario(escenario: EscenarioConExtensiones, modo: ModoJuego): Record<string, unknown>;
  /**
   * Datos extra que el "software" simulado del módulo necesita en la carga inicial
   * (ej. Farmacia devuelve el catálogo de medicamentos). Opcional.
   */
  cargarDatosIniciales?(prisma: PrismaClient): Promise<Record<string, unknown>>;
}

export const SIN_PELIGRO: ResultadoEvaluacion = { peligros: [], fueraDeChecklist: false };

/**
 * Campos del escenario comunes a todos los módulos, ya saneados: se quitan el checklist
 * (`pasos`), la versión difícil de la descripción y todas las extensiones de módulo, y se
 * resuelve `descripcion` según el modo de juego.
 */
export function escenarioBaseSeguro(escenario: EscenarioConExtensiones, modo: ModoJuego) {
  const { descripcionDificil, pasos, farmacia, enfermeria, infancia, ...base } = escenario;
  void pasos;
  void farmacia;
  void enfermeria;
  void infancia;
  return {
    ...base,
    descripcion: modo === "DIFICIL" && descripcionDificil ? descripcionDificil : base.descripcion,
  };
}
