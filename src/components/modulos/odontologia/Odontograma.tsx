"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  COLORES_HEX,
  FILAS,
  HALLAZGOS,
  aplicarHallazgo,
  definicionHallazgo,
  esLadoDerecho,
  esSuperior,
  letraSuperficie,
  contradiccionesMixta,
  limpiarDiente,
  marcarRestoSano,
  nombreDiente,
  nombreSuperficie,
  ordenarMarcas,
  type CodigoHallazgo,
  type DefinicionHallazgo,
  type Denticion,
  type Marca,
  type Superficie,
} from "@/lib/modulos/odontologia/odontograma";

// ---------------------------------------------------------------------------
// Geometría (unidades del viewBox)
// ---------------------------------------------------------------------------

const ANCHO = 44; // ancho de la celda de un diente
const GUIA = 18; // separación de la línea media vertical
const R = 17; // radio exterior del diente
const r = 7; // radio de la cara oclusal
const FRANJA = 15; // franja de símbolos (letras, triángulo, rotación) del lado de la raíz
const ETIQUETA = 14; // número FDI
const ALTO_FILA = FRANJA + 2 * R + 8 + ETIQUETA;
const SEPARACION_ARCADAS = 16;
const ANCHO_TOTAL = 16 * ANCHO + GUIA;

type Posicion = "arriba" | "abajo" | "izquierda" | "derecha" | "centro";

/**
 * Dónde se dibuja cada superficie, como en el formato en papel: en superiores la vestibular
 * va arriba y la palatina abajo; en inferiores al revés. La mesial mira hacia la línea
 * media: a la derecha del dibujo en el lado derecho del paciente, a la izquierda en el otro.
 */
function posicionDe(diente: number, s: Superficie): Posicion {
  if (s === "O") return "centro";
  if (s === "V") return esSuperior(diente) ? "arriba" : "abajo";
  if (s === "L") return esSuperior(diente) ? "abajo" : "arriba";
  const mesialDerecha = esLadoDerecho(diente);
  if (s === "M") return mesialDerecha ? "derecha" : "izquierda";
  return mesialDerecha ? "izquierda" : "derecha";
}

const f = (n: number) => Math.round(n * 100) / 100;

function sector(cx: number, cy: number, a0: number, a1: number): string {
  const p = (rad: number, a: number) => [f(cx + rad * Math.cos((a * Math.PI) / 180)), f(cy + rad * Math.sin((a * Math.PI) / 180))];
  const [x0, y0] = p(R, a0);
  const [x1, y1] = p(R, a1);
  const [x2, y2] = p(r, a1);
  const [x3, y3] = p(r, a0);
  return `M${x0} ${y0} A${R} ${R} 0 0 1 ${x1} ${y1} L${x2} ${y2} A${r} ${r} 0 0 0 ${x3} ${y3} Z`;
}

const ANGULOS: Record<Exclude<Posicion, "centro">, [number, number]> = {
  arriba: [-135, -45],
  derecha: [-45, 45],
  abajo: [45, 135],
  izquierda: [135, 225],
};

// ---------------------------------------------------------------------------
// Un diente
// ---------------------------------------------------------------------------

type EstadoEtiqueta = "ok" | "parcial" | "error";

type PropsDiente = {
  diente: number;
  x: number;
  y: number;
  marcas: Marca[];
  herramienta: DefinicionHallazgo | "BORRAR" | null;
  onClic?: (diente: number, superficie: Superficie) => void;
  /** Clic derecho: abre el menú de lo que puede tener esa cara o ese diente. */
  onMenu?: (diente: number, superficie: Superficie | null, x: number, y: number) => void;
  estado?: EstadoEtiqueta;
  sinEtiqueta?: boolean;
  /** Recuadro de foco (navegación con teclado). */
  enfocado?: boolean;
  /** Pantalla táctil: tocar en cualquier parte del diente cuenta (abre su ficha). */
  dienteCompleto?: boolean;
};

