"use client";

import { useRef, useState } from "react";
import type { RetoFormula } from "@/lib/clase/tipos";
import { celdaAIndices, ErrorFormula, evaluar, letraColumna, mostrarNumero, nombreCelda, usaFuncion, usaReferencias, type Hoja } from "@/lib/clase/formulas";
import { useProgreso } from "../progreso";

type Datos = { formulas: Record<string, string>; fallos: number };

/** La hoja con los resultados de las fórmulas ya resueltas (para que se vean en su celda). */
function hojaCon(base: (string | number)[][], retos: RetoFormula[], formulas: Record<string, string>): Hoja {
  const hoja: Hoja = base.map((f) => [...f]);
  for (const r of retos) {
    const f = formulas[r.celda];
    const c = celdaAIndices(r.celda);
    if (!f || !c) continue;
    try {
      while (hoja.length <= c.fila) hoja.push([]);
      hoja[c.fila][c.col] = evaluar(f, hoja);
    } catch {
      /* fórmula guardada que ya no evalúa: se ignora */
    }
  }
  return hoja;
}

/**
 * Fórmulas en una mini hoja de cálculo: el estudiante escribe en la barra de fórmulas y la hoja
 * calcula de verdad. Al hacer clic en una celda mientras escribe una fórmula, se agrega su nombre
 * (como en Sheets). Acepta SUMA o SUM, y «;» o «,».
 */
