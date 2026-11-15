"use client";

import { useState } from "react";
import type { RetoCondicional } from "@/lib/clase/tipos";
import { letraColumna } from "@/lib/clase/formulas";
import { useProgreso } from "../progreso";

type Datos = { hechos: number[]; fallos: number };
type Condicion = RetoCondicional["condicion"];
type Color = NonNullable<RetoCondicional["color"]>;
type Regla = { columna: number; condicion: Condicion; valor: string; color: Color };

const CONDICIONES: { id: Exclude<Condicion, "escala">; nombre: string }[] = [
  { id: "menor", nombre: "Es menor que" },
  { id: "mayor", nombre: "Es mayor que" },
  { id: "igual", nombre: "Es igual a" },
  { id: "contiene", nombre: "El texto contiene" },
];
const COLORES: Record<Color, { nombre: string; celda: string; muestra: string }> = {
  rojo: { nombre: "Rojo", celda: "bg-[#F4C7C3] text-[#A50E0E]", muestra: "bg-[#F4C7C3]" },
  amarillo: { nombre: "Amarillo", celda: "bg-[#FCE8B2] text-[#7A5900]", muestra: "bg-[#FCE8B2]" },
  verde: { nombre: "Verde", celda: "bg-[#B7E1CD] text-[#0D652D]", muestra: "bg-[#B7E1CD]" },
};

const normal = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/** "1.500" o "1500" → 1500; "36,5" → 36.5 (como se escribe en Colombia). */
const numero = (t: string) => Number(t.trim().replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));

function seCumple(r: Regla, v: string | number) {
  if (r.condicion === "contiene") return r.valor !== "" && normal(String(v)).includes(normal(r.valor));
  if (r.condicion === "igual") return normal(String(v)) === normal(r.valor);
  const n = numero(r.valor);
  if (typeof v !== "number" || r.valor === "" || Number.isNaN(n)) return false;
  return r.condicion === "menor" ? v < n : v > n;
}

function coincide(r: Regla, reto: RetoCondicional) {
  if (r.columna !== reto.columna || r.condicion !== reto.condicion) return false;
  if (reto.condicion === "escala") return true;
  if (reto.color && r.color !== reto.color) return false;
  if (typeof reto.valor === "number") return numero(r.valor) === reto.valor;
  return normal(r.valor) === normal(String(reto.valor ?? ""));
}

/**
 * Formato condicional como en Google Sheets: un panel para crear reglas (intervalo, condición,
 * valor y color) o una escala de colores, y la tabla se pinta en vivo. La primera regla que se
 * cumple manda, como en Sheets.
 */
