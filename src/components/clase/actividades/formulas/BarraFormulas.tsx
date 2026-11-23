"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { CATALOGO, argumentoEn, funcionDelCatalogo, funcionesQueEmpiezan, sintaxis, type FuncionCatalogo } from "@/lib/clase/catalogoFunciones";
import { contextoCursor, referenciasDe, reemplazar } from "@/lib/clase/editorFormula";
import { buscarTabla, columnasDeTabla, mostrarValor, type Hoja, type TablaHoja, type Valor } from "@/lib/clase/formulas";
import { useDispositivo } from "@/lib/clase/dispositivo";

/** Colores de las referencias, como Sheets: la misma referencia tiene el mismo color en la barra y en la hoja. */
export const COLORES_REF = ["#1a73e8", "#d93025", "#9334e6", "#188038", "#e8710a", "#c5221f", "#12a4af", "#b06000"];
export const colorRef = (i: number) => COLORES_REF[i % COLORES_REF.length];

const SIMBOLOS = ["=", "(", ")", ";", ":", '"', "$", "<", ">", "&", "*", "/", "+", "-", "[", "]"];
const CATEGORIAS = [...new Set(CATALOGO.map((f) => f.categoria))];

type Sugerencia =
  | { tipo: "funcion"; f: FuncionCatalogo }
  | { tipo: "tabla"; nombre: string }
  | { tipo: "columna"; nombre: string };

export type Edicion = { texto: string; cursor: number };

/**
 * La barra de fórmulas con asistente, como la de Google Sheets: al escribir sugiere funciones
 * (Tab o toque para elegir), muestra la ayuda de la función en la que estás con el argumento
 * actual resaltado y un ejemplo, pinta cada referencia de un color, tiene el botón Σ para
 * insertar funciones y, en el celular, una fila de símbolos que en el teclado están escondidos.
 * Es controlada: el texto y el cursor viven en el componente de la actividad.
 */
