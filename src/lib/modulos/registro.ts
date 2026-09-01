/**
 * Registro central de módulos soportados por el código (más allá de los que existan como
 * fila en la tabla `Modulo`). Cada entrada trae metadata de UI y el vocabulario de
 * acciones/resultados que ese módulo usa, para alimentar los selects del admin sin
 * hardcodear un enum de Postgres.
 */
import { TIPOS_ACCION_FARMACIA, RESULTADOS_FARMACIA } from "./farmacia/acciones";
import { TIPOS_ACCION_ENFERMERIA, RESULTADOS_ENFERMERIA } from "./enfermeria/acciones";
import { TIPOS_ACCION_INFANCIA, RESULTADOS_INFANCIA } from "./primera-infancia/acciones";

export type DefinicionModulo = {
  slug: string;
  nombre: string;
  tiposAccion: readonly string[];
  resultados: Record<string, string>;
};

export const MODULOS: Record<string, DefinicionModulo> = {
  farmacia: {
    slug: "farmacia",
    nombre: "Farmacia",
    tiposAccion: TIPOS_ACCION_FARMACIA,
    resultados: RESULTADOS_FARMACIA,
  },
  enfermeria: {
    slug: "enfermeria",
    nombre: "Enfermería",
    tiposAccion: TIPOS_ACCION_ENFERMERIA,
    resultados: RESULTADOS_ENFERMERIA,
  },
  primera_infancia: {
    slug: "primera_infancia",
    nombre: "Primera Infancia",
    tiposAccion: TIPOS_ACCION_INFANCIA,
    resultados: RESULTADOS_INFANCIA,
  },
};

export function obtenerDefinicionModulo(slug: string): DefinicionModulo | undefined {
  return MODULOS[slug];
}
