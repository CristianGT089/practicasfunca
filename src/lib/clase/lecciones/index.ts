import type { Leccion } from "../tipos";
import { TICS_1 } from "./tics1";

/** Todas las lecciones disponibles, en orden. Para agregar una: crear el archivo y sumarla aquí. */
export const LECCIONES: Leccion[] = [TICS_1];

export function leccionPorSlug(slug: string | null | undefined): Leccion | null {
  return LECCIONES.find((l) => l.slug === slug) ?? null;
}
