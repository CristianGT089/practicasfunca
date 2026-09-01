import { prisma } from "@/lib/prisma";

/** Mismo criterio que usa el panel para distinguir el caso tutorial del resto. */
export function esTutorial(titulo: string): boolean {
  return titulo.startsWith("Tutorial");
}

/**
 * Un turno se desbloquea cuando el estudiante completó CADA caso normal (excluyendo el
 * tutorial) con al menos `umbralDesbloqueo`% en su mejor intento. Mientras
 * `requiereDesbloqueo` sea false, se considera desbloqueado sin exigir nada (para que el
 * profesor pueda revisarlo antes de activar la exigencia real).
 */
export async function calcularDesbloqueo(
  usuarioId: string,
  turno: { moduloId: string; requiereDesbloqueo: boolean; umbralDesbloqueo: number }
): Promise<boolean> {
  if (!turno.requiereDesbloqueo) return true;

  const escenarios = await prisma.escenario.findMany({
    where: { activo: true, soloTurno: false, moduloId: turno.moduloId },
    select: { id: true, titulo: true },
  });
  const evaluables = escenarios.filter((e) => !esTutorial(e.titulo));
  if (evaluables.length === 0) return true;

  const intentos = await prisma.intento.findMany({
    where: { usuarioId, estado: "COMPLETADO", escenarioId: { in: evaluables.map((e) => e.id) } },
    select: { escenarioId: true, puntajeFinal: true },
  });

  const mejorPorEscenario = new Map<string, number>();
  for (const i of intentos) {
    const actual = mejorPorEscenario.get(i.escenarioId) ?? -1;
    mejorPorEscenario.set(i.escenarioId, Math.max(actual, i.puntajeFinal ?? 0));
  }

  return evaluables.every((e) => (mejorPorEscenario.get(e.id) ?? -1) >= turno.umbralDesbloqueo);
}
