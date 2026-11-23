"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
        <div className="flex items-center gap-2 sm:gap-3">
          <RetoFijo
            key={actual}
            texto={reto ? `🔀 ${reto.texto}` : "🎉 ¡Completaste todos los retos! Puedes seguir probando el filtro."}
            clase={reto ? "bg-blue-900 text-white" : "bg-emerald-50 text-emerald-800"}
          />
          <span className="shrink-0 text-sm font-semibold text-blue-900">
            {hechos.size} de {retos.length}
          </span>
        </div>
        <p className={`text-[13px] font-semibold leading-snug sm:min-h-6 sm:text-sm ${mensaje ? (mensaje.bien ? "text-emerald-700" : "text-rose-700") : "text-slate-500"}`} aria-live="polite">
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
            className={`rounded-full border px-3 py-1 font-semibold shadow-sm pointer-coarse:min-h-10 pointer-coarse:px-4 ${
              estado.activo ? "border-[#7CACF8] bg-[#C2E7FF] text-slate-800" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            } ${reto?.filtroActivo && !estado.activo ? "ring-2 ring-gold-500 ring-offset-1" : ""}`}
          >
            ⏷ {estado.activo ? "Quitar filtro" : "Crear filtro"}
          </button>
          <span className="hidden text-slate-500 sm:inline">Datos › {estado.activo ? "Quitar filtro" : "Crear un filtro"}</span>
          <span className="text-xs text-slate-500 sm:ml-auto">
            {filtrados > 0 ? `${filtrados} fila${filtrados === 1 ? "" : "s"} oculta${filtrados === 1 ? "" : "s"} por el filtro (no se borran)` : "Todas las filas a la vista"}
          </span>
        </div>
        {/* En pantallas pequeñas la tabla se desplaza dentro de su caja (no la página entera); desde md
            cabe y el menú del filtro se despliega como en Sheets, sin recortarse. */}
        <div className="hoja-scroll pb-1">
          <table className="hoja-fija con-fila1 con-numeros w-full min-w-max border-collapse text-sm md:min-w-0">
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
                    <span className="flex items-center justify-between gap-2 whitespace-nowrap">
                      {h}
                      {estado.activo && (
                        <button
                          onClick={() => abrirMenu(c)}
                          aria-label={`Menú del filtro de ${h}`}
                          className={`grid h-7 w-7 shrink-0 place-items-center rounded text-xs pointer-coarse:h-10 pointer-coarse:w-10 pointer-coarse:text-base ${
                            estado.filtros[c] || estado.orden?.columna === c ? "bg-[#0F9D58] text-white" : "text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {estado.filtros[c] ? "⏷" : "▾"}
                        </button>
                      )}
                    </span>
                    {menu === c && (
                      <MenuFiltro
                        titulo={String(h)}
                        alinearDerecha={c >= columnas - 2}
                        valores={valoresDe(c)}
                        marcados={marcados}
                        setMarcados={setMarcados}
                        onCerrar={() => setMenu(null)}
                        onOrdenar={(direccion) =>
                          aplicar(
                            { ...estado, orden: { columna: c, direccion } },
                            direccion === "asc" ? `Ordenaste «${h}» de A → Z (de menor a mayor).` : `Ordenaste «${h}» de Z → A (de mayor a menor).`
                          )
                        }
                        onAceptar={() => {
                          const todos = marcados.length === valoresDe(c).length;
                          const filtros = { ...estado.filtros };
                          if (todos) delete filtros[c];
                          else filtros[c] = marcados;
                          aplicar(
                            { ...estado, filtros },
                            todos ? `Quitaste el filtro de «${h}»: se ven todas sus filas.` : `Filtraste «${h}»: solo se ven ${marcados.join(", ")}.`
                          );
                        }}
                      />
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

/**
 * El reto del bloque fijo. En el celular ocupa a lo sumo dos líneas (para dejar ver la tabla) y se
 * despliega completo al tocarlo; desde sm se ve entero.
 */
function RetoFijo({ texto, clase }: { texto: string; clase: string }) {
  const [abierto, setAbierto] = useState(false);
  const [cortado, setCortado] = useState(false);
  const caja = useRef<HTMLSpanElement>(null);
  // ¿El recorte a dos líneas esconde parte del texto? (solo entonces se ofrece «Ver todo»).
  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const medir = () => setCortado(el.scrollHeight > el.clientHeight + 1);
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const desplegable = cortado || abierto;
  return (
    <button
      type="button"
      onClick={() => desplegable && setAbierto((a) => !a)}
      aria-expanded={desplegable ? abierto : undefined}
      className={`min-w-0 flex-1 cursor-default rounded-2xl px-3 py-2 text-left font-heading text-base font-bold leading-snug sm:px-4 sm:py-3 sm:text-lg ${clase} ${desplegable ? "max-sm:cursor-pointer" : ""}`}
    >
      <span ref={caja} className={abierto ? "block" : "line-clamp-2 sm:line-clamp-none"}>
        {texto}
      </span>
      {desplegable && <span className="mt-0.5 block text-xs font-semibold opacity-75 sm:hidden">{abierto ? "Ver menos ▴" : "Ver todo el reto ▾"}</span>}
    </button>
  );
}

type PropsMenu = {
  titulo: string;
  alinearDerecha: boolean;
  valores: string[];
  marcados: string[];
  setMarcados: React.Dispatch<React.SetStateAction<string[]>>;
  onCerrar: () => void;
  onOrdenar: (direccion: "asc" | "desc") => void;
  onAceptar: () => void;
};

/**
 * Menú ▾ de un encabezado. En computador se despliega bajo el encabezado, como en Sheets; en
 * pantallas pequeñas sería más ancho que la pantalla, así que sale como hoja desde abajo, con
 * fondo oscuro y botón para cerrar.
 */
/** El desplegable de computador, pegado bajo la celda que lo abrió; se cierra si la hoja se desplaza. */
function MenuFlotante({ alinearDerecha, onCerrar, children }: { alinearDerecha: boolean; onCerrar: () => void; children: React.ReactNode }) {
  const ancla = useRef<HTMLSpanElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const cerrarRef = useRef(onCerrar);
  const [pos, setPos] = useState<{ top: number; left?: number; right?: number } | null>(null);
  useEffect(() => {
    cerrarRef.current = onCerrar;
  });
  useLayoutEffect(() => {
    const celda = ancla.current?.parentElement;
    if (!celda) return;
    const r = celda.getBoundingClientRect();
    setPos(alinearDerecha ? { top: r.bottom + 4, right: window.innerWidth - r.right } : { top: r.bottom + 4, left: r.left });
    // Si la hoja o la página se desplazan, el menú quedaría flotando lejos de su columna: se cierra.
    const cerrar = (e: Event) => {
      if (window.matchMedia("(min-width: 768px)").matches && !(e.target instanceof Node && menu.current?.contains(e.target))) cerrarRef.current();
    };
    window.addEventListener("scroll", cerrar, true);
    return () => window.removeEventListener("scroll", cerrar, true);
  }, [alinearDerecha]);
  return (
    <span ref={ancla} className="contents">
      {pos && (
        <div
          ref={menu}
          style={pos}
          className="fixed z-40 hidden w-64 rounded-xl border border-slate-200 bg-white p-2 text-left text-sm font-normal shadow-2xl md:block"
        >
          {children}
        </div>
      )}
    </span>
  );
}

function MenuFiltro(p: PropsMenu) {
  const contenido = (
    <>
      <button onClick={() => p.onOrdenar("asc")} className="block w-full rounded-lg px-3 py-1.5 text-left hover:bg-slate-100 pointer-coarse:py-2.5">
        Ordenar A → Z
      </button>
      <button onClick={() => p.onOrdenar("desc")} className="block w-full rounded-lg px-3 py-1.5 text-left hover:bg-slate-100 pointer-coarse:py-2.5">
        Ordenar Z → A
      </button>
      <hr className="my-1.5 border-slate-200" />
      <p className="px-3 text-xs font-semibold text-slate-500">Filtrar por valores</p>
      <div className="flex gap-3 px-3 py-1 text-xs pointer-coarse:text-sm">
        <button onClick={() => p.setMarcados(p.valores)} className="font-semibold text-[#0B57D0] hover:underline pointer-coarse:min-h-10">
          Seleccionar todo
        </button>
        <button onClick={() => p.setMarcados([])} className="font-semibold text-[#0B57D0] hover:underline pointer-coarse:min-h-10">
          Borrar
        </button>
      </div>
      <div className="max-h-44 overflow-y-auto px-2 max-md:max-h-[40dvh]">
        {p.valores.map((v) => (
          <label key={v} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-slate-50 pointer-coarse:min-h-11 pointer-coarse:gap-3">
            <input
              type="checkbox"
              checked={p.marcados.includes(v)}
              onChange={() => p.setMarcados((m) => (m.includes(v) ? m.filter((x) => x !== v) : [...m, v]))}
              className="h-4 w-4 accent-[#0F9D58] pointer-coarse:h-5 pointer-coarse:w-5"
            />
            {v}
          </label>
        ))}
      </div>
      <div className="mt-2 flex justify-end gap-2">
        <button onClick={p.onCerrar} className="rounded-full px-3 py-1 font-semibold text-slate-600 hover:bg-slate-100 pointer-coarse:min-h-10 pointer-coarse:px-4">
          Cancelar
        </button>
        <button
          disabled={p.marcados.length === 0}
          onClick={p.onAceptar}
          className="rounded-full bg-[#0B57D0] px-4 py-1 font-semibold text-white disabled:opacity-40 pointer-coarse:min-h-10 pointer-coarse:px-5"
        >
          Aceptar
        </button>
      </div>
    </>
  );
  return (
    <>
      {/* Computador: desplegable bajo el encabezado. Flota sobre la página (fixed) para que la hoja,
          que se desplaza dentro de su caja, no lo recorte. */}
      <MenuFlotante alinearDerecha={p.alinearDerecha} onCerrar={p.onCerrar}>
        {contenido}
      </MenuFlotante>
      {/* Celular: hoja inferior. */}
      <div className="fixed inset-0 z-50 bg-slate-900/40 md:hidden" onClick={p.onCerrar} aria-hidden />
      <div
        role="dialog"
        aria-label={`Filtro de ${p.titulo}`}
        className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-2xl border-t border-slate-200 bg-white px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 text-left text-base font-normal shadow-2xl md:hidden"
      >
        <div className="mb-1 flex items-center justify-between gap-2 border-b border-slate-200 pb-1">
          <p className="truncate px-1 font-heading font-bold text-slate-800">Filtro de «{p.titulo}»</p>
          <button onClick={p.onCerrar} aria-label="Cerrar el menú del filtro" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg text-slate-600 hover:bg-slate-100">
            ✕
          </button>
        </div>
        {contenido}
      </div>
    </>
  );
}
