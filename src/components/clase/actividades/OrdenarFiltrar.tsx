"use client";

import { useState } from "react";
import type { RetoOrdenar } from "@/lib/clase/tipos";
import { letraColumna } from "@/lib/clase/formulas";
import { useProgreso } from "../progreso";

type Datos = { hechos: number[]; fallos: number };
type Estado = { activo: boolean; orden: { columna: number; direccion: "asc" | "desc" } | null; filtros: Record<number, string[]> };

const FECHA = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const clave = (v: string | number) => {
  if (typeof v === "number") return v;
  const f = FECHA.exec(v);
  return f ? Number(`${f[3]}${f[2]}${f[1]}`) : v;
};
function comparar(a: string | number, b: string | number) {
  const x = clave(a);
  const y = clave(b);
  if (typeof x === "number" && typeof y === "number") return x - y;
  return String(x).localeCompare(String(y), "es");
}
const mismos = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

/** ¿La tabla quedó como pide el reto? */
function cumple(reto: RetoOrdenar, e: Estado, columnas: number) {
  if (reto.filtroActivo && !e.activo) return false;
  if (reto.orden && (e.orden?.columna !== reto.orden.columna || e.orden.direccion !== reto.orden.direccion)) return false;
  const activos = Object.entries(e.filtros).filter(([, v]) => v !== undefined);
  if (reto.filtro === null && activos.length) return false;
  if (reto.filtro) {
    const v = e.filtros[reto.filtro.columna];
    if (!v || !mismos(v, reto.filtro.valores)) return false;
    if (activos.some(([c]) => Number(c) !== reto.filtro!.columna)) return false;
  }
  return columnas > 0;
}

/**
 * Ordenar y filtrar como en Google Sheets: se crea el filtro y cada encabezado tiene su menú ▾
 * con «Ordenar A → Z / Z → A» y «Filtrar por valores». Los retos se cumplen cuando la tabla queda
 * como se pide.
 */
