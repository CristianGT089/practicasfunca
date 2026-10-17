import { requireUser } from "@/lib/nucleo/auth";
import { jornadaRecepcionActiva } from "@/lib/simulacion/recepcionJornada";

/** El usuario y su jornada de recepción abierta; null si no tiene. */
export async function usuarioYJornada() {
  const usuario = await requireUser();
  if (!usuario) return null;
  const jornada = await jornadaRecepcionActiva(usuario);
  return jornada ? { usuario, jornada } : null;
}
