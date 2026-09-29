import type { Accion, PasoEsperado } from "@prisma/client";
import { estaFueraDeChecklist as estaFueraDeChecklistGenerico } from "../../nucleo/checklist";
import { ALERTAS_MEDICAS, ALERTAS_RIESGO_SANGRADO, etiquetaDe, normalizarHistoria, type EsperadoOdontologia, type HistoriaOdontologica } from "./historia";

/**
 * Documentar e investigar nunca cuesta un corazón en modo difícil. Lo único que puede
 * quedar "fuera del checklist" es pedir una radiografía que el caso no necesita
 * (exposición innecesaria a radiación).
 */
export const ACCIONES_SIEMPRE_PERMITIDAS: string[] = [
  "INTERROGAR_PACIENTE",
  "EXAMINAR_PACIENTE",
  "APLICAR_REVELADOR_PLACA",
  "GUARDAR_HISTORIA",
  "CERRAR_HISTORIA",
];

export function estaFueraDeChecklist(
  tipo: string,
  payload: Record<string, unknown> | null | undefined,
  pasosEsperados: PasoEsperado[]
): boolean {
  return estaFueraDeChecklistGenerico(tipo, payload, pasosEsperados, ACCIONES_SIEMPRE_PERMITIDAS);
}

/** La última historia guardada por el estudiante (cada GUARDAR/CERRAR trae la historia completa). */
export function ultimaHistoria(acciones: Pick<Accion, "tipo" | "payload">[]): HistoriaOdontologica | null {
  for (let i = acciones.length - 1; i >= 0; i--) {
    const a = acciones[i];
    if (a.tipo !== "GUARDAR_HISTORIA" && a.tipo !== "CERRAR_HISTORIA") continue;
    const payload = a.payload as Record<string, unknown> | null;
    if (payload?.historia) return normalizarHistoria(payload.historia);
  }
  return null;
}

function riesgoSangradoSinRegistrar(historia: HistoriaOdontologica, esperado: EsperadoOdontologia): string[] {
  const indicaExtraccion = historia.odontograma.some(
    (m) =>
      m.hallazgo === "EXODONCIA_SIMPLE_INDICADA" ||
      m.hallazgo === "EXODONCIA_QUIRURGICA_INDICADA" ||
      m.hallazgo === "RESTO_RADICULAR"
  );
  if (!indicaExtraccion) return [];
  return esperado.alertaMedica.filter((c) => ALERTAS_RIESGO_SANGRADO.includes(c) && !historia.alertaMedica.includes(c));
}

/**
 * Peligros clínicos al cerrar la historia:
 * - Indicar una extracción (o dejar un resto radicular por extraer) en un paciente con
 *   riesgo de sangrado sin haberlo dejado en la alerta médica.
 * - Cerrar la historia sin haber examinado al paciente.
 *
 * El primero cuesta un corazón una sola vez aunque el cierre se reintente.
 */
export function evaluarPeligrosHistoria(
  tipo: string,
  historia: HistoriaOdontologica,
  esperado: EsperadoOdontologia,
  accionesPrevias: Accion[]
): string[] {
  const peligros: string[] = [];

  const sinRegistrar = riesgoSangradoSinRegistrar(historia, esperado);
  const yaCobrado = accionesPrevias.some((a) => {
    if (!a.esError || a.tipo !== "CERRAR_HISTORIA") return false;
    const previa = (a.payload as Record<string, unknown> | null)?.historia;
    return riesgoSangradoSinRegistrar(normalizarHistoria(previa), esperado).length > 0;
  });
  if (sinRegistrar.length > 0 && !yaCobrado) {
    peligros.push(
      `Indicaste una extracción, pero no registraste en la alerta médica: ${sinRegistrar
        .map((c) => etiquetaDe(ALERTAS_MEDICAS, c).toLowerCase())
        .join(", ")}. Quien haga el procedimiento no sabrá del riesgo de sangrado.`
    );
  }

  if (tipo === "CERRAR_HISTORIA" && !accionesPrevias.some((a) => a.tipo === "EXAMINAR_PACIENTE")) {
    peligros.push("Cerraste la historia sin examinar al paciente: el odontograma tiene que salir del examen clínico.");
  }
  return peligros;
}
