import { useSyncExternalStore } from "react";

/**
 * Desde qué equipo sigue la clase el estudiante. Muchos no tienen computador y entran desde el
 * celular: la clase adapta los atajos (Ctrl o ⌘), las instrucciones y las actividades que
 * necesitan teclado físico. Se detecta solo y el estudiante lo puede corregir («¿Desde dónde
 * entras?»); la corrección queda guardada en este navegador.
 */
import { DISPOSITIVOS, type Dispositivo } from "./equipos";

export { DISPOSITIVOS, esDispositivo, type Dispositivo } from "./equipos";

const CLAVE = "clase-dispositivo";
const EVENTO = "clase-dispositivo";

/** Lo que dice el navegador, sin la corrección del estudiante. */
export function detectarDispositivo(): Dispositivo {
  if (typeof navigator === "undefined") return "windows";
  const ua = navigator.userAgent;
  const datos = (navigator as Navigator & { userAgentData?: { mobile?: boolean; platform?: string } }).userAgentData;
  // El iPad se presenta como Mac: se le reconoce por la pantalla táctil.
  const ipad = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  if (datos?.mobile || ipad || /Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return "celular";
  const plataforma = datos?.platform ?? "";
  if (/CrOS/.test(ua) || plataforma === "Chrome OS" || plataforma === "ChromeOS") return "chromebook";
  if (/Mac OS X|Macintosh/.test(ua) || plataforma === "macOS") return "mac";
  if (/Windows/.test(ua) || plataforma === "Windows") return "windows";
  if (/Linux|X11/.test(ua)) return "linux";
  return "windows";
}

function leer(): Dispositivo {
  try {
    const guardado = localStorage.getItem(CLAVE) as Dispositivo | null;
    if (guardado && DISPOSITIVOS.some((d) => d.id === guardado)) return guardado;
  } catch {}
  return detectarDispositivo();
}

/** El equipo actual fuera de React (para enviarlo al servidor). */
export const dispositivoActual = (): Dispositivo => (typeof window === "undefined" ? "windows" : leer());

/** El estudiante corrige el equipo (null = volver a lo detectado). */
export function elegirDispositivo(d: Dispositivo | null) {
  try {
    if (d) localStorage.setItem(CLAVE, d);
    else localStorage.removeItem(CLAVE);
  } catch {}
  window.dispatchEvent(new Event(EVENTO));
}

function suscribir(cb: () => void) {
  window.addEventListener(EVENTO, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENTO, cb);
    window.removeEventListener("storage", cb);
  };
}

/** El equipo actual. En el servidor (y en el primer pintado) es "windows". */
export function useDispositivo(): Dispositivo {
  return useSyncExternalStore(suscribir, leer, () => "windows");
}

/** ¿Tiene teclado físico? (los atajos y la mecanografía lo necesitan). */
export const tieneTeclado = (d: Dispositivo) => d !== "celular";

/** La tecla de los atajos: ⌘ en Mac, Ctrl en los demás. */
export const teclaCtrl = (d: Dispositivo) => (d === "mac" ? "⌘" : "Ctrl");

/**
 * Adapta los atajos de un texto al equipo: en Mac, «Ctrl» pasa a «⌘» y «Alt» a «⌥ Option»
 * («Alt + Tab» es «⌘ + Tab»). No toca los textos que ya hablan de un sistema en particular
 * (Chromebook, Windows, la tecla 🔍 o ▭) ni los que ya traen ⌘.
 */
export function adaptarAtajos(texto: string, d: Dispositivo): string {
  if (d !== "mac" || (!texto.includes("Ctrl") && !texto.includes("Alt"))) return texto;
  if (/Chromebook|Windows|🔍|▭|⌘/.test(texto)) return texto;
  return texto
    .replace(/\bAlt \+ Tab\b/g, "⌘ + Tab")
    .replace(/\bCtrl\b/g, "⌘")
    .replace(/\bAlt\b/g, "⌥ Option");
}