function Diente({ diente, x, y, marcas, herramienta, onClic, onMenu, estado, sinEtiqueta, enfocado, dienteCompleto }: PropsDiente) {
  const [hover, setHover] = useState<Superficie | null>(null);
  const superior = esSuperior(diente);
  const cx = x + ANCHO / 2;
  const franjaY = superior ? y : y + ETIQUETA + 2 * R + 8;
  const cy = superior ? y + FRANJA + 4 + R : y + ETIQUETA + 4 + R;
  const etiquetaY = superior ? y + FRANJA + 2 * R + 8 + ETIQUETA - 3 : y + ETIQUETA - 3;

  const delDiente = marcas.filter((m) => m.diente === diente);
  const enSuperficie = new Map(delDiente.filter((m) => m.superficie).map((m) => [m.superficie!, m.hallazgo]));
  const aNivelDiente = delDiente.filter((m) => !m.superficie).map((m) => definicionHallazgo(m.hallazgo)!);
  const editable = Boolean(onClic);
  const herramientaDeDiente = herramienta === "BORRAR" || herramienta?.nivel === "DIENTE";

  function relleno(s: Superficie): { fill: string; stroke?: string } {
    const h = enSuperficie.get(s);
    if (h) {
      const def = definicionHallazgo(h)!;
      const halo = def.simbolo.tipo === "RELLENO" ? def.simbolo.halo : undefined;
      return { fill: COLORES_HEX[def.color], stroke: halo ? COLORES_HEX[halo] : undefined };
    }
    if (editable && (hover === s || (herramientaDeDiente && hover))) return { fill: "#e0f2fe" };
    return { fill: "#ffffff" };
  }

  // Símbolos de la franja (del lado de la raíz)
  const simbolosFranja: { clave: string; nodo: (sx: number) => React.ReactNode; ancho: number }[] = [];
  for (const def of aNivelDiente) {
    const color = COLORES_HEX[def.color];
    const s = def.simbolo;
    if (s.tipo === "LETRA") {
      const ancho = s.texto.length > 1 ? 15 : 9;
      simbolosFranja.push({
        clave: def.codigo,
        ancho,
        nodo: (sx) => (
          <text x={sx + ancho / 2} y={franjaY + 11.5} textAnchor="middle" fontSize={11} fontWeight={800} fill={color} fontFamily="Inter, sans-serif">
            {s.texto}
          </text>
        ),
      });
    } else if (s.tipo === "TRIANGULO") {
      simbolosFranja.push({
        clave: def.codigo,
        ancho: 12,
        nodo: (sx) => (
          <polygon
            points={`${sx + 6},${franjaY + 2} ${sx + 11.5},${franjaY + 12} ${sx + 0.5},${franjaY + 12}`}
            fill="none"
            stroke={color}
            strokeWidth={1.8}
          />
        ),
      });
    } else if (s.tipo === "ROTACION") {
      simbolosFranja.push({
        clave: def.codigo,
        ancho: 13,
        nodo: (sx) => (
          <g fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round">
            <path d={`M${sx + 1.5} ${franjaY + 10} A5.5 5.5 0 1 1 ${sx + 11.5} ${franjaY + 10}`} />
            <path d={`M${sx + 8.5} ${franjaY + 9} L${sx + 11.5} ${franjaY + 10.5} L${sx + 12.5} ${franjaY + 7}`} />
          </g>
        ),
      });
    } else if (s.tipo === "X" && s.quirurgica) {
      simbolosFranja.push({
        clave: def.codigo,
        ancho: 10,
        nodo: (sx) => (
          <text x={sx + 5} y={franjaY + 11.5} textAnchor="middle" fontSize={10} fontWeight={800} fill={color} fontFamily="Inter, sans-serif">
            Q
          </text>
        ),
      });
    }
  }
  const anchoFranja = simbolosFranja.reduce((a, s) => a + s.ancho, 0) + Math.max(0, simbolosFranja.length - 1) * 1.5;
  let cursor = cx - anchoFranja / 2;

  const titulo = `${diente} · ${nombreDiente(diente)}`;
  const colorEtiqueta =
    estado === "ok" ? "#15803d" : estado === "parcial" ? "#b45309" : estado === "error" ? "#dc2626" : "#334155";

  return (
    <g
      onMouseLeave={() => setHover(null)}
      style={{ cursor: editable ? "pointer" : "default" }}
      onContextMenu={
        onMenu
          ? (e) => {
              e.preventDefault();
              const cara = (e.target as Element).getAttribute("data-superficie") as Superficie | null;
              onMenu(diente, cara, e.clientX, e.clientY);
            }
          : undefined
      }
    >
      <title>{titulo}</title>
      {/* Área de clic de todo el diente para herramientas de diente completo */}
      {enfocado && (
        <rect x={x + 1} y={y} width={ANCHO - 2} height={ALTO_FILA} rx={8} fill="#e6ebf9" stroke="#263e80" strokeWidth={2} pointerEvents="none" />
      )}
      {editable && (herramientaDeDiente || dienteCompleto) && (
        <rect
          x={x + 1}
          y={y}
          width={ANCHO - 2}
          height={ALTO_FILA}
          fill="transparent"
          onMouseEnter={() => setHover("O")}
          onClick={() => onClic?.(diente, "O")}
        />
      )}

      {(["V", "L", "M", "D"] as Superficie[]).map((s) => {
        const [a0, a1] = ANGULOS[posicionDe(diente, s) as Exclude<Posicion, "centro">];
        const { fill, stroke } = relleno(s);
        return (
          <path
            key={s}
            d={sector(cx, cy, a0, a1)}
            fill={fill}
            stroke={stroke ?? "#475569"}
            strokeWidth={stroke ? 2.2 : 1}
            data-superficie={s}
            onMouseEnter={() => setHover(s)}
            onClick={() => onClic?.(diente, s)}
          >
            <title>{`${titulo} — cara ${nombreSuperficie(diente, s)} (${letraSuperficie(diente, s)})`}</title>
          </path>
        );
      })}
      {(() => {
        const { fill, stroke } = relleno("O");
        return (
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill={fill}
            stroke={stroke ?? "#475569"}
            strokeWidth={stroke ? 2.2 : 1}
            data-superficie="O"
            onMouseEnter={() => setHover("O")}
            onClick={() => onClic?.(diente, "O")}
          >
            <title>{`${titulo} — cara ${nombreSuperficie(diente, "O")} (${letraSuperficie(diente, "O")})`}</title>
          </circle>
        );
      })()}

      {/* Trazos sobre el diente (no capturan el clic, para poder seguir marcando debajo) */}
      <g pointerEvents="none">
        {aNivelDiente.map((def) => {
          const color = COLORES_HEX[def.color];
          switch (def.simbolo.tipo) {
            case "LINEA_VERTICAL":
              return <line key={def.codigo} x1={cx} y1={cy - R - 3} x2={cx} y2={cy + R + 3} stroke={color} strokeWidth={3.2} />;
            case "LINEA_HORIZONTAL":
              return <line key={def.codigo} x1={cx - R - 3} y1={cy} x2={cx + R + 3} y2={cy} stroke={color} strokeWidth={3.2} />;
            case "X": {
              const d = R * 0.85;
              return (
                <g key={def.codigo} stroke={color} strokeWidth={3} strokeLinecap="round">
                  <line x1={cx - d} y1={cy - d} x2={cx + d} y2={cy + d} />
                  <line x1={cx + d} y1={cy - d} x2={cx - d} y2={cy + d} />
                </g>
              );
            }
            case "CIRCULO":
              return <circle key={def.codigo} cx={cx} cy={cy} r={R + 3} fill="none" stroke={color} strokeWidth={2.6} />;
            default:
              return null;
          }
        })}
        {simbolosFranja.map((s) => {
          const sx = cursor;
          cursor += s.ancho + 1.5;
          return <g key={s.clave}>{s.nodo(sx)}</g>;
        })}
      </g>

      {!sinEtiqueta && (
        <g pointerEvents="none">
          {estado && <rect x={cx - 11} y={etiquetaY - 10.5} width={22} height={14} rx={7} fill={colorEtiqueta} opacity={0.12} />}
          <text x={cx} y={etiquetaY} textAnchor="middle" fontSize={10.5} fontWeight={600} fill={colorEtiqueta} fontFamily="Inter, sans-serif">
            {diente}
          </text>
        </g>
      )}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Símbolo suelto (para la tabla de convenciones)
// ---------------------------------------------------------------------------

export function SimboloHallazgo({ codigo, tamano = 30 }: { codigo: CodigoHallazgo; tamano?: number }) {
  const def = definicionHallazgo(codigo);
  if (!def) return null;
  const marcas: Marca[] = def.nivel === "SUPERFICIE" ? [{ diente: 16, hallazgo: codigo, superficie: "O" }] : [{ diente: 16, hallazgo: codigo }];
  const alto = FRANJA + 2 * R + 10;
  return (
    <svg viewBox={`0 0 ${ANCHO} ${alto}`} width={tamano} height={(tamano * alto) / ANCHO} aria-hidden>
      <Diente diente={16} x={0} y={0} marcas={marcas} herramienta={null} sinEtiqueta />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Odontograma completo
// ---------------------------------------------------------------------------

type Fila = { dientes: readonly number[]; desplazamiento: number };

function filasDe(denticion: Denticion): { superiores: Fila[]; inferiores: Fila[] } {
  const perSup = { dientes: FILAS.permanenteSuperior, desplazamiento: 0 };
  const perInf = { dientes: FILAS.permanenteInferior, desplazamiento: 0 };
  // Los temporales se alinean bajo los 5 dientes más cercanos a la línea media, como en el papel.
  const tempSup = { dientes: FILAS.temporalSuperior, desplazamiento: 3 };
  const tempInf = { dientes: FILAS.temporalInferior, desplazamiento: 3 };
  if (denticion === "PERMANENTE") return { superiores: [perSup], inferiores: [perInf] };
  if (denticion === "TEMPORAL") return { superiores: [tempSup], inferiores: [tempInf] };
  return { superiores: [perSup, tempSup], inferiores: [tempInf, perInf] };
}

function xDeSlot(slot: number) {
  return slot * ANCHO + (slot >= 8 ? GUIA : 0);
}

export type PropsOdontograma = {
  denticion: Denticion;
  marcas: Marca[];
  /** Sin `onChange` el odontograma es de solo lectura (revisión, informe). */
  onChange?: (marcas: Marca[]) => void;
  /** Color del número de cada diente (comparación con el esperado). */
  estados?: Map<number, EstadoEtiqueta>;
  /** Muestra debajo la lista de hallazgos registrados. */
  mostrarResumen?: boolean;
};

export default function Odontograma({ denticion, marcas, onChange, estados, mostrarResumen = true }: PropsOdontograma) {
  const [herramienta, setHerramienta] = useState<CodigoHallazgo | "BORRAR">("CARIES");
  const [menu, setMenu] = useState<{ diente: number; superficie: Superficie | null; x: number; y: number } | null>(null);
  const [ficha, setFicha] = useState<{ diente: number; superficie: Superficie | null } | null>(null);
  const [foco, setFoco] = useState<number | null>(null);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const [tactil, setTactil] = useState(false);
  // Deshacer: los estados anteriores del odontograma (máximo 50).
  const historial = useRef<Marca[][]>([]);
  const contenedor = useRef<HTMLDivElement>(null);
  // Último diente con foco, para volver a él al cerrar la ficha o al regresar con Tab.
  const ultimoFoco = useRef<number | null>(null);
  const [hayHistorial, setHayHistorial] = useState(false);
  const cerrarMenu = useCallback(() => setMenu(null), []);
  const editable = Boolean(onChange);
  const def = herramienta === "BORRAR" ? "BORRAR" : definicionHallazgo(herramienta)!;
  const { superiores, inferiores } = filasDe(denticion);
  const filas = useMemo(() => [...superiores, ...inferiores], [superiores, inferiores]);
  const altoTotal = (superiores.length + inferiores.length) * ALTO_FILA + SEPARACION_ARCADAS;

  // Pantalla táctil o angosta: cada diente es muy pequeño para tocar una cara, así que tocar
  // un diente abre su ficha en grande.
  useEffect(() => {
    const consulta = window.matchMedia("(pointer: coarse), (max-width: 640px)");
    const actualizar = () => setTactil(consulta.matches);
    actualizar();
    consulta.addEventListener("change", actualizar);
    return () => consulta.removeEventListener("change", actualizar);
  }, []);

  function cambiar(nuevas: Marca[]) {
    if (!onChange) return;
    historial.current = [...historial.current.slice(-49), marcas];
    setHayHistorial(true);
    onChange(nuevas);
  }

  function deshacer() {
    const anterior = historial.current.pop();
    setHayHistorial(historial.current.length > 0);
    if (anterior && onChange) onChange(anterior);
  }

  function clic(diente: number, superficie: Superficie) {
    if (!onChange) return;
    setFoco(diente);
    if (tactil) {
      // En el celular la cara es muy pequeña para acertarle: se elige dentro de la ficha.
      setFicha({ diente, superficie: null });
      return;
    }
    if (herramienta === "BORRAR") cambiar(limpiarDiente(marcas, diente));
    else cambiar(aplicarHallazgo(marcas, diente, herramienta, superficie));
  }

  // Orden de los dientes para moverse con el teclado y en la ficha: fila por fila, como se ven.
  const ordenLineal = useMemo(() => filas.flatMap((f) => [...f.dientes]), [filas]);
  function moverEnFicha(diente: number, delta: number) {
    const i = ordenLineal.indexOf(diente);
    const siguiente = ordenLineal[(i + delta + ordenLineal.length) % ordenLineal.length];
    setFoco(siguiente);
    return siguiente;
  }

  function teclado(e: React.KeyboardEvent) {
    if (!editable) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      deshacer();
      return;
    }
    if (ficha || menu) return;
    const actual = foco ?? ordenLineal[0];
    const iFila = filas.findIndex((f) => f.dientes.includes(actual));
    const fila = filas[iFila];
    const iEnFila = fila.dientes.indexOf(actual);
    const slot = iEnFila + fila.desplazamiento;
    const enFila = (k: number) => {
      const f = filas[k];
      // El diente de esa fila más cercano a la misma columna.
      let mejor = f.dientes[0];
      let distancia = Infinity;
      f.dientes.forEach((d, j) => {
        const dist = Math.abs(j + f.desplazamiento - slot);
        if (dist < distancia) {
          distancia = dist;
          mejor = d;
        }
      });
      return mejor;
    };
    let nuevo: number | null = null;
    if (e.key === "ArrowRight") nuevo = fila.dientes[Math.min(iEnFila + 1, fila.dientes.length - 1)];
    else if (e.key === "ArrowLeft") nuevo = fila.dientes[Math.max(iEnFila - 1, 0)];
    else if (e.key === "ArrowDown" && iFila < filas.length - 1) nuevo = enFila(iFila + 1);
    else if (e.key === "ArrowUp" && iFila > 0) nuevo = enFila(iFila - 1);
    else if (e.key === "Home") nuevo = fila.dientes[0];
    else if (e.key === "End") nuevo = fila.dientes[fila.dientes.length - 1];
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setFicha({ diente: actual, superficie: null });
      return;
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      if (marcas.some((m) => m.diente === actual)) cambiar(limpiarDiente(marcas, actual));
      return;
    } else if (e.key === "Escape") {
      setFoco(null);
      return;
    }
    if (nuevo !== null) {
      e.preventDefault();
      setFoco(nuevo);
    }
  }

  const resumen = useMemo(() => {
    const porDiente = new Map<number, Marca[]>();
    for (const m of ordenarMarcas(marcas)) porDiente.set(m.diente, [...(porDiente.get(m.diente) ?? []), m]);
    return [...porDiente.entries()];
  }, [marcas]);

  const describir = (diente: number) => {
    const ms = resumen.find(([d]) => d === diente)?.[1] ?? [];
    const texto = ms
      .map((m) => {
        const d = definicionHallazgo(m.hallazgo)!;
        return m.superficie ? `${d.etiqueta} (${nombreSuperficie(m.diente, m.superficie)})` : d.etiqueta;
      })
      .join(", ");
    return `Diente ${diente}, ${nombreDiente(diente)}: ${texto || "sin marcas"}`;
  };

  const contradicciones = denticion === "MIXTA" ? contradiccionesMixta(marcas) : [];

  const renderFila = (fila: Fila, y: number) =>
    fila.dientes.map((d, i) => (
      <Diente
        key={d}
        diente={d}
        x={xDeSlot(i + fila.desplazamiento)}
        y={y}
        marcas={marcas}
        herramienta={editable ? def : null}
        onClic={editable ? clic : undefined}
        onMenu={editable && !tactil ? (diente, superficie, x, y) => setMenu({ diente, superficie, x, y }) : undefined}
        estado={estados?.get(d)}
        enfocado={editable && foco === d}
        dienteCompleto={tactil}
      />
    ));

  const yInferiores = superiores.length * ALTO_FILA + SEPARACION_ARCADAS;
  const claseAccion =
    "inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div className="flex flex-col gap-4 xl:flex-row">
      {menu && onChange && (
        <MenuDiente
          {...menu}
          marcas={marcas}
          onElegir={(nuevas) => {
            cambiar(nuevas);
            setMenu(null);
          }}
          onCerrar={cerrarMenu}
        />
      )}
      {ficha && onChange && (
        <FichaDiente
          diente={ficha.diente}
          superficieInicial={ficha.superficie}
          marcas={marcas}
          onCambio={cambiar}
          onMover={(delta) => setFicha({ diente: moverEnFicha(ficha.diente, delta), superficie: null })}
          onCerrar={() => {
            setFicha(null);
            if (!tactil) contenedor.current?.focus({ preventScroll: true });
          }}
        />
      )}
      <div className="min-w-0 flex-1">
        {editable && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={deshacer} disabled={!hayHistorial} className={claseAccion} title="Deshacer (Ctrl+Z)">
              ↶ Deshacer
            </button>
            <button
              type="button"
              onClick={() => cambiar(marcarRestoSano(marcas, denticion))}
              className={claseAccion}
              title="Pone Sano en los dientes que no tienen ninguna marca"
            >
              Marcar el resto como sano
            </button>
            {confirmarBorrado ? (
              <span className="inline-flex items-center gap-1.5 text-xs">
                <span className="text-slate-600">¿Borrar todo el odontograma?</span>
                <button
                  type="button"
                  onClick={() => {
                    cambiar([]);
                    setConfirmarBorrado(false);
                  }}
                  className="rounded-full bg-red-600 px-3 py-1.5 font-semibold text-white hover:bg-red-700"
                >
                  Sí, borrar
                </button>
                <button type="button" onClick={() => setConfirmarBorrado(false)} className="rounded-full px-2 py-1.5 text-slate-600 hover:bg-slate-100">
                  No
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirmarBorrado(true)} disabled={marcas.length === 0} className={`${claseAccion} text-red-700`}>
                Borrar todo
              </button>
            )}
            <span className="text-[11px] text-slate-500">
              {tactil ? "Toca un diente para abrir su ficha." : "Teclado: flechas para moverte, Enter abre el diente, Supr lo borra."}
            </span>
          </div>
        )}

        {contradicciones.length > 0 && (
          <div role="status" className="mb-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <p className="font-semibold">Revisa la dentición mixta: un temporal y su permanente no pueden estar los dos en boca.</p>
            <ul className="mt-1 flex flex-col gap-1">
              {contradicciones.map(({ temporal, permanente }) => (
                <li key={temporal} className="flex flex-wrap items-center gap-2">
                  <span>
                    El <b>{temporal}</b> y el <b>{permanente}</b> tienen marcas de presentes.
                  </span>
                  {editable && (
                    <>
                      <button
                        type="button"
                        onClick={() => cambiar(aplicarHallazgo(marcas, permanente, "SIN_ERUPCIONAR"))}
                        className="rounded-full border border-amber-400 bg-white px-2 py-0.5 font-semibold hover:bg-amber-100"
                      >
                        {permanente} sin erupcionar
                      </button>
                      <button
                        type="button"
                        onClick={() => cambiar(aplicarHallazgo(marcas, temporal, "AUSENTE"))}
                        className="rounded-full border border-amber-400 bg-white px-2 py-0.5 font-semibold hover:bg-amber-100"
                      >
                        {temporal} ausente
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div
          ref={contenedor}
          tabIndex={editable ? 0 : undefined}
          onKeyDown={teclado}
          onFocus={() => editable && !tactil && foco === null && setFoco(ultimoFoco.current ?? ordenLineal[0])}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              ultimoFoco.current = foco;
              setFoco(null);
            }
          }}
          aria-label={editable ? "Odontograma. Usa las flechas para moverte por los dientes y Enter para abrir uno." : undefined}
          className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
        >
          <svg viewBox={`-4 -4 ${ANCHO_TOTAL + 8} ${altoTotal + 8}`} className="w-full h-auto select-none" role="img" aria-label="Odontograma">
            {/* Cruz de cuadrantes */}
            <line x1={xDeSlot(8) - GUIA / 2} y1={0} x2={xDeSlot(8) - GUIA / 2} y2={altoTotal} stroke="#334155" strokeWidth={2.5} />
            <line
              x1={xDeSlot(0) + 6}
              y1={yInferiores - SEPARACION_ARCADAS / 2}
              x2={ANCHO_TOTAL - 6}
              y2={yInferiores - SEPARACION_ARCADAS / 2}
              stroke="#334155"
              strokeWidth={2.5}
            />
            {superiores.map((fila, i) => (
              <g key={`s${i}`}>{renderFila(fila, i * ALTO_FILA)}</g>
            ))}
            {inferiores.map((fila, i) => (
              <g key={`i${i}`}>{renderFila(fila, yInferiores + i * ALTO_FILA)}</g>
            ))}
          </svg>
          {/* Lo que leen los lectores de pantalla al moverse con el teclado */}
          <p className="sr-only" aria-live="polite">
            {foco !== null ? describir(foco) : ""}
          </p>
        </div>

        {mostrarResumen && (
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Hallazgos registrados</p>
            {resumen.length === 0 ? (
              <p className="text-xs text-slate-400">Todavía no hay hallazgos en el odontograma.</p>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-slate-700">
                {resumen.map(([diente, ms]) => (
                  <li key={diente}>
                    <span className="font-semibold">{diente}</span>:{" "}
                    {ms
                      .map((m) => {
                        const d = definicionHallazgo(m.hallazgo)!;
                        return m.superficie ? `${d.etiqueta} (${nombreSuperficie(m.diente, m.superficie)})` : d.etiqueta;
                      })
                      .join(" · ")}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {editable && !tactil && (
        <div className="xl:w-64 shrink-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Convenciones</p>
          <p className="text-[11px] text-slate-500 mb-2">
            Clic derecho sobre una cara o un diente para elegir desde ahí lo que puede tener. También puedes elegir una convención aquí y
            hacer clic en la cara del diente (las de diente completo se aplican con clic en cualquier parte). Clic
            de nuevo para quitarla.
          </p>
          <div className="grid grid-cols-2 xl:grid-cols-1 gap-1">
            {HALLAZGOS.map((h) => (
              <button
                key={h.codigo}
                type="button"
                onClick={() => setHerramienta(h.codigo)}
                className={`flex items-center gap-2 rounded-md border px-2 py-0.5 text-left text-xs transition-colors ${
                  herramienta === h.codigo ? "border-blue-700 bg-blue-50 ring-1 ring-blue-700" : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <SimboloHallazgo codigo={h.codigo} tamano={22} />
                <span className="flex-1 text-slate-700">{h.etiqueta}</span>
                <span className="text-[10px] font-semibold" style={{ color: COLORES_HEX[h.color] }}>
                  {h.color === "ROJO" ? "Rojo" : h.color === "AZUL" ? (h.simbolo.tipo === "RELLENO" && h.simbolo.halo ? "Azul/halo rojo" : "Azul") : "Negro"}
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setHerramienta("BORRAR")}
              className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition-colors ${
                herramienta === "BORRAR" ? "border-blue-700 bg-blue-50 ring-1 ring-blue-700" : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span className="w-[22px] text-center text-slate-400">✕</span>
              <span className="flex-1 text-slate-700">Borrar diente completo</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ficha de un diente (pantallas táctiles y teclado)
// ---------------------------------------------------------------------------

/**
 * Un diente en grande: se elige la cara tocándola (o con los botones V/L/M/D/O) y luego el
 * hallazgo, con botones del tamaño de un dedo. Las flechas pasan al diente vecino sin cerrar,
 * para dictar rápido.
 */
function FichaDiente({
  diente,
  superficieInicial,
  marcas,
  onCambio,
  onMover,
  onCerrar,
}: {
  diente: number;
  superficieInicial: Superficie | null;
  marcas: Marca[];
  onCambio: (marcas: Marca[]) => void;
  onMover: (delta: number) => void;
  onCerrar: () => void;
}) {
  const [cara, setCara] = useState<Superficie | null>(superficieInicial);
  const [dienteAnterior, setDienteAnterior] = useState(diente);
  const ref = useRef<HTMLDivElement>(null);
  // Al cambiar de diente, se vuelve a elegir la cara (patrón de "estado derivado" de React).
  if (dienteAnterior !== diente) {
    setDienteAnterior(diente);
    setCara(null);
  }

  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);

  const tiene = (h: CodigoHallazgo, s?: Superficie) =>
    marcas.some((m) => m.diente === diente && m.hallazgo === h && (s ? m.superficie === s : !m.superficie));
  const deCara = HALLAZGOS.filter((h) => h.nivel === "SUPERFICIE");
  const deDiente = HALLAZGOS.filter((h) => h.nivel === "DIENTE");
  const caras: Superficie[] = ["V", "L", "M", "D", "O"];

  const boton = (h: DefinicionHallazgo, marcado: boolean, aplicar: () => void) => (
    <button
      key={h.codigo}
      type="button"
      onClick={aplicar}
      aria-pressed={marcado}
      className={`flex min-h-11 items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left text-sm transition-colors ${
        marcado ? "border-blue-700 bg-blue-50 font-semibold text-blue-900" : "border-slate-200 text-slate-700 hover:bg-slate-50"
      }`}
    >
      <SimboloHallazgo codigo={h.codigo} tamano={22} />
      <span className="flex-1 leading-tight">{h.etiqueta}</span>
      {marcado && <span aria-hidden className="text-blue-700">✓</span>}
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-blue-950/50 backdrop-blur-[2px]"
      onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Diente ${diente}`}
        onKeyDown={(e) => {
          if (e.key === "Escape") onCerrar();
          else if (e.key === "ArrowRight" && !(e.target instanceof HTMLButtonElement && e.target.dataset.cara)) onMover(1);
          else if (e.key === "ArrowLeft" && !(e.target instanceof HTMLButtonElement && e.target.dataset.cara)) onMover(-1);
        }}
        className="w-full sm:max-w-lg max-h-[88dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white p-4 sm:p-5 shadow-2xl outline-none"
      >
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={() => onMover(-1)} className="grid h-11 w-11 place-items-center rounded-full bg-blue-50 text-blue-800 hover:bg-blue-100" aria-label="Diente anterior">
            ←
          </button>
          <div className="text-center leading-tight">
            <p className="font-heading text-xl font-extrabold text-blue-900">Diente {diente}</p>
            <p className="text-xs text-slate-500">{nombreDiente(diente)}</p>
          </div>
          <button type="button" onClick={() => onMover(1)} className="grid h-11 w-11 place-items-center rounded-full bg-blue-50 text-blue-800 hover:bg-blue-100" aria-label="Diente siguiente">
            →
          </button>
        </div>

        <div className="mt-3 flex flex-col items-center gap-3 sm:flex-row">
          <svg viewBox={`0 0 ${ANCHO} ${ALTO_FILA}`} className="w-24 sm:w-28 shrink-0" aria-hidden>
            <Diente diente={diente} x={0} y={0} marcas={marcas} herramienta={null} onClic={(_, s) => setCara(s)} sinEtiqueta />
          </svg>
          <div className="w-full">
            <p className="text-xs font-semibold text-slate-500 mb-1.5">1. Toca la cara del diente (o elígela aquí)</p>
            <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Cara">
              {caras.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  data-cara={c}
                  aria-checked={cara === c}
                  onClick={() => setCara(cara === c ? null : c)}
                  className={`min-h-11 rounded-xl border text-center leading-tight ${
                    cara === c ? "border-blue-700 bg-blue-800 text-white" : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="block font-heading text-base font-bold">{letraSuperficie(diente, c)}</span>
                  <span className="block text-[10px] capitalize">{nombreSuperficie(diente, c)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {cara && (
          <section className="mt-4">
            <p className="text-xs font-semibold text-slate-500 mb-1.5">2. Qué tiene la cara {nombreSuperficie(diente, cara)}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
              {deCara.map((h) => boton(h, tiene(h.codigo, cara), () => onCambio(aplicarHallazgo(marcas, diente, h.codigo, cara))))}
            </div>
          </section>
        )}

        <section className="mt-4">
          <p className="text-xs font-semibold text-slate-500 mb-1.5">Todo el diente</p>
          <div className="grid grid-cols-2 gap-1.5">
            {deDiente.map((h) => boton(h, tiene(h.codigo), () => onCambio(aplicarHallazgo(marcas, diente, h.codigo))))}
          </div>
        </section>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => onCambio(limpiarDiente(marcas, diente))}
            disabled={!marcas.some((m) => m.diente === diente)}
            className="rounded-full px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-40"
          >
            Borrar todo lo del diente
          </button>
          <button type="button" onClick={onCerrar} className="btn-primario">
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Menú contextual (clic derecho)
// ---------------------------------------------------------------------------

/**
 * Lo que puede tener la cara o el diente donde se hizo clic derecho: los hallazgos de esa
 * cara (caries, obturaciones) y los del diente completo. Lo que ya está marcado aparece con
 * ✓ y, al elegirlo de nuevo, se quita (igual que con la paleta).
 */
function MenuDiente({
  diente,
  superficie,
  x,
  y,
  marcas,
  onElegir,
  onCerrar,
}: {
  diente: number;
  superficie: Superficie | null;
  x: number;
  y: number;
  marcas: Marca[];
  onElegir: (marcas: Marca[]) => void;
  onCerrar: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fuera = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onCerrar();
    };
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    // Se cierra si se desplaza la página, pero no si se desplaza la lista del propio menú.
    const desplazamiento = (e: Event) => {
      if (ref.current && e.target instanceof Node && ref.current.contains(e.target)) return;
      onCerrar();
    };
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", tecla);
    window.addEventListener("scroll", desplazamiento, true);
    window.addEventListener("resize", onCerrar);
    ref.current?.querySelector("button")?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", tecla);
      window.removeEventListener("scroll", desplazamiento, true);
      window.removeEventListener("resize", onCerrar);
    };
  }, [onCerrar]);

  // Que no se salga de la pantalla.
  const ANCHO_MENU = 272;
  const left = Math.max(8, Math.min(x, (typeof window !== "undefined" ? window.innerWidth : 1200) - ANCHO_MENU - 8));
  const alto = typeof window !== "undefined" ? window.innerHeight : 800;
  const top = Math.max(8, Math.min(y, alto - Math.min(460, alto * 0.7) - 8));

  const tiene = (h: CodigoHallazgo, cara?: Superficie) =>
    marcas.some((m) => m.diente === diente && m.hallazgo === h && (cara ? m.superficie === cara : !m.superficie));
  const deCara = HALLAZGOS.filter((h) => h.nivel === "SUPERFICIE");
  const deDiente = HALLAZGOS.filter((h) => h.nivel === "DIENTE");

  const item = (h: DefinicionHallazgo, marcado: boolean, aplicar: () => void) => (
    <button
      key={h.codigo}
      type="button"
      role="menuitem"
      onClick={aplicar}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs text-slate-700 hover:bg-cyan-50 focus:bg-cyan-50 focus:outline-none"
    >
      <SimboloHallazgo codigo={h.codigo} tamano={18} />
      <span className="flex-1">{h.etiqueta}</span>
      {marcado && <span className="font-bold text-cyan-700">✓</span>}
    </button>
  );

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={`Hallazgos del diente ${diente}`}
      className="fixed z-50 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
      style={{ left, top, width: ANCHO_MENU, maxHeight: "min(460px, 70vh)" }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <p className="px-2 pt-1 font-heading text-sm font-semibold text-cyan-900">Diente {diente}</p>
      <p className="px-2 pb-1 text-[11px] text-slate-500">{nombreDiente(diente)}</p>

      {superficie && (
        <>
          <p className="mt-1 px-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Cara {nombreSuperficie(diente, superficie)}
          </p>
          {deCara.map((h) => item(h, tiene(h.codigo, superficie), () => onElegir(aplicarHallazgo(marcas, diente, h.codigo, superficie))))}
        </>
      )}

      <p className="mt-1 px-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Todo el diente</p>
      {deDiente.map((h) => item(h, tiene(h.codigo), () => onElegir(aplicarHallazgo(marcas, diente, h.codigo))))}

      <div className="mt-1 border-t border-slate-100 pt-1">
        <button
          type="button"
          role="menuitem"
          onClick={() => onElegir(limpiarDiente(marcas, diente))}
          className="w-full rounded-md px-2 py-1 text-left text-xs text-red-600 hover:bg-red-50 focus:bg-red-50 focus:outline-none"
        >
          Borrar todo lo del diente
        </button>
      </div>
    </div>
  );
}
