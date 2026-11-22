"use client";

import { useState } from "react";
import type { RetoCeldas } from "@/lib/clase/tipos";
import { celdaAIndices, letraColumna, nombreCelda, normalizarRango } from "@/lib/clase/formulas";
import { useProgreso } from "../progreso";

type Datos = { hechos: number[]; fallos: number };
type Sel = {
  a: { fila: number; col: number };
  b: { fila: number; col: number };
};

/**
 * «Busca la celda»: una cuadrícula como la de Sheets para aprender a nombrar celdas y rangos.
 * Los retos van en orden: tocar una celda, escribir dónde está algo o seleccionar un rango
 * (arrastrando, o clic y Shift + clic, como en Sheets).
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
  const { datos, guardar } = useProgreso<Datos>(id);
  const hechos = new Set(datos?.hechos ?? []);
  const actual = retos.findIndex((_, i) => !hechos.has(i));
  const reto = actual === -1 ? null : retos[actual];
  const [sel, setSel] = useState<Sel | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [escrito, setEscrito] = useState("");
  const [mensaje, setMensaje] = useState<{
    bien: boolean;
    texto: string;
  } | null>(null);

  const nCols = Math.max(columnas, ...contenido.map((f) => f.length));
  const nFilas = Math.max(filas, contenido.length);

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
    ? sel.a.fila === sel.b.fila && sel.a.col === sel.b.col
      ? nombreCelda(sel.a.fila, sel.a.col)
      : normalizarRango(`${nombreCelda(sel.a.fila, sel.a.col)}:${nombreCelda(sel.b.fila, sel.b.col)}`)!
    : "";

  function revisarSeleccion(s: Sel) {
    if (!reto) return;
    const nombre = nombreCelda(s.b.fila, s.b.col);
    if (reto.tipo === "tocar") {
      const ok = celdaAIndices(reto.celda)!;
      if (s.b.fila === ok.fila && s.b.col === ok.col) acertar(`¡Bien! Esa es ${reto.celda}: columna ${letraColumna(ok.col)}, fila ${ok.fila + 1}.`);
      else fallar(`Esa es ${nombre} (columna ${letraColumna(s.b.col)}, fila ${s.b.fila + 1}). Primero busca la letra arriba y luego el número a la izquierda.`);
    }
    if (reto.tipo === "rango") {
      const r = normalizarRango(`${nombreCelda(s.a.fila, s.a.col)}:${nombreCelda(s.b.fila, s.b.col)}`);
      const esperado = normalizarRango(reto.rango);
      if (r === esperado) acertar(`¡Bien! Seleccionaste ${esperado}: se lee «de ${esperado!.split(":")[0]} hasta ${esperado!.split(":")[1]}».`);
      else if (s.a.fila !== s.b.fila || s.a.col !== s.b.col)
        fallar(`Seleccionaste ${r}. Vuelve a intentarlo: arrastra desde la primera celda hasta la última.`);
    }
  }

  function bajar(fila: number, col: number, shift: boolean) {
    const p = { fila, col };
    const s = shift && sel ? { a: sel.a, b: p } : { a: p, b: p };
    setSel(s);
    setArrastrando(true);
    if (reto?.tipo === "tocar" || (shift && reto?.tipo === "rango")) revisarSeleccion(s);
  }
  function entrar(fila: number, col: number) {
    if (!arrastrando || !sel) return;
    setSel({ a: sel.a, b: { fila, col } });
  }
  function soltar() {
    if (!arrastrando) return;
    setArrastrando(false);
    if (sel && reto?.tipo === "rango") revisarSeleccion(sel);
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

  const marcada = reto?.tipo === "escribir" && reto.marcar ? celdaAIndices(reto.celda) : null;
  const enSel = (f: number, c: number) =>
    sel &&
    f >= Math.min(sel.a.fila, sel.b.fila) &&
    f <= Math.max(sel.a.fila, sel.b.fila) &&
    c >= Math.min(sel.a.col, sel.b.col) &&
    c <= Math.max(sel.a.col, sel.b.col);

  return (
    <div className="flex flex-col gap-3" onPointerUp={soltar} onPointerLeave={soltar}>
      <div className="sticky top-0 z-20 -mx-1 flex flex-col gap-2 bg-[var(--background)] px-1 pb-2 pt-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className={`flex-1 rounded-2xl px-4 py-3 font-heading text-lg font-bold ${reto ? "bg-blue-900 text-white" : "bg-emerald-50 text-emerald-800"}`}>
            {reto ? `${reto.tipo === "tocar" ? "👆" : reto.tipo === "rango" ? "🖱️" : "⌨️"} ${reto.texto}` : "🎉 ¡Completaste todos los retos!"}
          </div>
          <span className="text-sm font-semibold text-blue-900">
            {hechos.size} de {retos.length}
          </span>
        </div>
        {reto?.tipo === "escribir" && (
          <form onSubmit={enviarEscrito} className="flex flex-wrap items-center gap-2">
            <input
              value={escrito}
              onChange={(e) => setEscrito(e.target.value)}
              placeholder="Ej.: B3"
              className="w-32 rounded-xl border-2 border-blue-300 px-3 py-2 font-mono text-lg uppercase focus:border-blue-700 focus:outline-none"
              autoFocus
            />
            <button className="btn-primario !py-2">Revisar</button>
          </form>
        )}
        {reto?.tipo === "rango" && (
          <p className="text-sm text-slate-600">Arrastra desde la primera celda hasta la última, o haz clic en la primera y Shift + clic en la última.</p>
        )}
        <p className={`min-h-6 text-sm font-semibold ${mensaje ? (mensaje.bien ? "text-emerald-700" : "text-rose-700") : "text-slate-500"}`} aria-live="polite">
          {mensaje?.texto ?? ""}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow">
        <div className="flex items-center gap-1 border-b border-slate-200 px-2 py-1 text-sm">
          <span className="w-24 border-r border-slate-200 px-2 font-mono" title="Cuadro de nombres">
            {textoSel || " "}
          </span>
          <span className="italic text-slate-400">fx</span>
          <span className="truncate px-2 font-mono">{sel ? String(contenido[sel.b.fila]?.[sel.b.col] ?? "") : ""}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full select-none border-collapse text-sm" style={{ touchAction: "none" }}>
            <thead>
              <tr>
                <th className="w-10 border border-slate-200 bg-slate-100" />
                {Array.from({ length: nCols }, (_, c) => (
                  <th
                    key={c}
                    className={`min-w-20 border border-slate-200 py-0.5 font-semibold ${sel && enSel(sel.b.fila, c) ? "bg-[#D3E3FD] text-blue-900" : "bg-slate-100 text-slate-600"}`}
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
                    return (
                      <td
                        key={c}
                        onPointerDown={(e) => bajar(f, c, e.shiftKey)}
                        onPointerEnter={() => entrar(f, c)}
                        className={`h-8 cursor-cell border border-slate-200 px-2 ${typeof v === "number" ? "text-right" : "text-left"} ${f === 0 && contenido.length ? "font-bold" : ""} ${
                          esMarcada
                            ? "bg-gold-400 font-bold ring-2 ring-inset ring-gold-600"
                            : seleccionada
                              ? "bg-[#E8F0FE] outline outline-1 -outline-offset-1 outline-[#1A73E8]"
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
