"use client";

import { useEffect, useRef, useState } from "react";
import type { ResumenDinamica, RetoDinamica } from "@/lib/clase/tipos";
import { mostrarNumero } from "@/lib/clase/formulas";
import { calcularDinamica, faltaEnDinamica, valoresDistintos, type ConfigDinamica } from "@/lib/clase/dinamica";
import { useDispositivo } from "@/lib/clase/dispositivo";
import { useProgreso } from "../progreso";
import GraficoSVG from "../GraficoSVG";

type Datos = { hechos: number[]; fallos: number };

const RESUMENES: { id: ResumenDinamica; nombre: string }[] = [
  { id: "SUMA", nombre: "SUMA (SUM)" },
  { id: "CONTARA", nombre: "CONTARA (COUNTA)" },
  { id: "PROMEDIO", nombre: "PROMEDIO (AVERAGE)" },
  { id: "MAX", nombre: "MAX" },
  { id: "MIN", nombre: "MIN" },
];

const VACIA: ConfigDinamica = { filas: null, columnas: null, valores: null, filtro: null };

/** "1.234" o "1234" o "1234,5" → número (como se escribe en Colombia). */
const leerNumero = (t: string) => Number(t.trim().replace(/\$|\s/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));

/**
 * Tabla dinámica como en el editor de Google Sheets: se llevan campos a Filas, Columnas, Valores
 * (con «Resumir por») y Filtros, y la tabla se arma en vivo. El reto se cumple cuando el editor
 * queda como se pide; si trae pregunta, además hay que leer el número en la tabla.
 */
