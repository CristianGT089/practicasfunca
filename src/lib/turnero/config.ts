/**
 * Configuración por defecto de un turnero. `servicios` y `categorias` son editables por
 * plantilla (`Turnero`), pero un turnero nuevo arranca con estas listas. Ver docs/turnero.md.
 */
import { z } from "zod";

export type Servicio = {
  codigo: string;
  nombre: string;
  /** Letra que prefija el número de turno, ej. "A" -> "A-047". */
  prefijo: string;
};

export type CategoriaPrioridad = {
  codigo: string;
  nombre: string;
};

export const SERVICIOS_DEFAULT: Servicio[] = [
  { codigo: "MED", nombre: "Entrega de medicamentos", prefijo: "A" },
  { codigo: "ASE", nombre: "Asesoría / información", prefijo: "B" },
  { codigo: "CAJ", nombre: "Pago / caja", prefijo: "C" },
];

export const CATEGORIAS_PRIORIDAD_DEFAULT: CategoriaPrioridad[] = [
  { codigo: "GESTANTE", nombre: "Gestante" },
  { codigo: "ADULTO_MAYOR", nombre: "Adulto mayor" },
  { codigo: "DISCAPACIDAD", nombre: "Persona con discapacidad" },
  { codigo: "PRIMERA_INFANCIA", nombre: "Primera infancia" },
];

export const servicioSchema = z.object({
  codigo: z.string().trim().min(1).max(12),
  nombre: z.string().trim().min(1).max(80),
  prefijo: z.string().trim().min(1).max(3).toUpperCase(),
});

export const categoriaSchema = z.object({
  codigo: z.string().trim().min(1).max(24),
  nombre: z.string().trim().min(1).max(60),
});

/** Parseo tolerante de los JSON guardados en la fila `Turnero`. */
export function leerServicios(valor: unknown): Servicio[] {
  const parsed = z.array(servicioSchema).safeParse(valor);
  return parsed.success && parsed.data.length > 0 ? parsed.data : SERVICIOS_DEFAULT;
}

export function leerCategorias(valor: unknown): CategoriaPrioridad[] {
  const parsed = z.array(categoriaSchema).safeParse(valor);
  return parsed.success ? parsed.data : CATEGORIAS_PRIORIDAD_DEFAULT;
}
