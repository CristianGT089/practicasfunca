/**
 * Cálculo puro de la cuota moderadora — sin tocar la DB — para poder usarlo tanto en el
 * servidor (calcular lo que realmente se cobra) como en el cliente (mostrarle al
 * estudiante una vista previa mientras decide qué marcar). Ver docs/simulacion.md.
 *
 * Importante: acá `esAltoCosto` es lo que decida quien llama — en el flujo real de
 * Simulación es el ESTUDIANTE quien lo marca al leer el diagnóstico, no un valor que el
 * sistema le entrega ya resuelto (ver `lib/simulacion/dispensario.ts`).
 */
import type { CategoriaAfiliado } from "@prisma/client";

// No hay tarifario real conectado (ver investigación en docs/simulacion.md): se usa un
// valor de referencia fijo, simulado, de una atención de baja complejidad para calcular el
// porcentaje de las categorías B y C. Es informativo para la práctica, no un cobro real.
const VALOR_REFERENCIA_ATENCION = 30_000;

export function calcularCuotaModeradora(categoria: CategoriaAfiliado | null, esAltoCosto: boolean): number {
  if (esAltoCosto || !categoria) return 0;
  switch (categoria) {
    case "SUBSIDIADO":
      return 0;
    case "CONTRIBUTIVO_A":
      return 5_000; // tarifa fija aproximada
    case "CONTRIBUTIVO_B":
      return Math.round(VALOR_REFERENCIA_ATENCION * 0.173);
    case "CONTRIBUTIVO_C":
      return Math.round(VALOR_REFERENCIA_ATENCION * 0.23);
    default:
      return 0;
  }
}
