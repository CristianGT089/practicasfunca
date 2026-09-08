/**
 * Orden de la cola de un turnero. Función pura: recibe los tickets en espera y devuelve
 * cuál sigue. NO decide a qué espacio va (eso es manual por ahora — ver docs/turnero.md).
 */
import type { ReglaPrioridad } from "@prisma/client";

export type TicketEnCola = {
  id: string;
  prioritario: boolean;
  emitidoEn: Date;
};

/** Tickets atendidos, del más reciente al más antiguo — para la regla INTERCALADA. */
export type HistorialAtencion = { prioritario: boolean }[];

function porLlegada(a: TicketEnCola, b: TicketEnCola) {
  return a.emitidoEn.getTime() - b.emitidoEn.getTime();
}

/**
 * Elige el siguiente ticket de la cola.
 *
 * - ESTRICTA: todos los prioritarios (por llegada) antes que cualquier normal.
 * - INTERCALADA: como ESTRICTA, salvo que ya se hayan atendido 2 normales seguidos sin un
 *   prioritario de por medio... al revés: si se atendieron 2 prioritarios seguidos y hay
 *   normales esperando, entra un normal. Evita que una racha de prioritarios congele la
 *   cola normal.
 */
export function siguienteTicket(
  enEspera: TicketEnCola[],
  regla: ReglaPrioridad,
  historial: HistorialAtencion = []
): TicketEnCola | null {
  if (enEspera.length === 0) return null;

  const prioritarios = enEspera.filter((t) => t.prioritario).sort(porLlegada);
  const normales = enEspera.filter((t) => !t.prioritario).sort(porLlegada);

  if (prioritarios.length === 0) return normales[0] ?? null;
  if (normales.length === 0) return prioritarios[0] ?? null;

  if (regla === "INTERCALADA") {
    let prioritariosSeguidos = 0;
    for (const h of historial) {
      if (h.prioritario) prioritariosSeguidos += 1;
      else break;
    }
    if (prioritariosSeguidos >= 2) return normales[0];
  }

  return prioritarios[0];
}
