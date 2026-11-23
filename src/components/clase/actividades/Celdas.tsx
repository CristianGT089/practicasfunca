"use client";

import { useEffect, useRef, useState } from "react";
import type { RetoCeldas } from "@/lib/clase/tipos";
import { celdaAIndices, letraColumna, nombreCelda, normalizarRango } from "@/lib/clase/formulas";
import { useDispositivo } from "@/lib/clase/dispositivo";
import { useProgreso } from "../progreso";

type Datos = { hechos: number[]; fallos: number };
type Pos = { fila: number; col: number };
type Sel = { a: Pos; b: Pos };

/** Lo que pasa entre pointerdown y pointerup en la cuadrícula. */
type Gesto = {
  x: number;
  y: number;
  inicio: Pos;
  /** Se está arrastrando para seleccionar un rango (mouse, o el dedo desde la primera celda). */
  arrastra: boolean;
  /** Se movió lo suficiente como para no contar como toque. */
  movido: boolean;
  shift: boolean;
  tactil: boolean;
  sel: Sel | null;
};

/** Movimiento (px) a partir del cual un toque deja de serlo (es un desplazamiento o un arrastre). */
const UMBRAL = 10;

const igual = (p: Pos, q: Pos) => p.fila === q.fila && p.col === q.col;

/**
 * «Busca la celda»: una cuadrícula como la de Sheets para aprender a nombrar celdas y rangos.
 * Los retos van en orden: tocar una celda, escribir dónde está algo o seleccionar un rango.
 * El rango se selecciona arrastrando (con el mouse o con el dedo desde la primera celda), con
 * clic y Shift + clic como en Sheets, o tocando la primera celda y luego la última, como en la
 * app del celular. Se califica al soltar, y solo si fue un toque: desplazar la tabla no cuenta.
 */
