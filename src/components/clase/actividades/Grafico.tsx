"use client";

import { useState } from "react";
import type { RetoGrafico, TipoGrafico } from "@/lib/clase/tipos";
import { letraColumna, mostrarNumero } from "@/lib/clase/formulas";
import { useProgreso } from "../progreso";
import GraficoSVG from "../GraficoSVG";

type Datos = { hechos: number[]; fallos: number };

export const TIPOS_GRAFICO: { id: TipoGrafico; nombre: string; icono: string; uso: string }[] = [
  { id: "columnas", nombre: "Columnas", icono: "📊", uso: "Las columnas comparan cantidades entre categorías (servicios, sedes, áreas)." },
  { id: "barras", nombre: "Barras", icono: "📶", uso: "Las barras horizontales comparan categorías cuando los nombres son largos o son muchas." },
  { id: "lineas", nombre: "Líneas", icono: "📈", uso: "Las líneas muestran cómo cambia algo en el tiempo (días, meses, años)." },
  { id: "circular", nombre: "Circular", icono: "🥧", uso: "El circular muestra cómo se reparte un total en pocas partes (máximo 5 o 6)." },
];

/**
 * Gráficos como en el editor de Google Sheets: se escoge el tipo, la columna de las etiquetas
 * (eje X) y la de los valores, y el gráfico se dibuja en vivo. Cada reto pide el gráfico que
 * mejor responde una pregunta; al fallar el tipo se explica para qué sirve el que escogió.
 */
