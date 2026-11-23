"use client";

import { useEffect, useRef, useState } from "react";
import type { RetoFormula } from "@/lib/clase/tipos";
import {
  argumentosDe,
  completarParentesis,
  celdaAIndices,
  celdasDeRango,
  columnasDeTabla,
  desplazar,
  ErrorCelda,
  ErrorFormula,
  evaluar,
  letraColumna,
  mismoValor,
  mostrarValor,
  nombreCelda,
  normalizarRango,
  usaAbsoluta,
  usaFuncion,
  usaReferencias,
  usaTablas,
  type Hoja,
  type TablaHoja,
  type Valor,
} from "@/lib/clase/formulas";
import { celdasDeReferencia, contextoCursor, referenciasDe, reemplazar, solucionConHuecos } from "@/lib/clase/editorFormula";
import { funcionDelCatalogo } from "@/lib/clase/catalogoFunciones";
import { useDispositivo } from "@/lib/clase/dispositivo";
import { useProgreso } from "../progreso";
import BarraFormulas, { colorRef, type Edicion } from "./formulas/BarraFormulas";

type Datos = { formulas: Record<string, string>; fallos: number };

/** Celdas que llena un reto: la suya y, si se copia, todas las del rango (con el corrimiento de cada una). */
function destinos(r: RetoFormula): { celda: string; filas: number; cols: number }[] {
  const origen = celdaAIndices(r.celda)!;
  const lista = r.copiar ? celdasDeRango(r.copiar) : [r.celda];
  return lista.map((celda) => {
    const c = celdaAIndices(celda)!;
    return { celda, filas: c.fila - origen.fila, cols: c.col - origen.col };
  });
}

function poner(hoja: Hoja, celda: string, v: Valor) {
  const c = celdaAIndices(celda);
  if (!c) return;
  while (hoja.length <= c.fila) hoja.push([]);
  hoja[c.fila][c.col] = v;
}

/** La hoja con los resultados de las fórmulas ya resueltas (para que se vean en su celda). */
function hojaCon(base: (string | number)[][], retos: RetoFormula[], formulas: Record<string, string>, tablas: TablaHoja[]): Hoja {
  const hoja: Hoja = base.map((f) => [...f]);
  for (const r of retos) {
    const f = formulas[r.celda];
    if (!f) continue;
    for (const d of destinos(r)) {
      try {
        poner(hoja, d.celda, evaluar(desplazar(f, d.filas, d.cols), hoja, { tablas, celda: d.celda }));
      } catch (e) {
        poner(hoja, d.celda, e instanceof ErrorCelda ? e.codigo : null);
      }
    }
  }
  return hoja;
}

