import { vistaDe, type Leccion, type ModoLeccion } from "../tipos";
import { TICS_1 } from "./tics1";
import { TICS_2 } from "./tics2";

/** Todas las lecciones disponibles, en orden. Para agregar una: crear el archivo y sumarla aquí. */
const TODAS: Leccion[] = [TICS_1, TICS_2];

/** Versión en vivo de cada lección (la que proyecta el docente). */
export const LECCIONES: Leccion[] = TODAS.map((l) => vistaDe(l, "vivo"));
const RITMO: Leccion[] = TODAS.map((l) => vistaDe(l, "ritmo"));

/**
 * La lección en el modo pedido. "todo" = con las diapositivas de los dos modos (para validar los
 * ids de actividades y preguntas, que comparten el progreso entre modos).
 */
export function leccionPorSlug(slug: string | null | undefined, modo: ModoLeccion | "todo" = "vivo"): Leccion | null {
  const lista = modo === "vivo" ? LECCIONES : modo === "ritmo" ? RITMO : TODAS;
  return lista.find((l) => l.slug === slug) ?? null;
}