export default function Formulas({ id, datos: base, retos }: { id: string; datos: (string | number)[][]; retos: RetoFormula[] }) {
  const { datos, guardar } = useProgreso<Datos>(id);
  const formulas = datos?.formulas ?? {};
  const actual = retos.findIndex((r) => !formulas[r.celda]);
  const [elegido, setElegido] = useState<number | null>(null);
  const indice = elegido ?? actual;
  const reto = indice === -1 ? null : retos[indice];
  const [texto, setTexto] = useState("");
  const [mensaje, setMensaje] = useState<{ bien: boolean; texto: string } | null>(null);
  const [verPista, setVerPista] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);

  const hoja = hojaCon(base, retos, formulas);
  const objetivo = reto ? celdaAIndices(reto.celda) : null;
  const nFilas = Math.max(hoja.length, ...retos.map((r) => (celdaAIndices(r.celda)?.fila ?? 0) + 1)) + 1;
  const nCols = Math.max(...hoja.map((f) => f.length), ...retos.map((r) => (celdaAIndices(r.celda)?.col ?? 0) + 1));
  const resueltos = retos.filter((r) => formulas[r.celda]).length;

  function fallar(t: string) {
    guardar({ formulas, fallos: (datos?.fallos ?? 0) + 1 }, false);
    setMensaje({ bien: false, texto: t });
  }

  function revisar(e: React.FormEvent) {
    e.preventDefault();
    if (!reto) return;
    const f = texto.trim();
    if (!f) return;
    if (!f.startsWith("=")) return fallar("Toda fórmula empieza con el signo igual (=). Si no, la hoja lo toma como texto.");
    // La celda que se está llenando no cuenta (si no, sería una referencia circular).
    const hojaSinEsta = hoja.map((fila) => [...fila]);
    if (objetivo && hojaSinEsta[objetivo.fila]) hojaSinEsta[objetivo.fila][objetivo.col] = null;
    let valor: number;
    let esperado: number;
    try {
      valor = evaluar(f, hojaSinEsta);
    } catch (err) {
      return fallar(err instanceof ErrorFormula ? err.message : "La fórmula tiene un error");
    }
    try {
      esperado = evaluar(reto.solucion, hojaSinEsta);
    } catch {
      esperado = NaN;
    }
    if (!usaReferencias(f))
      return fallar(
        `Da ${mostrarNumero(valor)}, pero escribiste los números a mano. Usa los nombres de las celdas (B2, C3…): así, si cambia un dato, la fórmula se actualiza sola.`,
      );
    if (reto.funcion && !usaFuncion(f, reto.funcion))
      return fallar(`Da ${mostrarNumero(valor)}. Ahora hazlo con la función ${reto.funcion}: es más corto y sirve para muchas filas.`);
    if (Math.abs(valor - esperado) > 0.005) return fallar(`Tu fórmula da ${mostrarNumero(valor)}, pero no es lo que se pide. Revisa qué celdas usaste.`);
    const nuevas = { ...formulas, [reto.celda]: f };
    guardar(
      { formulas: nuevas, fallos: datos?.fallos ?? 0 },
      retos.every((r) => nuevas[r.celda]),
    );
    setMensaje({ bien: true, texto: `¡Bien! ${reto.celda} = ${mostrarNumero(valor)}.` });
    setTexto("");
    setElegido(null);
    setVerPista(false);
  }

  function clicCelda(fila: number, col: number) {
    const nombre = nombreCelda(fila, col);
    // Escribiendo una fórmula: agrega la referencia, como en Sheets.
    if (texto.startsWith("=") && /[=(+\-*/;,:]$/.test(texto)) {
      setTexto(texto + nombre);
      entrada.current?.focus();
      return;
    }
    const r = retos.findIndex((x) => x.celda === nombre);
    if (r !== -1) {
      setElegido(r);
      setTexto(formulas[nombre] ?? "");
      setMensaje(null);
      setVerPista(false);
      entrada.current?.focus();
    }
  }

  return (
    <div className="flex flex-col">
      {/* Reto, barra de fórmulas y mensaje quedan fijos arriba: así se ve la respuesta mientras se escribe. */}
      <div className="sticky top-11 z-20 -mx-1 flex flex-col gap-2 bg-[var(--background)] px-1 pt-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className={`flex-1 rounded-2xl px-4 py-3 font-heading text-lg font-bold ${reto ? "bg-blue-900 text-white" : "bg-emerald-50 text-emerald-800"}`}>
            {reto ? (
              <>
                <span className="mr-2 rounded-lg bg-gold-500 px-2 py-0.5 font-mono text-blue-900">{reto.celda}</span>
                {reto.texto}
              </>
            ) : (
              "🎉 ¡Resolviste todas las fórmulas! Haz clic en una celda amarilla para ver su fórmula."
            )}
          </div>
          <span className="text-sm font-semibold text-blue-900">
            {resueltos} de {retos.length}
          </span>
        </div>

        <form onSubmit={revisar} className="flex items-center gap-1 rounded-t-2xl border border-b-0 border-slate-300 bg-white px-2 py-1 text-sm">
          <span className="w-16 shrink-0 border-r border-slate-200 px-2 font-mono font-semibold" title="Cuadro de nombres">
            {reto?.celda ?? ""}
          </span>
          <span className="italic text-slate-400">fx</span>
          <input
            ref={entrada}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            disabled={!reto}
            placeholder={reto ? "Escribe aquí la fórmula, empezando con =" : ""}
            className="min-w-0 flex-1 rounded-md px-2 py-1.5 font-mono text-base focus:bg-blue-50 focus:outline-none"
            spellCheck={false}
            autoComplete="off"
          />
          <button disabled={!reto || !texto.trim()} className="btn-primario !px-3 !py-1.5 text-sm">
            Enter ↵
          </button>
        </form>
        <div className="flex flex-wrap items-center gap-3 border border-slate-300 bg-slate-50 px-3 py-1.5">
          <p
            className={`min-h-5 flex-1 text-sm font-semibold ${mensaje ? (mensaje.bien ? "text-emerald-700" : "text-rose-700") : "text-slate-500"}`}
            aria-live="polite"
          >
            {mensaje?.texto ?? "Tip: mientras escribes la fórmula, haz clic en una celda para agregar su nombre."}
          </p>
          {reto?.pista && (
            <button
              type="button"
              onClick={() => setVerPista((v) => !v)}
              className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800 hover:bg-blue-200"
            >
              {verPista ? "Ocultar pista" : "💡 Ver pista"}
            </button>
          )}
        </div>
        {verPista && reto?.pista && <p className="border-x border-b border-slate-300 bg-blue-50 px-4 py-2 text-sm text-blue-900">{reto.pista}</p>}
      </div>
      <div className="overflow-hidden rounded-b-2xl border border-t-0 border-slate-300 bg-white shadow">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-10 border border-slate-200 bg-slate-100" />
                {Array.from({ length: nCols }, (_, c) => (
                  <th key={c} className="min-w-24 border border-slate-200 bg-slate-100 py-0.5 font-semibold text-slate-600">
                    {letraColumna(c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: nFilas }, (_, f) => (
                <tr key={f}>
                  <td className="border border-slate-200 bg-slate-100 text-center font-semibold text-slate-600">{f + 1}</td>
                  {Array.from({ length: nCols }, (_, c) => {
                    const v = hoja[f]?.[c];
                    const nombre = nombreCelda(f, c);
                    const esReto = retos.some((r) => r.celda === nombre);
                    const resuelto = !!formulas[nombre];
                    const activa = objetivo && objetivo.fila === f && objetivo.col === c;
                    return (
                      <td
                        key={c}
                        onClick={() => clicCelda(f, c)}
                        title={resuelto ? formulas[nombre] : undefined}
                        className={`h-8 cursor-cell border border-slate-200 px-2 ${typeof v === "number" ? "text-right" : "text-left"} ${f === 0 ? "font-bold" : ""} ${
                          activa
                            ? "bg-gold-100 outline outline-2 -outline-offset-1 outline-[#1A73E8]"
                            : resuelto
                              ? "bg-emerald-50 font-semibold text-emerald-900"
                              : esReto
                                ? "bg-gold-50"
                                : "hover:bg-slate-50"
                        }`}
                      >
                        {typeof v === "number" ? mostrarNumero(v) : (v ?? "")}
                        {activa && !resuelto && <span className="text-gold-700">?</span>}
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