export default function Celdas({
  id,
  retos,
  datos: contenido = [],
  columnas = 6,
  filas = 8,
}: {
  id: string;
  retos: RetoCeldas[];
  datos?: (string | number)[][];
  columnas?: number;
  filas?: number;
}) {
  const dispositivo = useDispositivo();
  const celular = dispositivo === "celular";
  const { datos, guardar } = useProgreso<Datos>(id);
  const hechos = new Set(datos?.hechos ?? []);
  const actual = retos.findIndex((_, i) => !hechos.has(i));
  const reto = actual === -1 ? null : retos[actual];
  const [sel, setSel] = useState<Sel | null>(null);
  /** Primera celda del rango, esperando la última (toque y toque, o clic y Shift + clic). */
  const [anclaDe, setAnclaDe] = useState<{ reto: number; pos: Pos } | null>(null);
  const [escrito, setEscrito] = useState("");
  const [mensaje, setMensaje] = useState<{
    bien: boolean;
    texto: string;
  } | null>(null);
  const gesto = useRef<Gesto | null>(null);
  const tablaRef = useRef<HTMLDivElement>(null);

  const nCols = Math.max(columnas, ...contenido.map((f) => f.length));
  const nFilas = Math.max(filas, contenido.length);
  const marcada = reto?.tipo === "escribir" && reto.marcar ? celdaAIndices(reto.celda) : null;
  // La primera celda que quedó esperando solo vale para el reto en que se tocó.
  const ancla = anclaDe?.reto === actual ? anclaDe.pos : null;
  const setAncla = (pos: Pos | null) => setAnclaDe(pos ? { reto: actual, pos } : null);

  // Si la celda marcada en amarillo quedó fuera de la vista (tabla desplazada), se lleva a la vista.
  const mf = marcada?.fila;
  const mc = marcada?.col;
  useEffect(() => {
    if (mf === undefined) return;
    const td = tablaRef.current?.querySelector<HTMLElement>(`td[data-f="${mf}"][data-c="${mc}"]`);
    td?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [mf, mc]);

  function acertar(texto: string) {
    const nuevos = new Set(hechos).add(actual);
    guardar(
      { hechos: [...nuevos], fallos: datos?.fallos ?? 0 },
      retos.every((_, i) => nuevos.has(i)),
    );
    setMensaje({ bien: true, texto });
    setEscrito("");
  }
  function fallar(texto: string) {
    guardar({ hechos: [...hechos], fallos: (datos?.fallos ?? 0) + 1 }, false);
    setMensaje({ bien: false, texto });
  }

  const textoSel = sel
    ? igual(sel.a, sel.b)
      ? nombreCelda(sel.a.fila, sel.a.col)
      : normalizarRango(`${nombreCelda(sel.a.fila, sel.a.col)}:${nombreCelda(sel.b.fila, sel.b.col)}`)!
    : "";

  const comoRango = celular ? "toca la primera celda y luego la última" : "arrastra desde la primera celda hasta la última";

  function revisarCelda(p: Pos) {
    if (reto?.tipo !== "tocar") return;
    const ok = celdaAIndices(reto.celda)!;
    if (igual(p, ok)) acertar(`¡Bien! Esa es ${reto.celda}: columna ${letraColumna(ok.col)}, fila ${ok.fila + 1}.`);
    else
      fallar(
        `Esa es ${nombreCelda(p.fila, p.col)} (columna ${letraColumna(p.col)}, fila ${p.fila + 1}). Primero busca la letra arriba y luego el número a la izquierda.`,
      );
  }

  function revisarRango(s: Sel) {
    if (reto?.tipo !== "rango" || igual(s.a, s.b)) return;
    const r = normalizarRango(`${nombreCelda(s.a.fila, s.a.col)}:${nombreCelda(s.b.fila, s.b.col)}`);
    const esperado = normalizarRango(reto.rango)!;
    const [desde, hasta] = esperado.split(":");
    if (r === esperado) acertar(`¡Bien! Seleccionaste ${esperado}: se lee «de ${desde} hasta ${hasta}».`);
    else fallar(`Seleccionaste ${r}. Vuelve a intentarlo: ${comoRango}.`);
  }

  /** Un toque o clic limpio (sin desplazar) en una celda. */
  function tocarCelda(p: Pos, shift: boolean, tactil: boolean) {
    if (reto?.tipo === "rango") {
      // Shift + clic extiende desde la celda activa, como en Sheets.
      const base = ancla ?? (shift && sel ? sel.a : null);
      if (base && (shift || tactil) && !igual(base, p)) {
        const s = { a: base, b: p };
        setSel(s);
        setAncla(null);
        revisarRango(s);
        return;
      }
      if (ancla && tactil && igual(ancla, p)) {
        // Tocar otra vez la primera celda la suelta.
        setAncla(null);
        setSel(null);
        setMensaje(null);
        return;
      }
      setAncla(p);
      setSel({ a: p, b: p });
      setMensaje({
        bien: true,
        texto: tactil
          ? `Primera celda: ${nombreCelda(p.fila, p.col)}. Ahora toca la última celda del rango (o arrastra el dedo desde aquí).`
          : `Primera celda: ${nombreCelda(p.fila, p.col)}. Ahora Shift + clic en la última, o arrastra.`,
      });
      return;
    }
    setSel({ a: p, b: p });
    revisarCelda(p);
  }

  function celdaEn(x: number, y: number): Pos | null {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("td[data-f]");
    if (!el || !tablaRef.current?.contains(el)) return null;
    return { fila: Number(el.dataset.f), col: Number(el.dataset.c) };
  }

  function bajar(e: React.PointerEvent<HTMLTableCellElement>, p: Pos) {
    if (e.button > 0) return;
    const tactil = e.pointerType !== "mouse";
    // En táctil el navegador captura el puntero en la celda inicial: se suelta para poder
    // saber, con elementFromPoint, sobre qué celda va el dedo.
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    const rango = reto?.tipo === "rango";
    // Con el mouse se arrastra desde cualquier celda; con el dedo, solo desde la primera celda ya
    // elegida (ahí la tabla no se desplaza), para que el resto de la tabla se pueda desplazar.
    const arrastra = rango && !e.shiftKey && (!tactil || (!!ancla && igual(ancla, p)));
    const g: Gesto = { x: e.clientX, y: e.clientY, inicio: p, arrastra, movido: false, shift: e.shiftKey, tactil, sel: null };
    if (arrastra) {
      if (!tactil) e.preventDefault(); // que el mouse no seleccione texto
      g.sel = { a: ancla && tactil ? ancla : p, b: p };
      setSel(g.sel);
    }
    gesto.current = g;

    const mover = (ev: PointerEvent) => {
      const gg = gesto.current;
      if (!gg) return;
      if (Math.hypot(ev.clientX - gg.x, ev.clientY - gg.y) > UMBRAL) gg.movido = true;
      if (!gg.arrastra || !gg.sel) return;
      const q = celdaEn(ev.clientX, ev.clientY);
      if (q && !igual(q, gg.sel.b)) {
        gg.sel = { a: gg.sel.a, b: q };
        setSel(gg.sel);
      }
    };
    const terminar = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", terminar);
      window.removeEventListener("pointercancel", terminar);
      const gg = gesto.current;
      gesto.current = null;
      // pointercancel = el navegador tomó el gesto para desplazar: no es una respuesta.
      if (!gg || ev.type === "pointercancel") return;
      if (gg.arrastra && gg.sel && !igual(gg.sel.a, gg.sel.b)) {
        setAncla(null);
        revisarRango(gg.sel);
        return;
      }
      if (!gg.movido || gg.arrastra) tocarCelda(gg.inicio, gg.shift, gg.tactil);
    };
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", terminar);
    window.addEventListener("pointercancel", terminar);
  }

  function enviarEscrito(e: React.FormEvent) {
    e.preventDefault();
    if (reto?.tipo !== "escribir") return;
    const r = escrito.replace(/\s/g, "").toUpperCase();
    const ok = reto.celda.toUpperCase();
    if (r === ok) acertar(`¡Bien! Es ${ok}.`);
    else if (/^\d+[A-Z]+$/.test(r)) fallar("Casi: primero va la letra (columna) y después el número (fila). Por ejemplo B3, no 3B.");
    else fallar(`No es ${r || "eso"}. Busca la letra de la columna arriba y el número de la fila a la izquierda.`);
  }

  const enSel = (f: number, c: number) =>
    sel &&
    f >= Math.min(sel.a.fila, sel.b.fila) &&
    f <= Math.max(sel.a.fila, sel.b.fila) &&
    c >= Math.min(sel.a.col, sel.b.col) &&
    c <= Math.max(sel.a.col, sel.b.col);

  const icono = !reto ? "" : reto.tipo === "tocar" ? "👆" : reto.tipo === "rango" ? (celular ? "👆" : "🖱️") : "⌨️";

  return (
    <div className="flex flex-col gap-3">
      <div className="sticky top-0 z-20 -mx-1 flex flex-col gap-1.5 bg-[var(--background)] px-1 pb-2 pt-2 sm:gap-2 sm:pt-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <div
            className={`flex-1 rounded-2xl px-3 py-2 font-heading text-base font-bold sm:px-4 sm:py-3 sm:text-lg ${reto ? "bg-blue-900 text-white" : "bg-emerald-50 text-emerald-800"}`}
          >
            {reto ? `${icono} ${reto.texto}` : "🎉 ¡Completaste todos los retos!"}
          </div>
          <span className="shrink-0 text-sm font-semibold text-blue-900">
            {hechos.size} de {retos.length}
          </span>
        </div>
        {reto?.tipo === "escribir" && (
          <form onSubmit={enviarEscrito} className="flex items-center gap-2">
            <input
              value={escrito}
              onChange={(e) => setEscrito(e.target.value)}
              placeholder="Ej.: B3"
              aria-label="Nombre de la celda"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              enterKeyHint="done"
              className="w-28 rounded-xl border-2 border-blue-300 px-3 py-1.5 font-mono text-lg uppercase placeholder:normal-case focus:border-blue-700 focus:outline-none pointer-coarse:min-h-11"
              // En el celular no se enfoca solo: el teclado taparía la celda marcada.
              autoFocus={!celular}
            />
            <button className="btn-primario !py-2 pointer-coarse:min-h-11">Revisar</button>
          </form>
        )}
        {reto?.tipo === "rango" && (
          <p className="text-sm text-slate-600">
            {celular
              ? "Toca la primera celda y luego la última (o arrastra el dedo desde la primera)."
              : "Arrastra desde la primera celda hasta la última, o haz clic en la primera y Shift + clic en la última."}
          </p>
        )}
        <p
          className={`min-h-5 text-sm font-semibold ${mensaje ? (mensaje.bien ? "text-emerald-700" : "text-rose-700") : "text-slate-500"}`}
          aria-live="polite"
        >
          {mensaje?.texto ?? ""}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow">
        <div className="flex items-center gap-1 border-b border-slate-200 px-2 py-1 text-sm">
          <span className="w-20 shrink-0 border-r border-slate-200 px-1 font-mono sm:w-24 sm:px-2" aria-label="Cuadro de nombres">
            {textoSel || " "}
          </span>
          <span className="italic text-slate-400">fx</span>
          <span className="truncate px-2 font-mono">{sel ? String(contenido[sel.b.fila]?.[sel.b.col] ?? "") : ""}</span>
        </div>
        <div ref={tablaRef} className="overflow-x-auto">
          <table className="w-full min-w-[19rem] table-fixed select-none border-collapse text-xs sm:min-w-[34rem] sm:text-sm" style={{ touchAction: "pan-x pan-y" }}>
            <colgroup>
              <col className="w-7 sm:w-10" />
              {Array.from({ length: nCols }, (_, c) => (
                // En el celular: la primera columna (nombres) más ancha y las vacías angostas, para que
                // la tabla quepa a 360 px sin desplazarla.
                <col key={c} className={c === 0 && contenido.length ? "w-[5.5rem] sm:w-32" : contenido.some((f) => f[c] !== undefined && f[c] !== "") ? "" : "w-11 sm:w-auto"} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th className="border border-slate-200 bg-slate-100" />
                {Array.from({ length: nCols }, (_, c) => (
                  <th
                    key={c}
                    className={`border border-slate-200 py-0.5 font-semibold ${sel && enSel(sel.b.fila, c) ? "bg-[#D3E3FD] text-blue-900" : "bg-slate-100 text-slate-600"}`}
                  >
                    {letraColumna(c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: nFilas }, (_, f) => (
                <tr key={f}>
                  <td
                    className={`border border-slate-200 text-center font-semibold ${sel && enSel(f, sel.b.col) ? "bg-[#D3E3FD] text-blue-900" : "bg-slate-100 text-slate-600"}`}
                  >
                    {f + 1}
                  </td>
                  {Array.from({ length: nCols }, (_, c) => {
                    const v = contenido[f]?.[c] ?? "";
                    const esMarcada = marcada && marcada.fila === f && marcada.col === c;
                    const seleccionada = enSel(f, c);
                    const esAncla = !!ancla && ancla.fila === f && ancla.col === c;
                    return (
                      <td
                        key={c}
                        data-f={f}
                        data-c={c}
                        onPointerDown={(e) => bajar(e, { fila: f, col: c })}
                        // Solo la primera celda del rango bloquea el gesto (para arrastrar desde ahí
                        // con el dedo); el resto de la tabla se puede desplazar.
                        style={esAncla ? { touchAction: "none" } : undefined}
                        className={`h-8 cursor-cell overflow-hidden text-ellipsis whitespace-nowrap border border-slate-200 px-0.5 pointer-coarse:h-10 sm:px-2 ${typeof v === "number" ? "text-right" : "text-left"} ${f === 0 && contenido.length ? "text-[11px] font-bold sm:text-sm" : ""} ${
                          esMarcada
                            ? "bg-gold-400 font-bold ring-2 ring-inset ring-gold-600"
                            : seleccionada
                              ? `bg-[#E8F0FE] outline -outline-offset-1 outline-[#1A73E8] ${esAncla ? "outline-2" : "outline-1"}`
                              : "hover:bg-slate-50"
                        }`}
                      >
                        {esMarcada && v === "" ? "?" : typeof v === "number" ? v.toLocaleString("es-CO") : v}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
