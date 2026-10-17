"use client";

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";

/**
 * Recorridos guiados sobre la interfaz real: se oscurece la pantalla, se resalta el elemento
 * marcado con `data-guia="…"` y una tarjeta explica qué hace. Cada pantalla declara su
 * recorrido con <Recorrido id pasos />; arranca solo la primera vez (Usuario.guiasVistas) y
 * se repite desde el menú de la cuenta ("Guía de esta pantalla").
 */

export type PasoRecorrido = {
  /** Valor de `data-guia` del elemento a resaltar; sin él, la tarjeta va centrada. */
  guia?: string;
  titulo: string;
  texto: ReactNode;
};

type ContextoGuias = {
  vistas: string[];
  /** Módulos del usuario, para los consejos de cada área. */
  slugs: string[];
  marcarVista: (id: string) => void;
  /** Cambia cada vez que se pide repetir la guía de la pantalla actual. */
  pedido: number;
};

const Contexto = createContext<ContextoGuias | null>(null);

export function ProveedorGuias({ vistas: iniciales, slugs, children }: { vistas: string[]; slugs: string[]; children: ReactNode }) {
  const [vistas, setVistas] = useState(iniciales);
  const [pedido, setPedido] = useState(0);

  const marcarVista = useCallback((id: string) => {
    setVistas((v) => (v.includes(id) ? v : [...v, id]));
    fetch("/api/auth/guia", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ guia: id }) });
  }, []);

  // El menú de la cuenta pide la guía con un evento (vive fuera de este árbol de páginas).
  useEffect(() => {
    const pedir = () => setPedido((p) => p + 1);
    window.addEventListener("funca:guia", pedir);
    return () => window.removeEventListener("funca:guia", pedir);
  }, []);

  return <Contexto.Provider value={{ vistas, slugs, marcarVista, pedido }}>{children}</Contexto.Provider>;
}

export function useGuias() {
  return useContext(Contexto);
}

/** ¿La pantalla actual tiene un recorrido? (para saber si el menú lo repite aquí o va al Inicio). */
export const hayRecorridoEnPantalla = () => typeof document !== "undefined" && !!document.querySelector("[data-recorrido]");
export const pedirGuia = () => window.dispatchEvent(new Event("funca:guia"));

const MARGEN = 8;

/** El elemento visible con ese `data-guia` (la navegación existe dos veces: escritorio y compacta). */
function buscar(guia: string): HTMLElement | null {
  const todos = Array.from(document.querySelectorAll<HTMLElement>(`[data-guia="${guia}"]`));
  return todos.find((el) => el.getClientRects().length > 0 && el.getBoundingClientRect().width > 0) ?? null;
}

type Caja = { top: number; left: number; width: number; height: number };

