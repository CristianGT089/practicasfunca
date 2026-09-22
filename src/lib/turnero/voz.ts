"use client";

/**
 * Timbre + anuncio de voz del tablero: solo APIs nativas del navegador (Web Audio para el
 * timbre — no hay ningún archivo de audio que mantener — y SpeechSynthesis para la voz), sin
 * depender de ningún servicio externo. Los navegadores bloquean el audio automático hasta
 * que hay una interacción real del usuario en la página — por eso el Tablero pide "Activar
 * sonido" una vez (ver `desbloquearAudio`) antes de dejar sonar los anuncios.
 */

let audioCtx: AudioContext | null = null;

function contexto(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  return audioCtx;
}

/**
 * Una nota de "campanita": la fundamental más un armónico suave una octava arriba (mucho
 * más suave), con ataque y caída graduales — eso es lo que la hace sonar a timbre y no a
 * pitido de alarma (que suele ser una sola onda pura, ataque instantáneo, tono agudo).
 */
function notaCampana(ctx: AudioContext, freq: number, inicio: number, duracion: number, pico: number) {
  for (const { mult, vol } of [
    { mult: 1, vol: 1 },
    { mult: 2, vol: 0.15 },
  ]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq * mult;
    const t0 = ctx.currentTime + inicio;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(pico * vol, t0 + 0.04); // ataque suave, sin golpe seco
    gain.gain.exponentialRampToValueAtTime(0.0005, t0 + duracion); // caída suave, sin "click" al final
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duracion + 0.05);
  }
}

/**
 * Timbre tipo "ding-dong" de puerta: quinta descendente (G5 → C5, el intervalo clásico de
 * timbre, no una alarma), con las dos notas solapándose un poco para que suenen a acorde en
 * vez de a pitidos sueltos.
 */
export function reproducirTimbre(): Promise<void> {
  return new Promise((resolve) => {
    const ctx = contexto();
    if (!ctx) return resolve();
    try {
      notaCampana(ctx, 783.99, 0, 0.55, 0.22); // G5 — "ding"
      notaCampana(ctx, 523.25, 0.18, 0.75, 0.22); // C5 — "dong"
      setTimeout(resolve, 950);
    } catch {
      resolve();
    }
  });
}

export function vozDisponible(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

// Motores conocidos que suenan naturales (no robóticos) — se prueban en este orden. "Google
// español" es la voz de red que trae Chrome/ChromeOS por defecto, y suele ser de las
// mejores. Los nombres de Microsoft son las voces femeninas típicas de Windows en español.
const VOCES_PREFERIDAS = [/google.*espa[ñn]ol/i, /microsoft.*(helena|laura|elvira|sabina|paloma)/i];

/**
 * El navegador carga la lista de voces de forma asíncrona — justo después de activar el
 * sonido puede llegar vacía. Espera a `voiceschanged` (con un tope corto para no demorar el
 * primer anuncio si el navegador nunca la dispara).
 */
function esperarVoces(): Promise<SpeechSynthesisVoice[]> {
  const voces = window.speechSynthesis.getVoices();
  if (voces.length > 0) return Promise.resolve(voces);
  return new Promise((resolve) => {
    const limite = setTimeout(() => resolve(window.speechSynthesis.getVoices()), 400);
    window.speechSynthesis.onvoiceschanged = () => {
      clearTimeout(limite);
      resolve(window.speechSynthesis.getVoices());
    };
  });
}

/**
 * La mejor voz en español disponible: prioriza motores conocidos por sonar naturales
 * (Google, Microsoft) y evita `espeak` (el más robótico) si hay otra opción — así en un
 * Chromebook o Windows suena bien sin tener que configurar nada.
 */
function elegirVozEspanol(voces: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const enEspanol = voces.filter((v) => v.lang.toLowerCase().startsWith("es"));
  if (enEspanol.length === 0) return null;
  for (const patron of VOCES_PREFERIDAS) {
    const encontrada = enEspanol.find((v) => patron.test(v.name));
    if (encontrada) return encontrada;
  }
  const sinEspeak = enEspanol.filter((v) => !/espeak/i.test(v.name));
  return sinEspeak[0] ?? enEspanol[0];
}

/** Timbre y luego el texto leído en voz. */
export async function anunciar(texto: string) {
  await reproducirTimbre();
  if (!vozDisponible()) return;
  window.speechSynthesis.cancel(); // corta un anuncio anterior que se estuviera solapando
  const utterance = new SpeechSynthesisUtterance(texto);
  utterance.lang = "es-CO";
  utterance.rate = 0.95;
  const voz = elegirVozEspanol(await esperarVoces());
  if (voz) utterance.voice = voz;
  window.speechSynthesis.speak(utterance);
}

/**
 * Desbloquea el audio: hay que llamarla directamente desde el handler de un clic/tap real
 * del usuario (no desde un efecto), porque los navegadores solo lo permiten así.
 */
export function desbloquearAudio() {
  contexto()?.resume().catch(() => {});
  if (vozDisponible()) {
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    window.speechSynthesis.speak(u);
  }
}