export default function BarraFormulas({
  edicion,
  onEdicion,
  onEnviar,
  celda,
  deshabilitada,
  hoja,
  tablas,
  vistaPrevia,
  pedirFoco,
}: {
  edicion: Edicion;
  onEdicion: (e: Edicion, escrito: boolean) => void;
  onEnviar: () => void;
  celda: string;
  deshabilitada: boolean;
  hoja: Hoja;
  tablas: TablaHoja[];
  /** El resultado que daría la fórmula ahora (null si aún no calcula). */
  vistaPrevia: Valor | undefined;
  /** Cambia cuando la actividad quiere devolver el foco (y el cursor) a la barra. */
  pedirFoco: number;
}) {
  const dispositivo = useDispositivo();
  const celular = dispositivo === "celular";
  const entrada = useRef<HTMLInputElement>(null);
  const espejo = useRef<HTMLDivElement>(null);
  const [enfocada, setEnfocada] = useState(false);
  const [elegida, setElegida] = useState(0);
  const [cerrada, setCerrada] = useState<string | null>(null);
  const [ayudaCerrada, setAyudaCerrada] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<boolean | null>(null);
  const [sigma, setSigma] = useState(false);
  const { texto, cursor } = edicion;

  const ctx = contextoCursor(texto, cursor);
  const sugerencias: Sugerencia[] = [];
  if (texto.startsWith("=") && ctx.columna) {
    const t = buscarTabla(ctx.columna.tabla, tablas) ?? (ctx.columna.tabla ? undefined : tablas[0]);
    if (t)
      for (const c of columnasDeTabla(t, hoja))
        if (c.nombre.toLowerCase().startsWith(ctx.columna.parcial.toLowerCase())) sugerencias.push({ tipo: "columna", nombre: c.nombre });
  } else if (texto.startsWith("=") && ctx.palabra) {
    for (const t of tablas) if (t.nombre.toLowerCase().startsWith(ctx.palabra.texto.toLowerCase())) sugerencias.push({ tipo: "tabla", nombre: t.nombre });
    for (const f of funcionesQueEmpiezan(ctx.palabra.texto)) sugerencias.push({ tipo: "funcion", f });
  }
  const claveSug = `${ctx.palabra?.inicio ?? ""}|${ctx.columna?.inicio ?? ""}|${texto.slice(0, cursor)}`;
  const listaAbierta = enfocada && sugerencias.length > 0 && cerrada !== claveSug;
  const indiceSug = Math.min(elegida, sugerencias.length - 1);

  const fn = ctx.llamada ? funcionDelCatalogo(ctx.llamada.nombre) : undefined;
  const argActual = fn && ctx.llamada ? argumentoEn(fn, ctx.llamada.argumento) : -1;
  const sugFn = listaAbierta && sugerencias[indiceSug]?.tipo === "funcion" ? (sugerencias[indiceSug] as { f: FuncionCatalogo }).f : null;
  const ayudaVisible = !listaAbierta && !!fn && enfocada && ayudaCerrada !== fn.nombre;
  const verDetalle = detalle ?? !celular;

  // Aplica el cursor pedido por la actividad (al insertar una celda, un símbolo o una función).
  useLayoutEffect(() => {
    const el = entrada.current;
    if (!el || document.activeElement !== el) return;
    // Si el estudiante está seleccionando un pedazo del texto, no se le quita la selección.
    if (el.selectionStart !== el.selectionEnd) return sincronizar();
    if (el.selectionStart !== cursor || el.selectionEnd !== cursor) el.setSelectionRange(cursor, cursor);
    sincronizar();
  });
  useEffect(() => {
    if (!pedirFoco) return;
    const el = entrada.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    el.setSelectionRange(cursor, cursor);
    // Que se vea el final de lo escrito.
    el.scrollLeft = el.scrollWidth;
    sincronizar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedirFoco]);

  function sincronizar() {
    if (espejo.current && entrada.current) espejo.current.scrollLeft = entrada.current.scrollLeft;
  }

  function leer(): Edicion {
    const el = entrada.current!;
    return { texto: el.value, cursor: el.selectionStart ?? el.value.length };
  }

  function aceptar(s: Sugerencia) {
    let r: Edicion;
    if (s.tipo === "columna" && ctx.columna) r = reemplazar(texto, ctx.columna.inicio, cursor, `${s.nombre}]`);
    else if (ctx.palabra) r = reemplazar(texto, ctx.palabra.inicio, cursor, s.tipo === "funcion" ? `${s.f.nombre}(` : `${s.tipo === "tabla" ? s.nombre : ""}[`);
    else return;
    onEdicion(r, true);
    setElegida(0);
    setAyudaCerrada(null);
    entrada.current?.focus();
  }

  /** Inserta texto en el cursor (símbolos, funciones del Σ). */
  function insertar(t: string) {
    const el = entrada.current;
    const ini = el?.selectionStart ?? cursor;
    const fin = el?.selectionEnd ?? cursor;
    const base = texto || (t === "=" ? "" : "=");
    const desplaz = base.length - texto.length;
    const r = reemplazar(base, ini + desplaz, fin + desplaz, t);
    onEdicion(r, true);
    entrada.current?.focus();
  }

  function tecla(e: KeyboardEvent<HTMLInputElement>) {
    if (listaAbierta) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setElegida((i) => (i + (e.key === "ArrowDown" ? 1 : sugerencias.length - 1)) % sugerencias.length);
        return;
      }
      if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        aceptar(sugerencias[indiceSug]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setCerrada(claveSug);
        return;
      }
    }
    if (e.key === "Escape" && ayudaVisible && fn) {
      e.preventDefault();
      setAyudaCerrada(fn.nombre);
    }
  }

  // La fórmula pintada: cada referencia de su color (se ve a través del texto transparente del input).
  const refs = referenciasDe(texto);
  const pintada: ReactNode[] = [];
  let ultimo = 0;
  for (const r of refs) {
    if (r.inicio > ultimo) pintada.push(texto.slice(ultimo, r.inicio));
    pintada.push(
      <span key={r.inicio} style={{ color: colorRef(r.color) }} className="font-semibold">
        {r.texto}
      </span>,
    );
    ultimo = r.fin;
  }
  pintada.push(texto.slice(ultimo));

  return (
    <div className="relative">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onEnviar();
        }}
        className="flex items-center gap-1 rounded-t-2xl border border-b-0 border-slate-300 bg-white px-1.5 py-1 text-sm sm:px-2"
      >
        <span className="w-11 shrink-0 border-r border-slate-200 px-1 font-mono font-semibold sm:w-14 sm:px-2" title="Cuadro de nombres">
          {celda}
        </span>
        <div className="relative shrink-0">
          <button
            type="button"
            disabled={deshabilitada}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => setSigma((v) => !v)}
            aria-expanded={sigma}
            aria-label="Insertar una función"
            className="grid h-8 w-8 place-items-center rounded-md font-serif text-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 pointer-coarse:h-10 pointer-coarse:w-10"
          >
            Σ
          </button>
          {sigma && (
            <div className="absolute left-0 top-full z-40 mt-1 max-h-80 w-72 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 text-left shadow-xl">
              {CATEGORIAS.map((cat) => (
                <div key={cat}>
                  <p className="px-2 pt-2 text-[11px] font-bold uppercase tracking-wider text-blue-500">{cat}</p>
                  {CATALOGO.filter((f) => f.categoria === cat).map((f) => (
                    <button
                      key={f.nombre}
                      type="button"
                      onPointerDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setSigma(false);
                        insertar(`${f.nombre}(`);
                      }}
                      className="flex w-full flex-col rounded-lg px-2 py-1.5 text-left hover:bg-blue-50 pointer-coarse:py-2.5"
                    >
                      <span className="font-mono text-sm font-semibold text-blue-950">{f.nombre}</span>
                      <span className="text-xs text-slate-500">{f.resumen}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="relative min-w-0 flex-1 rounded-md focus-within:bg-blue-50/60">
          <div
            ref={espejo}
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre rounded-md px-2 py-1.5 font-mono text-base leading-6 text-slate-900"
          >
            {pintada}
          </div>
          <input
            ref={entrada}
            value={texto}
            onChange={() => {
              onEdicion(leer(), true);
              setElegida(0);
            }}
            onSelect={() => {
              const l = leer();
              if (l.cursor !== cursor || l.texto !== texto) onEdicion(l, false);
              sincronizar();
            }}
            onScroll={sincronizar}
            onKeyDown={tecla}
            onFocus={() => setEnfocada(true)}
            onBlur={() => {
              setEnfocada(false);
              setSigma(false);
            }}
            disabled={deshabilitada}
            placeholder={deshabilitada ? "" : celular ? "Escribe =…" : "Escribe la fórmula, empezando con ="}
            role="combobox"
            aria-controls="sugerencias-formula"
            aria-label="Barra de fórmulas"
            aria-autocomplete="list"
            aria-expanded={listaAbierta}
            className="relative w-full rounded-md bg-transparent px-2 py-1.5 font-mono text-base leading-6 text-transparent caret-slate-900 selection:bg-blue-300/40 placeholder:text-slate-400 focus:outline-none"
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            enterKeyHint="done"
          />
        </div>
        {vistaPrevia !== undefined && vistaPrevia !== null && texto.startsWith("=") && (
          <span className="hidden max-w-28 shrink-0 truncate rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600 sm:inline" title="Lo que da la fórmula ahora">
            = {mostrarValor(vistaPrevia)}
          </span>
        )}
        <button
          disabled={deshabilitada || !texto.trim()}
          onPointerDown={(e) => e.preventDefault()}
          className="btn-primario shrink-0 !px-3 !py-1.5 text-sm pointer-coarse:!py-2"
          aria-label="Revisar la fórmula (Enter)"
        >
          {celular ? "✓" : "Enter ↵"}
        </button>
      </form>

      {/* Teclas que en el teclado del celular están escondidas en otra capa. */}
      {celular && !deshabilitada && (
        <div className="flex gap-1 overflow-x-auto border-x border-slate-300 bg-slate-100 px-1.5 py-1 [scrollbar-width:none]" role="toolbar" aria-label="Símbolos">
          {SIMBOLOS.map((s) => (
            <button
              key={s}
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => insertar(s)}
              className="h-9 min-w-9 shrink-0 rounded-lg bg-white px-2 font-mono text-base font-bold text-blue-950 shadow-sm active:bg-blue-100"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Vista previa en el celular (en computador va dentro de la barra). */}
      {celular && vistaPrevia !== undefined && vistaPrevia !== null && texto.startsWith("=") && enfocada && (
        <p className="border-x border-slate-300 bg-white px-3 py-0.5 text-right font-mono text-xs text-slate-500">da {mostrarValor(vistaPrevia)}</p>
      )}

      {/* Lista del autocompletar, encima de la hoja. */}
      {listaAbierta && (
        <div className="absolute inset-x-0 top-full z-40 mt-1 flex max-h-72 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-xl sm:left-16 sm:right-auto sm:w-[28rem]" role="listbox" id="sugerencias-formula">
          <ul className="overflow-y-auto py-1">
            {sugerencias.map((s, i) => {
              const nombre = s.tipo === "funcion" ? s.f.nombre : s.nombre;
              return (
                <li key={`${s.tipo}-${nombre}`} role="option" aria-selected={i === indiceSug}>
                  <button
                    type="button"
                    onPointerDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setElegida(i)}
                    onClick={() => aceptar(s)}
                    className={`flex w-full items-baseline gap-2 px-3 py-1.5 text-left pointer-coarse:py-2.5 ${i === indiceSug ? "bg-blue-50" : ""}`}
                  >
                    <span className="shrink-0 font-mono text-sm font-semibold text-blue-950">
                      {s.tipo === "tabla" ? "▦ " : s.tipo === "columna" ? "▥ " : ""}
                      {nombre}
                    </span>
                    <span className="truncate text-xs text-slate-500">
                      {s.tipo === "funcion" ? s.f.resumen : s.tipo === "tabla" ? "Tabla de esta hoja" : "Columna de la tabla"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {sugFn && (
            <div className="border-t border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <p className="font-mono text-blue-950">{sintaxis(sugFn)}</p>
              <p className="mt-0.5">
                Ejemplo: <code className="font-mono text-slate-800">{sugFn.ejemplo}</code>
              </p>
              {!celular && <p className="mt-1 text-[11px] text-slate-400">Tab o Enter para elegirla · ↑ ↓ para moverte · Esc para cerrar</p>}
            </div>
          )}
        </div>
      )}

      {/* Tarjeta de ayuda de la función donde está el cursor. */}
      {ayudaVisible && fn && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 max-h-[55vh] overflow-y-auto rounded-xl border border-slate-200 bg-white text-left text-sm shadow-xl sm:left-16 sm:right-auto sm:w-[30rem]" role="dialog" aria-label={`Ayuda de ${fn.nombre}`}>
          <div className="flex items-start gap-2 px-3 py-2">
            <p className="min-w-0 flex-1 font-mono text-[15px] leading-6 text-slate-800">
              {fn.nombre}(
              {fn.argumentos.map((a, i) => (
                <span key={a.nombre}>
                  {i > 0 && "; "}
                  <span className={i === argActual ? "rounded bg-gold-100 px-0.5 font-bold text-[#b06000]" : ""}>{a.opcional ? `[${a.nombre}]` : a.nombre}</span>
                </span>
              ))}
              {fn.argumentos.some((a) => a.repetible) && "; …"})
            </p>
            <button
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => setDetalle(!verDetalle)}
              aria-label={verDetalle ? "Ocultar la explicación" : "Ver la explicación"}
              aria-expanded={verDetalle}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100 pointer-coarse:h-9 pointer-coarse:w-9"
            >
              {verDetalle ? "▴" : "▾"}
            </button>
            <button
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => setAyudaCerrada(fn.nombre)}
              aria-label="Cerrar la ayuda"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100 pointer-coarse:h-9 pointer-coarse:w-9"
            >
              ✕
            </button>
          </div>
          {argActual >= 0 && fn.argumentos[argActual] && (
            <p className="border-t border-slate-100 px-3 py-1.5 text-[13px] text-slate-700">
              <b className="font-mono text-[#b06000]">{fn.argumentos[argActual].nombre}</b>: {fn.argumentos[argActual].descripcion}
            </p>
          )}
          {fn.argumentos.length === 0 && <p className="border-t border-slate-100 px-3 py-1.5 text-[13px] text-slate-700">No lleva nada entre los paréntesis.</p>}
          {verDetalle && (
            <div className="space-y-2 border-t border-slate-100 px-3 py-2 text-[13px] text-slate-700">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Ejemplo</p>
                <code className="font-mono text-slate-900">{fn.ejemplo}</code>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">En salud</p>
                <code className="font-mono text-slate-900">{fn.enSalud.formula}</code>
                <p>{fn.enSalud.explicacion}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Resumen</p>
                <p>{fn.resumen}</p>
              </div>
              {fn.argumentos.map((a, i) => (
                <p key={a.nombre} className={i === argActual ? "rounded-lg bg-gold-50 px-1.5 py-0.5" : "px-1.5"}>
                  <b className="font-mono">{a.nombre}</b>
                  {a.opcional ? " (opcional)" : ""}: {a.descripcion}
                </p>
              ))}
              {fn.ojo && <p className="rounded-lg bg-blue-50 px-2 py-1 text-blue-900">💡 {fn.ojo}</p>}
              <p className="text-[11px] text-slate-400">En inglés: {fn.ingles}. Separa los datos con «;» (o «,» si tu hoja está en inglés).</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
