import { Accion, PasoEsperado } from "@prisma/client";

/**
 * Compara un conjunto de parámetros esperados contra el payload real de una acción,
 * con soporte especial para `motivos`: se exige que todos los motivos esperados estén
 * presentes en el payload (subconjunto), no una igualdad exacta de arreglo.
 *
 * Genérico: usado por el checklist de cualquier módulo, no sabe nada de farmacia/enfermería.
 */
export function coincideParametrosConMotivos(
  esperado: Record<string, unknown> | null | undefined,
  payload: Record<string, unknown> | null | undefined
): boolean {
  if (!esperado || typeof esperado !== "object") return true;
  if (!payload) return false;
  return Object.entries(esperado).every(([clave, valor]) => {
    if (clave === "motivos" && Array.isArray(valor)) {
      const motivosPayload = Array.isArray(payload.motivos) ? (payload.motivos as unknown[]) : [];
      return valor.every((m) => motivosPayload.includes(m));
    }
    return payload[clave] === valor;
  });
}

/**
 * En modo difícil: ¿esta acción corresponde a algún paso del checklist del escenario,
 * sin importar el orden? Si no corresponde a ninguno, se considera un clic fuera de lo
 * esperado — salvo que su tipo esté en `accionesSiemprePermitidas` (acciones de
 * "investigar" que un profesional cuidadoso puede hacer siempre, definidas por cada módulo).
 */
export function estaFueraDeChecklist(
  tipo: string,
  payload: Record<string, unknown> | null | undefined,
  pasosEsperados: PasoEsperado[],
  accionesSiemprePermitidas: string[]
): boolean {
  if (accionesSiemprePermitidas.includes(tipo)) return false;
  return !pasosEsperados.some((paso) => {
    if (paso.tipoAccion !== tipo) return false;
    return coincideParametrosConMotivos(paso.parametros as Record<string, unknown> | null, payload);
  });
}

/** Cuenta cuántos pasos del checklist ya fueron cumplidos, sin revelar cuáles son. */
export function contarPasosCumplidos(
  pasosEsperados: PasoEsperado[],
  acciones: Accion[]
): { completados: number; total: number } {
  const usadas = new Set<string>();
  let completados = 0;

  for (const paso of pasosEsperados) {
    const candidata = acciones.find((a) => {
      if (usadas.has(a.id) || a.tipo !== paso.tipoAccion) return false;
      return coincideParametrosConMotivos(
        paso.parametros as Record<string, unknown> | null,
        a.payload as Record<string, unknown> | null
      );
    });
    if (candidata) {
      usadas.add(candidata.id);
      completados += 1;
    }
  }

  return { completados, total: pasosEsperados.length };
}
