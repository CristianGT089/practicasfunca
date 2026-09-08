/**
 * Bus de eventos en memoria para el push en vivo del turnero (SSE). Un `EventEmitter` por
 * proceso Node: cuando un endpoint muta una sesión llama `emitirCambio(sesionId)`, y cada
 * stream SSE suscrito a esa sesión reenvía un snapshot nuevo.
 *
 * Se guarda en `globalThis` para sobrevivir al hot-reload de `next dev`. Si en el futuro la
 * app corre en varias instancias, esto hay que cambiarlo por LISTEN/NOTIFY de Postgres.
 */
import { EventEmitter } from "node:events";

const KEY = Symbol.for("turnero.eventos");

type GlobalConBus = typeof globalThis & { [KEY]?: EventEmitter };

function bus(): EventEmitter {
  const g = globalThis as GlobalConBus;
  if (!g[KEY]) {
    const emitter = new EventEmitter();
    emitter.setMaxListeners(0); // muchos computadores en la sala = muchos streams
    g[KEY] = emitter;
  }
  return g[KEY]!;
}

const canal = (sesionId: string) => `sesion:${sesionId}`;

export function emitirCambio(sesionId: string): void {
  bus().emit(canal(sesionId));
}

export function suscribirse(sesionId: string, onCambio: () => void): () => void {
  bus().on(canal(sesionId), onCambio);
  return () => bus().off(canal(sesionId), onCambio);
}