export function Recorrido({ id, pasos, listo = true }: { id: string; pasos: PasoRecorrido[]; listo?: boolean }) {
  const guias = useGuias();
  const [activo, setActivo] = useState(false);
  const [i, setI] = useState(0);
  const [caja, setCaja] = useState<Caja | null>(null);
  const [alto, setAlto] = useState(220);
  const tarjeta = useRef<HTMLDivElement>(null);
  const tituloId = useId();
  const pedidoVisto = useRef(guias?.pedido ?? 0);

  // Solo los pasos cuyo elemento está en pantalla (cambian según el tipo y el estado de la jornada).
  const [visibles, setVisibles] = useState<PasoRecorrido[]>([]);
  const iniciar = useCallback(() => {
    setVisibles(pasos.filter((p) => !p.guia || buscar(p.guia)));
    setI(0);
    setActivo(true);
  }, [pasos]);

  // Arranca solo la primera vez; `listo` espera a que la pantalla haya cargado sus datos.
  const yaVisto = !guias || guias.vistas.includes(id);
  useEffect(() => {
    if (!listo || yaVisto || activo) return;
    const t = setTimeout(iniciar, 400);
    return () => clearTimeout(t);
  }, [listo, yaVisto, activo, iniciar]);

  // Repetirla desde el menú de la cuenta (si la pantalla aún carga, espera a que esté lista).
  useEffect(() => {
    if (!guias || !listo || guias.pedido === pedidoVisto.current) return;
    pedidoVisto.current = guias.pedido;
    iniciar();
  }, [guias, listo, iniciar]);

  const paso = activo ? visibles[i] : undefined;

  const terminar = useCallback(() => {
    setActivo(false);
    guias?.marcarVista(id);
  }, [guias, id]);

  // Seguir al elemento mientras se desplaza la página o cambia de tamaño.
  useEffect(() => {
    if (!paso) return;
    const el = paso.guia ? buscar(paso.guia) : null;
    // Una sección más alta que la pantalla se muestra desde su comienzo.
    const alta = !!el && el.getBoundingClientRect().height > window.innerHeight * 0.6;
    el?.scrollIntoView({ block: alta ? "start" : "center", behavior: "smooth" });
    let marco = 0;
    const medir = () => {
      const r = el?.getBoundingClientRect();
      setCaja((prev) => {
        if (!r) return null;
        const nueva = { top: r.top - MARGEN, left: r.left - MARGEN, width: r.width + 2 * MARGEN, height: r.height + 2 * MARGEN };
        return prev && prev.top === nueva.top && prev.left === nueva.left && prev.width === nueva.width && prev.height === nueva.height ? prev : nueva;
      });
      if (tarjeta.current) setAlto(tarjeta.current.offsetHeight);
      marco = requestAnimationFrame(medir);
    };
    medir();
    tarjeta.current?.focus();
    return () => cancelAnimationFrame(marco);
  }, [paso]);

  useEffect(() => {
    if (!activo) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") terminar();
      else if (e.key === "ArrowRight") setI((n) => (n < visibles.length - 1 ? n + 1 : n));
      else if (e.key === "ArrowLeft") setI((n) => Math.max(0, n - 1));
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [activo, visibles.length, terminar]);

  const marcador = <span data-recorrido={id} hidden />;
  if (!paso) return marcador;

  const ultimo = i === visibles.length - 1;
  // La tarjeta va debajo del elemento si cabe; si no, encima; si no, a un lado (pantallas
  // bajas); y si tampoco, abajo sin salirse de la pantalla. Sin elemento, centrada.
  const ancho = Math.min(360, window.innerWidth - 32);
  let posicion: React.CSSProperties = { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
  if (caja) {
    const { innerWidth: w, innerHeight: h } = window;
    const ajustar = (v: number, max: number) => Math.min(Math.max(16, v), max);
    const centradoX = ajustar(caja.left + caja.width / 2 - ancho / 2, w - ancho - 16);
    const centradoY = ajustar(caja.top + caja.height / 2 - alto / 2, h - alto - 16);
    const debajo = caja.top + caja.height + 12;
    const encima = caja.top - 12 - alto;
    if (debajo + alto <= h - 16) posicion = { left: centradoX, top: debajo };
    else if (encima >= 16) posicion = { left: centradoX, top: encima };
    else if (caja.left - 12 - ancho >= 16) posicion = { left: caja.left - 12 - ancho, top: centradoY };
    else if (caja.left + caja.width + 12 + ancho <= w - 16) posicion = { left: caja.left + caja.width + 12, top: centradoY };
    else posicion = { left: centradoX, top: Math.max(16, h - alto - 16) };
  }

  return (
    <>
      {marcador}
      {/* Capa que bloquea la página mientras dura el recorrido. */}
      <div className="fixed inset-0 z-[60]" aria-hidden onClick={() => tarjeta.current?.focus()} />
      {caja ? (
        <div
          aria-hidden
          className="pointer-events-none fixed z-[61] rounded-2xl transition-all duration-300"
          // El borde dorado y el oscurecido van en la misma sombra (un `ring` quedaría tapado).
          style={{ ...caja, boxShadow: "0 0 0 3px var(--color-gold-500), 0 0 0 9999px rgba(15, 23, 42, 0.6)" }}
        />
      ) : (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-[61] bg-slate-900/60" />
      )}
      <div
        ref={tarjeta}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        className="fixed z-[62] rounded-2xl border border-blue-100 bg-white p-5 shadow-[0_24px_48px_-12px_rgba(19,28,55,0.45)] outline-none"
        style={{ ...posicion, width: ancho, maxHeight: "calc(100vh - 32px)", overflowY: "auto" }}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gold-700">
            Guía · {i + 1} de {visibles.length}
          </span>
          <button onClick={terminar} className="text-xs font-semibold text-slate-400 hover:text-blue-800">
            Saltar guía
          </button>
        </div>
        <h2 id={tituloId} className="mt-1.5 font-heading text-lg font-bold text-blue-900">
          {paso.titulo}
        </h2>
        <div className="mt-1.5 text-sm leading-relaxed text-slate-600">{paso.texto}</div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex gap-1" aria-hidden>
            {visibles.map((_, n) => (
              <span key={n} className={`h-1.5 rounded-full transition-all ${n === i ? "w-5 bg-gold-500" : "w-1.5 bg-blue-100"}`} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {i > 0 && (
              <button onClick={() => setI(i - 1)} className="btn-suave px-3 py-1.5 text-sm">
                Anterior
              </button>
            )}
            <button onClick={ultimo ? terminar : () => setI(i + 1)} className="btn-primario px-4 py-1.5 text-sm">
              {ultimo ? "Entendido" : "Siguiente"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/** Consejo de un área en un paso: solo se muestra si el usuario enseña ese módulo. */
export function Consejo({ modulo, etiqueta, children }: { modulo: string | string[]; etiqueta: string; children: ReactNode }) {
  const guias = useGuias();
  const modulos = Array.isArray(modulo) ? modulo : [modulo];
  if (!guias?.slugs.some((s) => modulos.includes(s))) return null;
  return (
    <p className="mt-2 rounded-xl bg-blue-50 px-3 py-2 text-xs text-slate-700">
      <b className="text-blue-800">{etiqueta}:</b> {children}
    </p>
  );
}