export default function Dinamica({ id, datos: tabla, retos }: { id: string; datos: (string | number)[][]; retos: RetoDinamica[] }) {
  const { datos, guardar } = useProgreso<Datos>(id);
  const hechos = new Set(datos?.hechos ?? []);
  const actual = retos.findIndex((_, i) => !hechos.has(i));
  const reto = actual === -1 ? null : retos[actual];
  const encabezados = tabla[0].map(String);
  const numericas = encabezados.map((_, c) => tabla.slice(1).every((f) => typeof f[c] === "number"));

  const [config, setConfig] = useState<ConfigDinamica>(VACIA);
  const [respuesta, setRespuesta] = useState("");
  const [mensaje, setMensaje] = useState<{ bien: boolean; texto: string } | null>(null);
  const [verDatos, setVerDatos] = useState(false);
  const [verGrafico, setVerGrafico] = useState(false);
  const [pista, setPista] = useState<string | null>(null);
  // Celular y tableta: editor y tabla no caben a la vista a la vez, se alternan con pestañas.
  const [vista, setVista] = useState<"editor" | "tabla">("editor");
  const celular = useDispositivo() === "celular";

  const r = calcularDinamica(tabla, config);
  const cumple = reto ? faltaEnDinamica(config, reto) === null : false;
  const conGrafico = config.filas !== null && config.columnas === null && config.valores !== null;

  function completar() {
    const n = new Set(hechos).add(actual);
    guardar({ hechos: [...n], fallos: datos?.fallos ?? 0 }, retos.every((_, i) => n.has(i)));
    setMensaje({ bien: true, texto: actual + 1 < retos.length ? "¡Bien! Así queda. Sigue con el próximo reto (puedes cambiar o quitar campos)." : "🎉 ¡Completaste todos los retos!" });
    setRespuesta("");
    setPista(null);
  }

  function cambiar(nueva: ConfigDinamica) {
    setConfig(nueva);
    setPista(null);
    setMensaje(null);
    // Si el editor ya quedó bien, en pantallas pequeñas se pasa a la tabla: ahí está el resultado
    // (y la pregunta, si el reto la trae).
    if (reto && faltaEnDinamica(nueva, reto) === null) setVista("tabla");
    // Sin pregunta, el reto se cumple apenas el editor queda bien (como en Sheets, todo es en vivo).
    if (reto && reto.respuesta === undefined && faltaEnDinamica(nueva, reto) === null) {
      const n = new Set(hechos).add(actual);
      guardar({ hechos: [...n], fallos: datos?.fallos ?? 0 }, retos.every((_, i) => n.has(i)));
      setMensaje({ bien: true, texto: actual + 1 < retos.length ? "¡Bien! Así queda. Sigue con el próximo reto (puedes cambiar o quitar campos)." : "🎉 ¡Completaste todos los retos!" });
    }
  }

  function revisarRespuesta(e: React.FormEvent) {
    e.preventDefault();
    if (!reto || reto.respuesta === undefined) return;
    const n = leerNumero(respuesta);
    if (!Number.isNaN(n) && Math.abs(n - reto.respuesta) < 0.5) return completar();
    guardar({ hechos: [...hechos], fallos: (datos?.fallos ?? 0) + 1 }, false);
    setMensaje({ bien: false, texto: "Ese no es el número. Busca en la tabla el cruce de la fila y la columna que pide la pregunta." });
  }

  function pedirPista() {
    if (!reto) return;
    guardar({ hechos: [...hechos], fallos: (datos?.fallos ?? 0) + 1 }, false);
    setPista(faltaEnDinamica(config, reto) ?? "¡El editor ya está bien!");
  }

  /** La pregunta del reto. En computador va en el bloque fijo; en pantallas pequeñas, debajo de la
   * tabla (si fuera arriba, el teclado del celular taparía el número que hay que leer). */
  const formulario = (enBloqueFijo: boolean) =>
    reto?.respuesta !== undefined &&
    cumple && (
      <form
        onSubmit={revisarRespuesta}
        className={`flex-wrap items-center gap-2 rounded-2xl bg-gold-50 px-4 py-2 ${enBloqueFijo ? "hidden lg:flex" : "flex ring-2 ring-gold-500/60 lg:hidden"}`}
      >
        <span className="font-semibold text-blue-950">✔ La tabla está bien armada. {reto.pregunta}</span>
        <input
          value={respuesta}
          onChange={(e) => setRespuesta(e.target.value)}
          inputMode="decimal"
          enterKeyHint="done"
          placeholder="Escribe el número"
          aria-label="Tu respuesta"
          className="w-40 rounded-lg border border-slate-300 px-2 py-1 text-base pointer-coarse:min-h-11 pointer-fine:text-sm"
          autoFocus={enBloqueFijo && !celular}
        />
        <button disabled={!respuesta.trim()} className="btn-primario !px-3 !py-1 text-sm pointer-coarse:min-h-11 pointer-coarse:!px-4">
          Responder
        </button>
      </form>
    );

  const campo = (zona: "filas" | "columnas", titulo: string, ayuda: string) => (
    <Zona titulo={titulo} ayuda={ayuda}>
      {config[zona] === null ? (
        <Agregar campos={encabezados} onElegir={(c) => cambiar({ ...config, [zona]: c })} />
      ) : (
        <Ficha nombre={encabezados[config[zona]!]} onQuitar={() => cambiar({ ...config, [zona]: null })} />
      )}
    </Zona>
  );

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-20 -mx-1 flex flex-col gap-2 bg-[var(--background)] px-1 pb-2 pt-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <RetoFijo
            key={actual}
            texto={reto ? `🧩 ${reto.texto}` : "🎉 ¡Completaste todos los retos! Sigue armando tablas para practicar."}
            clase={reto ? "bg-blue-900 text-white" : "bg-emerald-50 text-emerald-800"}
          />
          <span className="shrink-0 text-sm font-semibold text-blue-900">
            {hechos.size} de {retos.length}
          </span>
        </div>
        {formulario(true)}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <p className={`flex-1 text-[13px] font-semibold leading-snug sm:min-h-6 sm:text-sm ${mensaje ? (mensaje.bien ? "text-emerald-700" : "text-rose-700") : "text-slate-500"}`} aria-live="polite">
            {mensaje?.texto ?? pista ?? "Lleva los campos a las zonas del editor. La tabla se arma sola."}
          </p>
          {reto && !cumple && (
            <button
              onClick={pedirPista}
              className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800 hover:bg-blue-200 pointer-coarse:min-h-10 pointer-coarse:text-sm"
            >
              💡 ¿Qué me falta?
            </button>
          )}
        </div>
        <div role="tablist" className="flex rounded-full bg-white p-1 text-sm font-semibold shadow ring-1 ring-slate-200 lg:hidden">
          {(["editor", "tabla"] as const).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={vista === v}
              onClick={() => setVista(v)}
              className={`min-h-10 flex-1 rounded-full px-3 ${vista === v ? "bg-blue-900 text-white" : "text-slate-600"}`}
            >
              {v === "editor" ? "Editor" : "Tabla dinámica"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className={`flex-col gap-3 lg:flex ${vista === "tabla" ? "flex" : "hidden"}`}>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setVerDatos((v) => !v)} className="btn-suave !px-3 !py-1.5 text-sm pointer-coarse:min-h-10">
              {verDatos ? "Ocultar" : "Ver"} los datos de origen ({tabla.length - 1} filas)
            </button>
            {conGrafico && (
              <button onClick={() => setVerGrafico((v) => !v)} className="btn-suave !px-3 !py-1.5 text-sm pointer-coarse:min-h-10">
                {verGrafico ? "Ver la tabla" : "📊 Insertar gráfico de esta tabla"}
              </button>
            )}
          </div>
          {verDatos && (
            // En pantallas pequeñas solo se desplaza a lo ancho (sin scroll dentro del scroll de la página).
            <div className="overflow-x-auto rounded-2xl border border-slate-300 bg-white lg:max-h-64 lg:overflow-auto">
              <table className="w-full border-collapse text-sm lg:text-xs">
                <thead className="lg:sticky lg:top-0">
                  <tr>
                    {encabezados.map((h) => (
                      <th key={h} className="border border-slate-200 bg-slate-100 px-2 py-1 text-left">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tabla.slice(1).map((f, i) => (
                    <tr key={i}>
                      {f.map((v, c) => (
                        <td key={c} className={`border border-slate-200 px-2 py-0.5 ${typeof v === "number" ? "text-right" : ""}`}>
                          {typeof v === "number" ? mostrarNumero(v) : v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {conGrafico && verGrafico ? (
            <GraficoSVG
              tipo="columnas"
              etiquetas={r.filas}
              valores={r.totalFilas.map((v) => v ?? 0)}
              titulo={`${config.valores!.resumen} de ${encabezados[config.valores!.columna]} por ${encabezados[config.filas!]}`}
              nombreSerie={`${config.valores!.resumen} de ${encabezados[config.valores!.columna]}`}
            />
          ) : (
            <Resultado config={config} encabezados={encabezados} r={r} />
          )}
          {formulario(false)}
        </div>

        <aside className={`flex-col gap-3 self-start rounded-2xl border border-slate-300 bg-white p-4 shadow lg:flex ${vista === "editor" ? "flex" : "hidden"}`}>
          <div className="flex items-center justify-between">
            <p className="font-heading font-bold text-blue-900">Editor de tablas dinámicas</p>
            <button
              onClick={() => cambiar(VACIA)}
              className="rounded-full px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-700 pointer-coarse:min-h-10 pointer-coarse:px-3 pointer-coarse:text-sm"
            >
              Vaciar
            </button>
          </div>
          {campo("filas", "Filas", "Los grupos que van hacia abajo")}
          {campo("columnas", "Columnas", "Los grupos que van hacia la derecha")}
          <Zona titulo="Valores" ayuda="Lo que se suma, cuenta o promedia">
            {config.valores === null ? (
              <Agregar campos={encabezados} onElegir={(c) => cambiar({ ...config, valores: { columna: c, resumen: numericas[c] ? "SUMA" : "CONTARA" } })} />
            ) : (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-2">
                <Ficha nombre={encabezados[config.valores.columna]} onQuitar={() => cambiar({ ...config, valores: null })} sinBorde />
                <label className="mt-2 block text-xs text-slate-600">
                  Resumir por
                  <select
                    value={config.valores.resumen}
                    onChange={(e) => cambiar({ ...config, valores: { ...config.valores!, resumen: e.target.value as ResumenDinamica } })}
                    className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-base pointer-coarse:min-h-11 pointer-fine:text-sm"
                  >
                    {RESUMENES.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.nombre}
                      </option>
                    ))}
                  </select>
                </label>
                {!numericas[config.valores.columna] && config.valores.resumen !== "CONTARA" && (
                  <p className="mt-1 text-xs text-rose-700">«{encabezados[config.valores.columna]}» es texto: solo se puede contar (CONTARA).</p>
                )}
              </div>
            )}
          </Zona>
          <Zona titulo="Filtros" ayuda="Para mirar solo una parte de los datos">
            {config.filtro === null ? (
              <Agregar campos={encabezados} onElegir={(c) => cambiar({ ...config, filtro: { columna: c, valores: valoresDistintos(tabla, c) } })} />
            ) : (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-2">
                <Ficha nombre={encabezados[config.filtro.columna]} onQuitar={() => cambiar({ ...config, filtro: null })} sinBorde />
                <p className="mt-2 text-xs text-slate-600">Filtrar por valores</p>
                <div className="mt-1 flex flex-col gap-0.5 lg:max-h-36 lg:overflow-auto">
                  {valoresDistintos(tabla, config.filtro.columna).map((v) => {
                    const marcado = config.filtro!.valores.includes(v);
                    return (
                      <label key={v} className="flex items-center gap-2 text-sm pointer-coarse:min-h-10 pointer-coarse:gap-3 pointer-coarse:text-base">
                        <input
                          type="checkbox"
                          checked={marcado}
                          onChange={() =>
                            cambiar({
                              ...config,
                              filtro: { ...config.filtro!, valores: marcado ? config.filtro!.valores.filter((x) => x !== v) : [...config.filtro!.valores, v] },
                            })
                          }
                          className="h-4 w-4 pointer-coarse:h-5 pointer-coarse:w-5"
                        />
                        {v}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </Zona>
        </aside>
      </div>
    </div>
  );
}

function Zona({ titulo, ayuda, children }: { titulo: string; ayuda: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{titulo}</p>
      <p className="mb-1 text-xs text-slate-400">{ayuda}</p>
      {children}
    </div>
  );
}

function Agregar({ campos, onElegir }: { campos: string[]; onElegir: (c: number) => void }) {
  return (
    <select
      value=""
      onChange={(e) => e.target.value !== "" && onElegir(Number(e.target.value))}
      className="w-full rounded-lg border border-dashed border-slate-400 bg-white px-2 py-1.5 text-base text-slate-600 pointer-coarse:min-h-11 pointer-fine:text-sm"
    >
      <option value="">Añadir ▾</option>
      {campos.map((h, c) => (
        <option key={c} value={c}>
          {h}
        </option>
      ))}
    </select>
  );
}

function Ficha({ nombre, onQuitar, sinBorde }: { nombre: string; onQuitar: () => void; sinBorde?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-2 rounded-lg px-2 py-0.5 text-sm font-semibold text-blue-900 ${sinBorde ? "" : "border border-blue-200 bg-blue-50"}`}>
      {nombre}
      <button
        onClick={onQuitar}
        aria-label={`Quitar ${nombre}`}
        className="grid h-7 w-7 shrink-0 place-items-center rounded text-slate-500 hover:bg-rose-100 hover:text-rose-700 pointer-coarse:h-10 pointer-coarse:w-10"
      >
        ✕
      </button>
    </div>
  );
}

function Resultado({ config, encabezados, r }: { config: ConfigDinamica; encabezados: string[]; r: ReturnType<typeof calcularDinamica> }) {
  if (config.filas === null && config.columnas === null && config.valores === null)
    return (
      <div className="grid min-h-48 place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">
        La tabla dinámica está vacía. Añade un campo a Filas para empezar.
      </div>
    );
  const v = (x: number | null) => (x === null ? "" : mostrarNumero(x));
  const nombreValor = config.valores ? `${config.valores.resumen} de ${encabezados[config.valores.columna]}` : "";
  const hayCols = config.columnas !== null;
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-300 bg-white shadow">
      <table className="w-full border-collapse text-sm">
        <thead>
          {hayCols && (
            <tr>
              <th className="border border-slate-200 bg-slate-50 px-2 py-1 text-left text-xs text-slate-500">{nombreValor}</th>
              <th colSpan={r.columnas.length + 1} className="border border-slate-200 bg-slate-50 px-2 py-1 text-left">
                {encabezados[config.columnas!]}
              </th>
            </tr>
          )}
          <tr>
            <th className="border border-slate-200 bg-blue-50 px-2 py-1 text-left">{config.filas !== null ? encabezados[config.filas] : ""}</th>
            {hayCols ? r.columnas.map((c) => <th key={c} className="border border-slate-200 bg-blue-50 px-2 py-1 text-right">{c}</th>) : config.valores && <th className="border border-slate-200 bg-blue-50 px-2 py-1 text-right">{nombreValor}</th>}
            {hayCols && <th className="border border-slate-200 bg-blue-100 px-2 py-1 text-right">Total general</th>}
          </tr>
        </thead>
        <tbody>
          {config.filas !== null &&
            r.filas.map((f, i) => (
              <tr key={f}>
                <td className="border border-slate-200 px-2 py-1">{f}</td>
                {config.valores && (hayCols ? r.celdas[i].map((x, j) => <td key={j} className="border border-slate-200 px-2 py-1 text-right">{v(x)}</td>) : <td className="border border-slate-200 px-2 py-1 text-right">{v(r.totalFilas[i])}</td>)}
                {hayCols && config.valores && <td className="border border-slate-200 bg-blue-50 px-2 py-1 text-right font-semibold">{v(r.totalFilas[i])}</td>}
              </tr>
            ))}
          {config.valores && (
            <tr className="font-bold">
              <td className="border border-slate-200 bg-blue-100 px-2 py-1">Total general</td>
              {hayCols ? r.totalColumnas.map((x, j) => <td key={j} className="border border-slate-200 bg-blue-100 px-2 py-1 text-right">{v(x)}</td>) : <td className="border border-slate-200 bg-blue-100 px-2 py-1 text-right">{v(r.total)}</td>}
              {hayCols && <td className="border border-slate-200 bg-blue-200 px-2 py-1 text-right">{v(r.total)}</td>}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/** El reto del bloque fijo: en el celular a lo sumo dos líneas, y se despliega al tocarlo. */
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