export default function Condicional({ id, datos: tabla, retos }: { id: string; datos: (string | number)[][]; retos: RetoCondicional[] }) {
  const { datos, guardar } = useProgreso<Datos>(id);
  const hechos = new Set(datos?.hechos ?? []);
  const actual = retos.findIndex((_, i) => !hechos.has(i));
  const reto = actual === -1 ? null : retos[actual];
  const [encabezados, ...filas] = tabla;
  const [reglas, setReglas] = useState<Regla[]>([]);
  const [pestana, setPestana] = useState<"unico" | "escala">("unico");
  const [borrador, setBorrador] = useState<Regla>({ columna: 0, condicion: "menor", valor: "", color: "rojo" });
  const [mensaje, setMensaje] = useState<{ bien: boolean; texto: string } | null>(null);

  const rango = (c: number) => `${letraColumna(c)}2:${letraColumna(c)}${filas.length + 1}`;

  function listo() {
    const regla: Regla = pestana === "escala" ? { ...borrador, condicion: "escala", valor: "" } : borrador;
    if (regla.condicion !== "escala" && regla.valor.trim() === "") return setMensaje({ bien: false, texto: "Escribe el valor de la condición (por ejemplo 50)." });
    const nuevas = [...reglas, regla];
    setReglas(nuevas);
    const desc =
      regla.condicion === "escala"
        ? `Pusiste una escala de colores en ${rango(regla.columna)} (${encabezados[regla.columna]}).`
        : `Regla en ${rango(regla.columna)}: «${CONDICIONES.find((c) => c.id === regla.condicion)!.nombre.toLowerCase()} ${regla.valor}» en ${COLORES[regla.color].nombre.toLowerCase()}.`;
    if (reto && coincide(regla, reto)) {
      const n = new Set(hechos).add(actual);
      guardar({ hechos: [...n], fallos: datos?.fallos ?? 0 }, retos.every((_, i) => n.has(i)));
      setMensaje({ bien: true, texto: `¡Bien! ${desc}` });
      setBorrador((b) => ({ ...b, valor: "" }));
    } else if (reto) {
      guardar({ hechos: [...hechos], fallos: (datos?.fallos ?? 0) + 1 }, false);
      setMensaje({ bien: false, texto: `${desc} No es lo que pide el reto: bórrala con 🗑 y revisa el intervalo, la condición, el valor y el color.` });
    } else setMensaje({ bien: true, texto: desc });
  }

  // Escala de colores: de blanco (mínimo) a verde (máximo).
  function estiloEscala(c: number, v: number) {
    const nums = filas.map((f) => f[c]).filter((x): x is number => typeof x === "number");
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const t = max === min ? 1 : (v - min) / (max - min);
    return { backgroundColor: `rgb(${Math.round(255 - t * 168)}, ${Math.round(255 - t * 68)}, ${Math.round(255 - t * 120)})` };
  }

  return (
    <div className="flex flex-col">
      <div className="sticky top-11 z-20 -mx-1 flex flex-col gap-2 bg-[var(--background)] px-1 pb-2 pt-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className={`flex-1 rounded-2xl px-4 py-3 font-heading text-lg font-bold ${reto ? "bg-blue-900 text-white" : "bg-emerald-50 text-emerald-800"}`}>
            {reto ? `🎨 ${reto.texto}` : "🎉 ¡Completaste todos los retos! Puedes seguir probando reglas."}
          </div>
          <span className="text-sm font-semibold text-blue-900">
            {hechos.size} de {retos.length}
          </span>
        </div>
        <p className={`min-h-6 text-sm font-semibold ${mensaje ? (mensaje.bien ? "text-emerald-700" : "text-rose-700") : "text-slate-500"}`} aria-live="polite">
          {mensaje?.texto ?? "Arma la regla en el panel de la derecha y pulsa «Listo». La tabla se pinta sola."}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
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
              <tr>
                <td className="border border-slate-200 bg-slate-100 text-center font-semibold text-slate-600">1</td>
                {encabezados.map((h, c) => (
                  <td key={c} className="border border-slate-200 px-2 py-1 font-bold">
                    {h}
                  </td>
                ))}
              </tr>
              {filas.map((f, i) => (
                <tr key={i}>
                  <td className="border border-slate-200 bg-slate-100 text-center font-semibold text-slate-600">{i + 2}</td>
                  {encabezados.map((_, c) => {
                    const v = f[c] ?? "";
                    // La primera regla que se cumple manda (como en Sheets).
                    const regla = reglas.find((r) => r.columna === c && (r.condicion === "escala" ? typeof v === "number" : seCumple(r, v)));
                    const clase = regla && regla.condicion !== "escala" ? COLORES[regla.color].celda : "";
                    const estilo = regla?.condicion === "escala" && typeof v === "number" ? estiloEscala(c, v) : undefined;
                    const pintable = borrador.columna === c;
                    return (
                      <td
                        key={c}
                        style={estilo}
                        className={`h-8 border border-slate-200 px-2 transition-colors ${typeof v === "number" ? "text-right" : "text-left"} ${clase} ${
                          pintable ? "outline outline-1 -outline-offset-1 outline-[#1A73E8]" : ""
                        }`}
                      >
                        {typeof v === "number" ? v.toLocaleString("es-CO") : v}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="self-start rounded-2xl border border-slate-300 bg-white p-4 text-sm shadow">
          <p className="font-heading font-bold text-slate-800">Reglas de formato condicional</p>
          <div className="mt-3 flex rounded-full bg-slate-100 p-1 text-xs font-semibold">
            {(["unico", "escala"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPestana(p)}
                className={`flex-1 rounded-full px-2 py-1.5 ${pestana === p ? "bg-white text-[#0B57D0] shadow" : "text-slate-600"}`}
              >
                {p === "unico" ? "Color único" : "Escala de colores"}
              </button>
            ))}
          </div>
          <label className="mt-3 block text-xs font-semibold text-slate-600">
            Aplicar al intervalo
            <select
              value={borrador.columna}
              onChange={(e) => setBorrador({ ...borrador, columna: Number(e.target.value) })}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-2 py-1.5 font-mono text-sm"
            >
              {encabezados.map((h, c) => (
                <option key={c} value={c}>
                  {rango(c)} · {h}
                </option>
              ))}
            </select>
          </label>
          {pestana === "unico" ? (
            <>
              <label className="mt-3 block text-xs font-semibold text-slate-600">
                Dar formato a celdas si…
                <select
                  value={borrador.condicion}
                  onChange={(e) => setBorrador({ ...borrador, condicion: e.target.value as Condicion })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                >
                  {CONDICIONES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <input
                value={borrador.valor}
                onChange={(e) => setBorrador({ ...borrador, valor: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && listo()}
                placeholder="Valor o fórmula"
                className="mt-2 block w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              />
              <p className="mt-3 text-xs font-semibold text-slate-600">Estilo de formato</p>
              <div className="mt-1 flex gap-2">
                {(Object.keys(COLORES) as Color[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => setBorrador({ ...borrador, color: k })}
                    className={`h-8 flex-1 rounded-lg text-xs font-semibold ${COLORES[k].muestra} ${borrador.color === k ? "ring-2 ring-[#0B57D0] ring-offset-1" : ""}`}
                  >
                    {COLORES[k].nombre}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-3">
              <p className="text-xs font-semibold text-slate-600">Vista previa</p>
              <div className="mt-1 h-6 rounded-lg bg-gradient-to-r from-white to-[#57BB8A] ring-1 ring-slate-200" />
              <p className="mt-1 flex justify-between text-[11px] text-slate-500">
                <span>Mínimo</span>
                <span>Máximo</span>
              </p>
            </div>
          )}
          <button onClick={listo} className="mt-4 w-full rounded-full bg-[#0B57D0] py-2 font-semibold text-white hover:bg-[#0842A0]">
            Listo
          </button>
          {reglas.length > 0 && (
            <ul className="mt-4 flex flex-col gap-1.5 border-t border-slate-200 pt-3">
              {reglas.map((r, i) => (
                <li key={i} className="flex items-center gap-2 text-xs">
                  <span className={`h-5 w-5 shrink-0 rounded ${r.condicion === "escala" ? "bg-gradient-to-r from-white to-[#57BB8A] ring-1 ring-slate-200" : COLORES[r.color].muestra}`} />
                  <span className="min-w-0 flex-1">
                    <span className="font-mono">{rango(r.columna)}</span>{" "}
                    {r.condicion === "escala" ? "escala de colores" : `${CONDICIONES.find((c) => c.id === r.condicion)!.nombre.toLowerCase()} ${r.valor}`}
                  </span>
                  <button onClick={() => setReglas(reglas.filter((_, j) => j !== i))} aria-label="Borrar regla" className="rounded px-1 hover:bg-slate-100">
                    🗑
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