export default function Grafico({ id, datos: base, retos }: { id: string; datos: (string | number)[][]; retos: RetoGrafico[] }) {
  const { datos, guardar } = useProgreso<Datos>(id);
  const hechos = new Set(datos?.hechos ?? []);
  const actual = retos.findIndex((_, i) => !hechos.has(i));
  const [visto, setVisto] = useState<number | null>(null);
  const indice = visto ?? (actual === -1 ? retos.length - 1 : actual);
  const reto = retos[indice];
  const tabla = reto.datos ?? base;
  const [encabezados, ...filas] = tabla;

  // Sin tipo al empezar: escogerlo es justo lo que se practica.
  const [tipo, setTipo] = useState<TipoGrafico | null>(null);
  const columnaFinal = (t: (string | number)[][]) => t[0].length - 1;
  const [etiquetas, setEtiquetas] = useState(0);
  const [serie, setSerie] = useState(() => columnaFinal(base));
  const [titulo, setTitulo] = useState("");
  const [mensaje, setMensaje] = useState<{ bien: boolean; texto: string } | null>(null);

  const numericas = encabezados.map((_, c) => filas.every((f) => typeof f[c] === "number"));
  const valores = filas.map((f) => (typeof f[serie] === "number" ? (f[serie] as number) : 0));
  const nombres = filas.map((f) => String(f[etiquetas] ?? ""));

  function reiniciar(i: number | null) {
    setVisto(i);
    setTipo(null);
    setEtiquetas(0);
    const t = retos[i ?? (actual === -1 ? retos.length - 1 : actual)]?.datos ?? base;
    setSerie(columnaFinal(t));
    setTitulo("");
  }

  function insertar() {
    const fallar = (t: string) => {
      guardar({ hechos: [...hechos], fallos: (datos?.fallos ?? 0) + 1 }, false);
      setMensaje({ bien: false, texto: t });
    };
    if (!tipo) return setMensaje({ bien: false, texto: "Primero escoge un tipo de gráfico en el editor." });
    if (!numericas[serie]) return fallar(`La serie (los valores) tiene que ser una columna de números; «${encabezados[serie]}» es texto.`);
    if (etiquetas !== reto.etiquetas || serie !== reto.serie)
      return fallar(`Revisa las columnas: ¿qué va en el eje X (los nombres) y qué cantidad se dibuja? Ahora muestras «${encabezados[serie]}» por «${encabezados[etiquetas]}».`);
    if (tipo !== reto.tipo) {
      const elegido = TIPOS_GRAFICO.find((t) => t.id === tipo)!;
      return fallar(`${elegido.uso} ¿Es lo que pide la pregunta? Prueba con otro tipo.`);
    }
    if (reto.titulo && titulo.trim().length < 4) return fallar("Casi: ponle un título que diga qué muestra el gráfico (en «Personalizar › Título»).");
    if (hechos.has(indice)) return setMensaje({ bien: true, texto: `¡Así es! ${reto.porque ?? ""}` });
    const n = new Set(hechos).add(indice);
    guardar({ hechos: [...n], fallos: datos?.fallos ?? 0 }, retos.every((_, i) => n.has(i)));
    setVisto(indice); // el gráfico resuelto queda a la vista hasta pulsar «Siguiente reto»
    setMensaje({ bien: true, texto: `¡Muy bien! ${reto.porque ?? ""}` });
  }

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-20 -mx-1 flex flex-col gap-2 bg-[var(--background)] px-1 pb-2 pt-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className={`flex-1 rounded-2xl px-4 py-3 font-heading text-lg font-bold ${hechos.has(indice) ? "bg-emerald-50 text-emerald-800" : "bg-blue-900 text-white"}`}>
            {hechos.has(indice) ? "✅ " : "📊 "}
            {reto.texto}
          </div>
          <div className="flex items-center gap-1">
            {retos.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  reiniciar(i === actual ? null : i);
                  setMensaje(null);
                }}
                disabled={!hechos.has(i) && i !== actual}
                title={`Reto ${i + 1}`}
                className={`h-7 w-7 rounded-full text-xs font-bold ${i === indice ? "ring-2 ring-blue-900" : ""} ${
                  hechos.has(i) ? "bg-emerald-500 text-white" : i === actual ? "bg-gold-500 text-blue-900" : "bg-slate-200 text-slate-400"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className={`min-h-6 flex-1 text-sm font-semibold ${mensaje ? (mensaje.bien ? "text-emerald-700" : "text-rose-700") : "text-slate-500"}`} aria-live="polite">
            {mensaje?.texto ?? "Arma el gráfico en el editor de la derecha y pulsa «Insertar gráfico»."}
          </p>
          {mensaje?.bien && actual !== -1 && actual !== indice && (
            <button
              onClick={() => {
                reiniciar(null);
                setMensaje(null);
              }}
              className="btn-primario !px-3 !py-1.5 text-sm"
            >
              Siguiente reto →
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_290px]">
        <div className="flex flex-col gap-3">
          <div className="overflow-x-auto rounded-2xl border border-slate-300 bg-white shadow">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="w-10 border border-slate-200 bg-slate-100" />
                  {encabezados.map((_, c) => (
                    <th key={c} className="border border-slate-200 bg-slate-100 py-0.5 font-semibold text-slate-600">
                      {letraColumna(c)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tabla.map((fila, f) => (
                  <tr key={f}>
                    <td className="border border-slate-200 bg-slate-100 text-center font-semibold text-slate-600">{f + 1}</td>
                    {fila.map((v, c) => (
                      <td
                        key={c}
                        className={`border border-slate-200 px-2 py-0.5 ${typeof v === "number" ? "text-right" : ""} ${f === 0 ? "font-bold" : ""} ${
                          c === serie ? "bg-blue-50" : c === etiquetas ? "bg-gold-50" : ""
                        }`}
                      >
                        {typeof v === "number" ? mostrarNumero(v) : v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {tipo ? (
            <GraficoSVG tipo={tipo} etiquetas={nombres} valores={valores} titulo={titulo} nombreSerie={String(encabezados[serie])} />
          ) : (
            <div className="grid min-h-48 place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">
              Escoge un tipo de gráfico en el editor para ver cómo queda.
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-3 self-start rounded-2xl border border-slate-300 bg-white p-4 shadow">
          <p className="font-heading font-bold text-blue-900">Editor de gráficos</p>
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Tipo de gráfico</p>
            <div className="grid grid-cols-2 gap-2">
              {TIPOS_GRAFICO.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTipo(t.id)}
                  aria-pressed={tipo === t.id}
                  className={`rounded-xl border-2 px-2 py-2 text-sm font-semibold ${tipo === t.id ? "border-blue-700 bg-blue-50 text-blue-900" : "border-slate-200 text-slate-700 hover:border-blue-300"}`}
                >
                  <span className="mr-1" aria-hidden>
                    {t.icono}
                  </span>
                  {t.nombre}
                </button>
              ))}
            </div>
          </div>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
              <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-gold-100 align-middle" />
              Eje X (etiquetas)
            </span>
            <select value={etiquetas} onChange={(e) => setEtiquetas(Number(e.target.value))} className="w-full rounded-lg border border-slate-300 px-2 py-1.5">
              {encabezados.map((h, c) => (
                <option key={c} value={c}>
                  {letraColumna(c)} · {h}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
              <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-blue-200 align-middle" />
              Serie (valores)
            </span>
            <select value={serie} onChange={(e) => setSerie(Number(e.target.value))} className="w-full rounded-lg border border-slate-300 px-2 py-1.5">
              {encabezados.map((h, c) => (
                <option key={c} value={c}>
                  {letraColumna(c)} · {h}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Personalizar › Título</span>
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Escribe un título" className="w-full rounded-lg border border-slate-300 px-2 py-1.5" />
          </label>
          <button onClick={insertar} className="btn-cta mt-1">
            Insertar gráfico
          </button>
        </aside>
      </div>
    </div>
  );
}
