/**
 * Registro central de módulos soportados por el código (más allá de los que existan como
 * fila en la tabla `Modulo`). Cada entrada trae metadata de UI y el vocabulario de
 * acciones/resultados que ese módulo usa, para alimentar los selects del admin sin
 * hardcodear un enum de Postgres.
 */
import { TIPOS_ACCION_FARMACIA, RESULTADOS_FARMACIA } from "./farmacia/acciones";
import { TIPOS_ACCION_ENFERMERIA, RESULTADOS_ENFERMERIA } from "./enfermeria/acciones";
import { TIPOS_ACCION_INFANCIA, RESULTADOS_INFANCIA } from "./primera-infancia/acciones";

export type SeccionAdmin = { href: string; label: string };

export type DefinicionModulo = {
  slug: string;
  nombre: string;
  tiposAccion: readonly string[];
  resultados: Record<string, string>;
  /** Pestañas del panel de administración propias de este módulo (datos maestros). */
  seccionesAdmin: SeccionAdmin[];
};

export const MODULOS: Record<string, DefinicionModulo> = {
  farmacia: {
    slug: "farmacia",
    nombre: "Farmacia",
    tiposAccion: TIPOS_ACCION_FARMACIA,
    resultados: RESULTADOS_FARMACIA,
    seccionesAdmin: [
      { href: "/admin/modulos/farmacia/medicamentos", label: "Medicamentos" },
      { href: "/admin/modulos/farmacia/catalogo-real", label: "Catálogo real" },
      { href: "/admin/modulos/farmacia/pacientes", label: "Pacientes" },
    ],
  },
  enfermeria: {
    slug: "enfermeria",
    nombre: "Enfermería",
    tiposAccion: TIPOS_ACCION_ENFERMERIA,
    resultados: RESULTADOS_ENFERMERIA,
    seccionesAdmin: [],
  },
  primera_infancia: {
    slug: "primera_infancia",
    nombre: "Primera Infancia",
    tiposAccion: TIPOS_ACCION_INFANCIA,
    resultados: RESULTADOS_INFANCIA,
    seccionesAdmin: [],
  },
  // Módulo-herramienta (tipo SIMULADOR): no usa el motor de escenarios, por eso no aporta
  // vocabulario de acciones; sí tiene datos maestros propios que administrar.
  dispensacion: {
    slug: "dispensacion",
    nombre: "Dispensación",
    tiposAccion: [],
    resultados: {},
    seccionesAdmin: [
      { href: "/admin/modulos/dispensacion/casos", label: "Casos" },
      { href: "/admin/modulos/dispensacion/autorizaciones", label: "Autorizaciones" },
    ],
  },
};

export function obtenerDefinicionModulo(slug: string): DefinicionModulo | undefined {
  return MODULOS[slug];
}

export type GrupoAdminModulo = { slug: string; nombre: string; secciones: SeccionAdmin[] };

/**
 * Secciones de admin agrupadas por módulo, solo para los módulos que aportan alguna.
 * El nav de admin las muestra como un menú desplegable por módulo (en vez de una pestaña
 * por sección, que desbordaba la barra).
 */
export function gruposAdminModulos(): GrupoAdminModulo[] {
  return Object.values(MODULOS)
    .filter((m) => m.seccionesAdmin.length > 0)
    .map((m) => ({ slug: m.slug, nombre: m.nombre, secciones: m.seccionesAdmin }));
}
