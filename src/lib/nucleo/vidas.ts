import { prisma } from "@/lib/nucleo/prisma";

/**
 * Descuenta un corazón del Intento y, si pertenece a un Turno, del pool compartido
 * de vidas del Turno también (ambos quedan sincronizados). Si el Intento es
 * independiente (no está dentro de un Turno), solo afecta sus propias vidas.
 */
export async function perderCorazon(
  intentoId: string,
  intento: { vidas: number; intentoTurnoId: string | null }
): Promise<{ vidas: number; estado: "EN_PROGRESO" | "PERDIDO" }> {
  const vidas = Math.max(0, intento.vidas - 1);
  const estado: "EN_PROGRESO" | "PERDIDO" = vidas === 0 ? "PERDIDO" : "EN_PROGRESO";

  await prisma.intento.update({ where: { id: intentoId }, data: { vidas, estado } });

  if (intento.intentoTurnoId) {
    await prisma.intentoTurno.update({
      where: { id: intento.intentoTurnoId },
      data: { vidas, estado: vidas === 0 ? "PERDIDO" : "EN_PROGRESO" },
    });
  }

  return { vidas, estado };
}
