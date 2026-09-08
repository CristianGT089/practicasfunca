/**
 * Registro server-side de las implementaciones de `ModuloSimulacion`. Vive aparte de
 * `registro.ts` (metadata pura, apta para el cliente) porque cada `simulacion.ts` arrastra
 * `@/lib/nucleo/prisma` y reglas de dominio que solo deben correr en el servidor.
 */
import type { ModuloSimulacion } from "./contrato";
import { simulacionFarmacia } from "./farmacia/simulacion";
import { simulacionEnfermeria } from "./enfermeria/simulacion";
import { simulacionPrimeraInfancia } from "./primera-infancia/simulacion";

const SIMULACIONES: Record<string, ModuloSimulacion> = {
  farmacia: simulacionFarmacia,
  enfermeria: simulacionEnfermeria,
  primera_infancia: simulacionPrimeraInfancia,
};

export function obtenerModuloSimulacion(slug: string): ModuloSimulacion | undefined {
  return SIMULACIONES[slug];
}
