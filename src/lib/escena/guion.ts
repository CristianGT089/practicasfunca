/**
 * Guion de diálogo de un caso de práctica virtual: lo que dice la persona en cada momento
 * y las respuestas que puede elegir el estudiante, con su efecto en el ánimo. Genérico:
 * cada módulo decide en qué momentos usa cada frase. Ver docs/escena.md.
 *
 * El trato al paciente entra en la nota (15 %), separado de la decisión clínica: la
 * decisión correcta a veces molesta al paciente; lo que se evalúa es cómo se maneja.
 */

export type OpcionGuion = { texto: string; efecto: number; respuesta: string };

export type MomentoFrase = "pedirCedula" | "negarCedula" | "entregarReceta" | "sinReceta" | "error" | "venta" | "rechazo";

/** Momentos en los que el estudiante elige qué decir. */
export type MomentoRespuesta = "saludo" | "alNegarCedula" | "alRechazar";

export type Guion = {
  /** 0 furiosa · 1 molesta · 2 impaciente · 3 tranquila · 4 satisfecha */
  animoInicial: number;
  entrada: string;
  frases: Partial<Record<MomentoFrase, string>>;
  respuestas: Partial<Record<MomentoRespuesta, OpcionGuion[]>>;
};

export const ANIMOS = [
  { texto: "Furiosa", color: "#b91c1c" },
  { texto: "Molesta", color: "#c2410c" },
  { texto: "Impaciente", color: "#b8860b" },
  { texto: "Tranquila", color: "#2e5ba8" },
  { texto: "Satisfecha", color: "#15803d" },
] as const;

export const PESO_TRATO = 0.15;

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const texto = (v: unknown, max = 400) => (typeof v === "string" ? v.slice(0, max) : "");

function opciones(v: unknown): OpcionGuion[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((o) => {
      const x = obj(o);
      const efecto = typeof x.efecto === "number" && Number.isFinite(x.efecto) ? Math.max(-3, Math.min(3, Math.round(x.efecto))) : 0;
      return { texto: texto(x.texto), efecto, respuesta: texto(x.respuesta) };
    })
    .filter((o) => o.texto);
}

/** Sanea un guion guardado en la base (Json). Null si no hay guion utilizable. */
export function normalizarGuion(raw: unknown): Guion | null {
  const g = obj(raw);
  const entrada = texto(g.entrada);
  if (!entrada) return null;
  const f = obj(g.frases);
  const r = obj(g.respuestas);
  const animo = typeof g.animoInicial === "number" ? Math.max(0, Math.min(4, Math.round(g.animoInicial))) : 2;
  const frases: Guion["frases"] = {};
  for (const k of ["pedirCedula", "negarCedula", "entregarReceta", "sinReceta", "error", "venta", "rechazo"] as MomentoFrase[]) {
    if (texto(f[k])) frases[k] = texto(f[k]);
  }
  const respuestas: Guion["respuestas"] = {};
  for (const k of ["saludo", "alNegarCedula", "alRechazar"] as MomentoRespuesta[]) {
    const lista = opciones(r[k]);
    if (lista.length) respuestas[k] = lista;
  }
  return { animoInicial: animo, entrada, frases, respuestas };
}

/**
 * Trato al paciente (0-100) a partir de las respuestas elegidas (acciones RESPONDER con
 * `{ momento, indice }`). Cada respuesta vale según su efecto frente a la mejor y la peor
 * opción de ese momento. Null si el guion no tiene respuestas o no se respondió nada.
 */
export function calcularTrato(guion: Guion, respondidas: { momento: string; indice: number }[]): number | null {
  const puntajes: number[] = [];
  const vistos = new Set<string>();
  for (const r of respondidas) {
    if (vistos.has(r.momento)) continue; // cuenta la primera respuesta de cada momento
    const lista = guion.respuestas[r.momento as MomentoRespuesta];
    const elegida = lista?.[r.indice];
    if (!lista || !elegida) continue;
    vistos.add(r.momento);
    const efectos = lista.map((o) => o.efecto);
    const min = Math.min(...efectos);
    const max = Math.max(...efectos);
    puntajes.push(max === min ? 1 : (elegida.efecto - min) / (max - min));
  }
  if (puntajes.length === 0) return null;
  return Math.round((puntajes.reduce((a, b) => a + b, 0) / puntajes.length) * 100);
}