export default function OrdenarFiltrar({ id, datos: tabla, retos }: { id: string; datos: (string | number)[][]; retos: RetoOrdenar[] }) {
  const { datos, guardar } = useProgreso<Datos>(id);
  const hechos = new Set(datos?.hechos ?? []);
  const actual = retos.findIndex((_, i) => !hechos.has(i));
  const reto = actual === -1 ? null : retos[actual];
  const [estado, setEstado] = useState<Estado>({ activo: false, orden: null, filtros: {} });
  const [menu, setMenu] = useState<number | null>(null);
  const [marcados, setMarcados] = useState<string[]>([]);
  const [mensaje, setMensaje] = useState<{ bien: boolean; texto: string } | null>(null);

  const [encabezados, ...filas] = tabla;
  const columnas = encabezados.length;

  function aplicar(nuevo: Estado, accion: string) {
    setEstado(nuevo);
    setMenu(null);
    if (!reto) return setMensaje({ bien: true, texto: accion });
    if (cumple(reto, nuevo, columnas)) {
      const n = new Set(hechos).add(actual);
      guardar({ hechos: [...n], fallos: datos?.fallos ?? 0 }, retos.every((_, i) => n.has(i)));
      setMensaje({ bien: true, texto: `¡Bien! ${accion}` });
    } else {
      guardar({ hechos: [...hechos], fallos: (datos?.fallos ?? 0) + 1 }, false);
      setMensaje({ bien: false, texto: `${accion} Pero eso no es lo que pide el reto: léelo otra vez.` });
    }
  }

  function abrirMenu(c: number) {
    if (menu === c) return setMenu(null);
    setMenu(c);
    setMarcados(estado.filtros[c] ?? valoresDe(c));
  }
  const valoresDe = (c: number) => [...new Set(filas.map((f) => String(f[c] ?? "")))].sort((a, b) => comparar(a, b));

  // Ordenar mueve las filas de verdad (se renumeran); filtrar solo las oculta (los números se saltan).
  const ordenadas = [...filas].sort((a, b) =>
    estado.orden ? comparar(a[estado.orden.columna], b[estado.orden.columna]) * (estado.orden.direccion === "asc" ? 1 : -1) : 0
  );
  const visibles = ordenadas.filter((f) => Object.entries(estado.filtros).every(([c, vals]) => vals.includes(String(f[Number(c)] ?? ""))));
  const filtrados = filas.length - visibles.length;

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-20 -mx-1 flex flex-col gap-2 bg-[var(--background)] px-1 pb-2 pt-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className={`flex-1 rounded-2xl px-4 py-3 font-heading text-lg font-bold ${reto ? "bg-blue-900 text-white" : "bg-emerald-50 text-emerald-800"}`}>
            {reto ? `🔀 ${reto.texto}` : "🎉 ¡Completaste todos los retos! Puedes seguir probando el filtro."}
          </div>
          <span className="text-sm font-semibold text-blue-900">
            {hechos.size} de {retos.length}
          </span>
        </div>
        <p className={`min-h-6 text-sm font-semibold ${mensaje ? (mensaje.bien ? "text-emerald-700" : "text-rose-700") : "text-slate-500"}`} aria-live="polite">
          {mensaje?.texto ?? "Primero crea el filtro con el botón de la barra. Después usa el ▾ de cada encabezado."}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-300 bg-white shadow">
        <div className="flex flex-wrap items-center gap-2 rounded-t-2xl border-b border-slate-200 bg-[#EDF2FA] px-3 py-1.5 text-sm">
          <button
            onClick={() =>
              aplicar(
                estado.activo ? { activo: false, orden: estado.orden, filtros: {} } : { ...estado, activo: true },
                estado.activo ? "Quitaste el filtro: se ven todas las filas otra vez." : "Creaste el filtro: ahora cada encabezado tiene su ▾."
              )
            }
            className={`rounded-full px-3 py-1 font-semibold ${estado.activo ? "bg-[#C2E7FF] text-slate-800" : "bg-white text-slate-700 hover:bg-slate-100"}`}
            title="Crear un filtro"
          >
            ⏷ {estado.activo ? "Quitar filtro" : "Crear filtro"}
          </button>
          <span className="text-slate-500">Datos › {estado.activo ? "Quitar filtro" : "Crear un filtro"}</span>
          <span className="ml-auto text-xs text-slate-500">
            {filtrados > 0 ? `${filtrados} fila${filtrados === 1 ? "" : "s"} oculta${filtrados === 1 ? "" : "s"} por el filtro (no se borran)` : "Todas las filas a la vista"}
          </span>
        </div>
        <div className="pb-1">
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
                  <td key={c} className={`relative border border-slate-200 px-2 py-1 font-bold ${estado.activo ? "bg-[#E6F4EA]" : ""}`}>
                    <span className="flex items-center justify-between gap-2">
                      {h}
                      {estado.activo && (
                        <button
                          onClick={() => abrirMenu(c)}
                          aria-label={`Menú del filtro de ${h}`}
                          className={`grid h-6 w-6 place-items-center rounded text-xs ${
                            estado.filtros[c] || estado.orden?.columna === c ? "bg-[#0F9D58] text-white" : "text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {estado.filtros[c] ? "⏷" : "▾"}
                        </button>
                      )}
                    </span>
                    {menu === c && (
                      <div className={`absolute top-full z-30 mt-1 w-64 ${c >= columnas - 2 ? "right-0" : "left-0"} rounded-xl border border-slate-200 bg-white p-2 text-left text-sm font-normal shadow-2xl`}>
                        <button
                          onClick={() => aplicar({ ...estado, orden: { columna: c, direccion: "asc" } }, `Ordenaste «${h}» de A → Z (de menor a mayor).`)}
                          className="block w-full rounded-lg px-3 py-1.5 text-left hover:bg-slate-100"
                        >
                          Ordenar A → Z
                        </button>
                        <button
                          onClick={() => aplicar({ ...estado, orden: { columna: c, direccion: "desc" } }, `Ordenaste «${h}» de Z → A (de mayor a menor).`)}
                          className="block w-full rounded-lg px-3 py-1.5 text-left hover:bg-slate-100"
                        >
                          Ordenar Z → A
                        </button>
                        <hr className="my-1.5 border-slate-200" />
                        <p className="px-3 text-xs font-semibold text-slate-500">Filtrar por valores</p>
                        <div className="flex gap-3 px-3 py-1 text-xs">
                          <button onClick={() => setMarcados(valoresDe(c))} className="font-semibold text-[#0B57D0] hover:underline">
                            Seleccionar todo
                          </button>
                          <button onClick={() => setMarcados([])} className="font-semibold text-[#0B57D0] hover:underline">
                            Borrar
                          </button>
                        </div>
                        <div className="max-h-44 overflow-y-auto px-2">
                          {valoresDe(c).map((v) => (
                            <label key={v} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-slate-50">
                              <input
                                type="checkbox"
                                checked={marcados.includes(v)}
                                onChange={() => setMarcados((m) => (m.includes(v) ? m.filter((x) => x !== v) : [...m, v]))}
                                className="h-4 w-4 accent-[#0F9D58]"
                              />
                              {v}
                            </label>
                          ))}
                        </div>
                        <div className="mt-2 flex justify-end gap-2">
                          <button onClick={() => setMenu(null)} className="rounded-full px-3 py-1 font-semibold text-slate-600 hover:bg-slate-100">
                            Cancelar
                          </button>
                          <button
                            disabled={marcados.length === 0}
                            onClick={() => {
                              const todos = marcados.length === valoresDe(c).length;
                              const filtros = { ...estado.filtros };
                              if (todos) delete filtros[c];
                              else filtros[c] = marcados;
                              aplicar(
                                { ...estado, filtros },
                                todos ? `Quitaste el filtro de «${h}»: se ven todas sus filas.` : `Filtraste «${h}»: solo se ven ${marcados.join(", ")}.`
                              );
                            }}
                            className="rounded-full bg-[#0B57D0] px-4 py-1 font-semibold text-white disabled:opacity-40"
                          >
                            Aceptar
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                ))}
              </tr>
              {visibles.map((f) => {
                const n = ordenadas.indexOf(f) + 2;
                return (
                  <tr key={filas.indexOf(f)}>
                    <td className="border border-slate-200 bg-slate-100 text-center font-semibold text-slate-600">{n}</td>
                    {encabezados.map((_, c) => {
                      const v = f[c] ?? "";
                      return (
                        <td key={c} className={`h-8 border border-slate-200 px-2 ${typeof v === "number" ? "text-right" : "text-left"}`}>
                          {typeof v === "number" ? v.toLocaleString("es-CO") : v}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {/* Filas vacías, como la cuadrícula de Sheets: la tabla no se encoge al filtrar (y el menú cabe). */}
              {Array.from({ length: filas.length - visibles.length + 2 }, (_, i) => (
                <tr key={`vacia-${i}`}>
                  <td className="border border-slate-200 bg-slate-100 text-center font-semibold text-slate-400">{filas.length + 2 + i}</td>
                  {encabezados.map((_, c) => (
                    <td key={c} className="h-8 border border-slate-200" />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Fíjate en los números de fila de la izquierda: al filtrar se saltan (las filas siguen ahí, ocultas). Al ordenar, cada fila se mueve completa.
      </p>
    </div>
  );
}
