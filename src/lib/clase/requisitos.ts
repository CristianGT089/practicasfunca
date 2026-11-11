import { NIVELES_MECANOGRAFIA } from "./mecanografia";
import type { Diapositiva } from "./tipos";

/**
 * Clase a tu ritmo: qué le falta para poder pasar de esta diapositiva (null = puede seguir).
 * Se usa en el navegador (deshabilita «Siguiente») y en el servidor (no deja avanzar igual).
 * Las demás actividades no bloquean: si las pasa sin terminar, le llegan al profe como pendientes.
 */
export function requisitoPendiente(d: Diapositiva, progreso: { datos: unknown } | undefined): string | null {
  if (d.tipo === "pregunta") return progreso ? null : "Responde la pregunta para seguir";
  if (d.tipo === "actividad" && d.actividad === "mecanografia") {
    const nivel = NIVELES_MECANOGRAFIA[0];
    const intentos = (progreso?.datos as { intentos?: { nivel: string; texto: number }[] } | null)?.intentos ?? [];
    const hechos = new Set(intentos.filter((i) => i.nivel === nivel.id).map((i) => i.texto)).size;
    if (hechos < nivel.textos.length) return `Termina los ${nivel.textos.length} textos del Nivel 1 para seguir (llevas ${hechos})`;
  }
  return null;
}