/** Primera función de una fórmula (para la primera pista). */
const primeraFuncion = (f: string) => /([A-ZÁÉÍÓÚ][A-ZÁÉÍÓÚ.]*)\s*\(/i.exec(f)?.[1]?.toUpperCase();

/** Bordes de color de una celda que está dentro de un rango referenciado (como Sheets). */
function bordes(fila: number, col: number, celdas: { fila: number; col: number }[], color: string): string {
  const en = (f: number, c: number) => celdas.some((x) => x.fila === f && x.col === c);
  const s: string[] = [];
  if (!en(fila - 1, col)) s.push(`inset 0 2px 0 0 ${color}`);
  if (!en(fila + 1, col)) s.push(`inset 0 -2px 0 0 ${color}`);
  if (!en(fila, col - 1)) s.push(`inset 2px 0 0 0 ${color}`);
  if (!en(fila, col + 1)) s.push(`inset -2px 0 0 0 ${color}`);
  return s.join(", ");
}

/**
 * Fórmulas en una mini hoja de cálculo con el asistente de Sheets: autocompletar, ayuda de cada
 * función con ejemplo, referencias de colores y vista previa del resultado. Al tocar o hacer clic
 * en una celda mientras se escribe se agrega su nombre (y si se arrastra con el mouse, el rango;
 * en el celular: celda, «:» y la otra celda). Si la actividad trae tablas con nombre se puede
 * escribir `Turnos[Estado]`. Acepta SUMA o SUM, y «;» o «,».
 */
export default function Formulas({
  id,
  datos: base,
  tablas = [],
  retos,
}: {
  id: string;
  datos: (string | number)[][];
  tablas?: TablaHoja[];
  retos: RetoFormula[];
}) {
  const { datos, guardar } = useProgreso<Datos>(id);
  const dispositivo = useDispositivo();
  const celular = dispositivo === "celular";
  const formulas = datos?.formulas ?? {};
  const actual = retos.findIndex((r) => !formulas[r.celda]);
  const [elegido, setElegido] = useState<number | null>(null);
  const indice = elegido ?? actual;
  const reto = indice === -1 ? null : retos[indice];
  const [edicion, setEdicion] = useState<Edicion>({ texto: "", cursor: 0 });
  const [mensaje, setMensaje] = useState<{ tipo: "bien" | "mal" | "info"; texto: string; extra?: string } | null>(null);
  const [pista, setPista] = useState(0);
  const [retoAbierto, setRetoAbierto] = useState(false);
  const [foco, setFoco] = useState(0);
  // La última referencia agregada tocando la hoja: si se toca otra celda enseguida, la reemplaza (como Sheets).
  const ultimaRef = useRef<{ inicio: number; fin: number } | null>(null);
  // Selección de un rango arrastrando con el mouse.
  const arrastre = useRef<{ ancla: { fila: number; col: number }; inicio: number } | null>(null);
  const contenedor = useRef<HTMLDivElement>(null);
  const { texto } = edicion;

  const hoja = hojaCon(base, retos, formulas, tablas);
  const objetivo = reto ? celdaAIndices(reto.celda) : null;
  const ultimas = retos.flatMap((r) => destinos(r).map((d) => celdaAIndices(d.celda)!));
  const nFilas = Math.max(hoja.length, ...ultimas.map((c) => c.fila + 1)) + 1;
  const nCols = Math.max(...hoja.map((f) => f.length), ...ultimas.map((c) => c.col + 1));
  const resueltos = retos.filter((r) => formulas[r.celda]).length;

  // Las celdas que se están llenando no cuentan (si no, sería una referencia circular).
  const hojaSinEsta = hoja.map((fila) => [...fila]);
  if (reto)
    for (const d of destinos(reto)) {
      const c = celdaAIndices(d.celda)!;
      if (hojaSinEsta[c.fila]) hojaSinEsta[c.fila][c.col] = null;
    }
  const calcular = (formula: string, celda = reto?.celda): Valor | ErrorCelda => {
    try {
      return evaluar(formula, hojaSinEsta, { tablas, celda });
    } catch (e) {
      return e instanceof ErrorCelda ? e : new ErrorCelda("#ERROR!", "");
    }
  };

  // Vista previa: lo que daría la fórmula ahora mismo.
  let vistaPrevia: Valor | undefined;
  if (reto && texto.startsWith("=") && texto.length > 1) {
    const v = calcular(texto);
    vistaPrevia = v instanceof ErrorCelda ? undefined : v;
  }

  // Referencias de la fórmula pintadas en la hoja.
  const pintadas = referenciasDe(texto).map((r) => ({ color: colorRef(r.color), celdas: celdasDeReferencia(r.texto.replace(/\$/g, ""), hoja, tablas) }));

  // Lleva a la vista la celda del reto (en el celular la hoja se desplaza de lado).
  useEffect(() => {
    if (!reto) return;
    contenedor.current?.querySelector<HTMLElement>(`[data-celda="${reto.celda}"]`)?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [reto]);

  function cambiar(e: Edicion, escrito: boolean) {
    if (escrito) ultimaRef.current = null;
    setEdicion(e);
  }

  function fallar(t: string, extra?: string) {
    guardar({ formulas, fallos: (datos?.fallos ?? 0) + 1 }, false);
    setMensaje({ tipo: "mal", texto: t, extra });
  }

  function revisar() {
    if (!reto) return;
    // Como Sheets, los «)» que faltan al final se agregan solos.
    const f = completarParentesis(texto.trim());
    if (!f) return;
    if (!f.startsWith("=")) return fallar("Toda fórmula empieza con el signo igual (=). Si no, la hoja lo toma como texto.");
    let valor: Valor;
    try {
      valor = evaluar(f, hojaSinEsta, { tablas, celda: reto.celda });
    } catch (err) {
      if (err instanceof ErrorCelda) return fallar(`Tu fórmula da ${err.message}`);
      return fallar(err instanceof ErrorFormula ? err.message : "La fórmula tiene un error");
    }
    if (!usaReferencias(f, tablas))
      return fallar(
        `Da ${mostrarValor(valor)}, pero escribiste los datos a mano. Usa los nombres de las celdas (B2, C3…)${tablas.length ? " o la tabla" : ""}: así, si cambia un dato, la fórmula se actualiza sola.`,
      );
    if (reto.exigeTabla && !usaTablas(f).tabla && tablas.length)
      return fallar(
        `Da ${mostrarValor(valor)}. Ahora hazlo con la tabla: escribe ${tablas[0].nombre}[ y elige la columna (en vez de rangos como B2:B7).`,
      );
    if (reto.funcion && !usaFuncion(f, reto.funcion))
      return fallar(`Da ${mostrarValor(valor)}. Ahora hazlo con la función ${reto.funcion}: es la que pide el reto.`);
    const esperado = calcular(reto.solucion);
    if (esperado instanceof ErrorCelda || !mismoValor(valor, esperado)) {
      if (usaFuncion(f, "BUSCARV") && argumentosDe(f, "BUSCARV") === 3)
        return fallar(`Tu fórmula da ${mostrarValor(valor)}. Te faltó el último dato, FALSO: sin él, BUSCARV busca «aproximado» y puede traer otra fila.`);
      return fallar(`Tu fórmula da ${mostrarValor(valor)}, pero no es lo que se pide. Revisa qué celdas usaste.`);
    }
    // Al copiarla hacia abajo, cada copia tiene que dar lo mismo que la solución copiada.
    const lista = destinos(reto);
    for (const d of lista.slice(1)) {
      const copia = desplazar(f, d.filas, d.cols);
      const suya = calcular(copia, d.celda);
      const debe = calcular(desplazar(reto.solucion, d.filas, d.cols), d.celda);
      const bien = !(suya instanceof ErrorCelda) && !(debe instanceof ErrorCelda) && mismoValor(suya, debe);
      if (!bien) {
        const da = suya instanceof ErrorCelda ? suya.codigo : mostrarValor(suya);
        const fija = /\$[A-Z]{1,2}\$\d+/i.exec(reto.solucion)?.[0] ?? "$B$7";
        const fijar =
          usaAbsoluta(reto.solucion) && !usaAbsoluta(f)
            ? ` Al copiar, todas las referencias se corren. ¿Cuál celda debe quedarse quieta? Fíjala con $ (por ejemplo ${fija})${tablas.length ? ` o usa la tabla: ${tablas[0].nombre}[…] no se corre` : ""}.`
            : "";
        return fallar(`En ${reto.celda} da bien, pero al copiarla a ${d.celda} queda ${copia} y da ${da}.${fijar}`);
      }
    }
    const nuevas = { ...formulas, [reto.celda]: f };
    guardar({ formulas: nuevas, fallos: datos?.fallos ?? 0 }, retos.every((r) => nuevas[r.celda]));
    const t = usaTablas(f);
    setMensaje({
      tipo: "bien",
      texto: reto.copiar ? `¡Bien! La fórmula se copió hasta ${reto.copiar.split(":")[1]} y todas dan bien.` : `¡Bien! ${reto.celda} = ${mostrarValor(valor)}.`,
      extra: t.fila
        ? "Ojo: [@Columna] funciona en Excel, pero Google Sheets todavía no lo tiene. En Sheets, para la misma fila escribe la celda (D2)."
        : t.tabla
          ? "Con la tabla no tuviste que contar filas ni poner $: el nombre de la columna no se corre al copiar."
          : undefined,
    });
    setEdicion({ texto: "", cursor: 0 });
    setElegido(null);
    setPista(0);
    ultimaRef.current = null;
  }

  /** Agrega una referencia en el cursor (o reemplaza la que se acaba de agregar tocando la hoja). */
  function agregarReferencia(ref: string) {
    const u = ultimaRef.current;
    const desde = u && u.fin === edicion.cursor ? u.inicio : edicion.cursor;
    const r = reemplazar(texto, desde, edicion.cursor, ref);
    ultimaRef.current = { inicio: desde, fin: r.cursor };
    setEdicion(r);
    setFoco((n) => n + 1);
  }

  /** ¿Lo que hay en la barra está esperando una referencia? */
  function esperaReferencia(): boolean {
    if (!texto.startsWith("=")) return false;
    const u = ultimaRef.current;
    if (u && u.fin === edicion.cursor) return true;
    return contextoCursor(texto, edicion.cursor).aceptaReferencia;
  }

  function seleccionarReto(r: number, celdaTocada: string) {
    const original = retos[r];
    const f = formulas[original.celda];
    setElegido(r);
    setEdicion({ texto: f ?? "", cursor: (f ?? "").length });
    setPista(0);
    ultimaRef.current = null;
    if (f && celdaTocada !== original.celda) {
      const d = destinos(original).find((x) => x.celda === celdaTocada);
      setMensaje({ tipo: "info", texto: `En ${celdaTocada} quedó ${d ? desplazar(f, d.filas, d.cols) : f} (copia de ${original.celda}).` });
    } else setMensaje(null);
    setFoco((n) => n + 1);
  }

  function bajarEnCelda(e: React.PointerEvent, fila: number, col: number) {
    const nombre = nombreCelda(fila, col);
    if (esperaReferencia()) {
      // No se le quita el foco a la barra (en el celular se cerraría el teclado).
      e.preventDefault();
      agregarReferencia(nombre);
      if (e.pointerType === "mouse") arrastre.current = { ancla: { fila, col }, inicio: ultimaRef.current!.inicio };
      return;
    }
    const r = retos.findIndex((x) => destinos(x).some((d) => d.celda === nombre));
    if (r !== -1) {
      e.preventDefault();
      seleccionarReto(r, nombre);
    }
  }

  function entrarEnCelda(fila: number, col: number) {
    const a = arrastre.current;
    if (!a) return;
    const rango = fila === a.ancla.fila && col === a.ancla.col ? nombreCelda(fila, col) : normalizarRango(`${nombreCelda(a.ancla.fila, a.ancla.col)}:${nombreCelda(fila, col)}`)!;
    const u = ultimaRef.current!;
    const r = reemplazar(texto, u.inicio, u.fin, rango);
    ultimaRef.current = { inicio: u.inicio, fin: r.cursor };
    setEdicion(r);
  }

  useEffect(() => {
    const soltar = () => (arrastre.current = null);
    window.addEventListener("pointerup", soltar);
    return () => window.removeEventListener("pointerup", soltar);
  }, []);

  /** Tocar la letra de una columna mientras se escribe: la columna de la tabla o sus datos (B2:B9). */
  function tocarColumna(e: React.PointerEvent, col: number) {
    if (!esperaReferencia()) return;
    e.preventDefault();
    const t = tablas.find((x) => {
      const r = normalizarRango(x.rango);
      if (!r) return false;
      const [i, f] = r.split(":").map((y) => celdaAIndices(y)!);
      return col >= i.col && col <= f.col;
    });
    if (t) {
      const c = columnasDeTabla(t, hoja).find((x) => x.col === col);
      if (c) return agregarReferencia(`${t.nombre}[${c.nombre}]`);
    }
    let ultima = 1;
    for (let f = 1; f < hoja.length; f++) if (hoja[f]?.[col] !== undefined && hoja[f]?.[col] !== null && hoja[f]?.[col] !== "") ultima = f;
    // Hasta la última fila con datos seguidos desde la fila 2.
    let fin = 1;
    while (fin + 1 <= ultima && hoja[fin + 1]?.[col] !== undefined && hoja[fin + 1]?.[col] !== null && hoja[fin + 1]?.[col] !== "") fin++;
    agregarReferencia(`${letraColumna(col)}2:${letraColumna(col)}${fin + 1}`);
  }

  // Pistas por niveles: 1) qué función, 2) la sintaxis con huecos, 3) la respuesta.
  const fnPista = reto ? (reto.funcion ?? primeraFuncion(reto.solucion)) : undefined;
  const ayudaFn = fnPista ? funcionDelCatalogo(fnPista) : undefined;
  const pistas: string[] = reto
    ? [
        fnPista ? `Usa la función ${fnPista}${ayudaFn ? `: ${ayudaFn.resumen.charAt(0).toLowerCase()}${ayudaFn.resumen.slice(1)}` : "."}` : "Multiplica, suma o divide usando los nombres de las celdas, no los números.",
        ayudaFn ? `Así se arma: ${solucionConHuecos(reto.solucion, (i) => ayudaFn.argumentos[Math.min(i, ayudaFn.argumentos.length - 1)]?.nombre)}` : `Empieza así: ${reto.solucion.slice(0, Math.ceil(reto.solucion.length / 2))}…`,
        reto.pista ?? reto.solucion,
      ]
    : [];

  const tablaDe = (fila: number, col: number) =>
    tablas.find((t) => {
      const r = normalizarRango(t.rango);
      if (!r) return false;
      const [i, f] = r.split(":").map((y) => celdaAIndices(y)!);
      return fila >= i.fila && fila <= f.fila && col >= i.col && col <= f.col;
    });
  const esEncabezadoTabla = (fila: number, col: number) => {
    const t = tablaDe(fila, col);
    return !!t && celdaAIndices(normalizarRango(t.rango)!.split(":")[0])!.fila === fila;
  };

  return (
    <div className="flex flex-col">
      {/* Reto, barra de fórmulas y mensaje quedan fijos arriba: así se ve la respuesta mientras se escribe. */}
      <div className="sticky top-0 z-20 -mx-1 flex flex-col gap-1.5 bg-[var(--background)] px-1 pt-2 sm:gap-2 sm:pt-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setRetoAbierto((v) => !v)}
            className={`flex-1 rounded-2xl px-3 py-2 text-left font-heading text-base font-bold sm:cursor-default sm:px-4 sm:py-3 sm:text-lg ${reto ? "bg-blue-900 text-white" : "bg-emerald-50 text-emerald-800"}`}
          >
            <span className={retoAbierto ? "" : "line-clamp-2 sm:line-clamp-none"}>
              {reto ? (
                <>
                  <span className="mr-2 rounded-lg bg-gold-500 px-2 py-0.5 font-mono text-blue-900">{reto.celda}</span>
                  {reto.texto}
                </>
              ) : (
                `🎉 ¡Resolviste todas las fórmulas! ${celular ? "Toca" : "Haz clic en"} una celda verde para ver su fórmula.`
              )}
            </span>
          </button>
          <span className="shrink-0 text-sm font-semibold text-blue-900">
            {resueltos}/{retos.length}
          </span>
        </div>

        <BarraFormulas
          edicion={edicion}
          onEdicion={cambiar}
          onEnviar={revisar}
          celda={reto?.celda ?? ""}
          deshabilitada={!reto}
          hoja={hojaSinEsta}
          tablas={tablas}
          vistaPrevia={vistaPrevia}
          pedirFoco={foco}
        />

        <div className="flex items-start gap-2 border border-t-0 border-slate-300 bg-slate-50 px-3 py-1.5" aria-live="polite">
          <div className="min-w-0 flex-1 text-sm">
            <p
              className={`font-semibold ${
                mensaje?.tipo === "bien" ? "text-emerald-700" : mensaje?.tipo === "mal" ? "text-rose-700" : mensaje?.tipo === "info" ? "text-blue-900" : "text-slate-500"
              }`}
            >
              {mensaje?.texto ??
                (celular
                  ? "Toca una celda para agregarla. Rango: la primera, «:» y la última."
                  : "Escribe = y empieza el nombre de la función: te ayudo. Haz clic en una celda para agregarla o arrastra para un rango.")}
            </p>
            {mensaje?.extra && <p className="mt-0.5 text-xs text-slate-600">{mensaje.extra}</p>}
            {pista > 0 && reto && (
              <ol className="mt-1 space-y-0.5 text-[13px] text-blue-900">
                {pistas.slice(0, pista).map((p, i) => (
                  <li key={i} className="rounded-lg bg-blue-50 px-2 py-1">
                    <span className="font-bold">Pista {i + 1}:</span> <span className={i > 0 ? "font-mono" : ""}>{p}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
          {reto && pista < pistas.length && (
            <button
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => setPista((p) => p + 1)}
              className="shrink-0 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800 hover:bg-blue-200 pointer-coarse:py-2"
            >
              💡 {pista === 0 ? "Pista" : pista === pistas.length - 1 ? "Ver respuesta" : "Otra pista"}
            </button>
          )}
        </div>
      </div>

      {tablas.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-x border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-600">
          <span>Tablas de esta hoja:</span>
          {tablas.map((t) => (
            <button
              key={t.nombre}
              type="button"
              onPointerDown={(e) => {
                if (!esperaReferencia()) return;
                e.preventDefault();
                agregarReferencia(`${t.nombre}[`);
              }}
              className="rounded-full bg-teal-50 px-2.5 py-1 font-mono font-semibold text-teal-800 ring-1 ring-teal-200 pointer-coarse:py-1.5"
              title={`${t.nombre}: ${t.rango}`}
            >
              ▦ {t.nombre}
            </button>
          ))}
          <span className="text-slate-400">· escribe {tablas[0].nombre}[ y elige la columna</span>
        </div>
      )}

      <div className="overflow-hidden rounded-b-2xl border border-t-0 border-slate-300 bg-white shadow">
        <div ref={contenedor} className="overflow-x-auto">
          <table className="w-full select-none border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-8 border border-slate-200 bg-slate-100 sm:w-10" />
                {Array.from({ length: nCols }, (_, c) => (
                  <th
                    key={c}
                    onPointerDown={(e) => tocarColumna(e, c)}
                    className="min-w-20 border border-slate-200 bg-slate-100 py-0.5 font-semibold text-slate-600 sm:min-w-24 pointer-coarse:py-1.5"
                  >
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
                    const delReto = retos.find((r) => destinos(r).some((d) => d.celda === nombre));
                    const resuelto = !!delReto && !!formulas[delReto.celda];
                    const activa = objetivo && objetivo.fila === f && objetivo.col === c;
                    const pintada = pintadas.find((p) => p.celdas.some((x) => x.fila === f && x.col === c));
                    const enTabla = !!tablaDe(f, c);
                    const encabezadoTabla = esEncabezadoTabla(f, c);
                    const error = typeof v === "string" && v.startsWith("#");
                    return (
                      <td
                        key={c}
                        data-celda={nombre}
                        onPointerDown={(e) => bajarEnCelda(e, f, c)}
                        onPointerEnter={() => entrarEnCelda(f, c)}
                        style={pintada ? { boxShadow: bordes(f, c, pintada.celdas, pintada.color), backgroundColor: `${pintada.color}14` } : undefined}
                        className={`h-8 cursor-cell whitespace-nowrap border border-slate-200 px-2 pointer-coarse:h-10 ${
                          typeof v === "number" ? "text-right" : typeof v === "boolean" ? "text-center" : "text-left"
                        } ${f === 0 || encabezadoTabla ? "font-bold" : ""} ${error ? "font-semibold text-rose-700" : ""} ${
                          activa
                            ? "bg-gold-100 outline outline-2 -outline-offset-1 outline-[#1A73E8]"
                            : resuelto
                              ? "bg-emerald-50 font-semibold text-emerald-900"
                              : delReto
                                ? "bg-gold-50"
                                : encabezadoTabla
                                  ? "bg-teal-700 text-white"
                                  : enTabla && f % 2 === 0
                                    ? "bg-teal-50/60"
                                    : ""
                        }`}
                      >
                        {mostrarValor(v ?? null)}
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

