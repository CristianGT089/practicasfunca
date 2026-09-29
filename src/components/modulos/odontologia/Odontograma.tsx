"use client";

import { useMemo, useState } from "react";
import {
  COLORES_HEX,
  FILAS,
  HALLAZGOS,
  aplicarHallazgo,
  definicionHallazgo,
  esLadoDerecho,
  esSuperior,
  letraSuperficie,
  limpiarDiente,
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
  estado?: EstadoEtiqueta;
  sinEtiqueta?: boolean;
};

function Diente({ diente, x, y, marcas, herramienta, onClic, estado, sinEtiqueta }: PropsDiente) {
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
    <g onMouseLeave={() => setHover(null)} style={{ cursor: editable ? "pointer" : "default" }}>
      <title>{titulo}</title>
      {/* Área de clic de todo el diente para herramientas de diente completo */}
      {editable && herramientaDeDiente && (
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
  const editable = Boolean(onChange);
  const def = herramienta === "BORRAR" ? "BORRAR" : definicionHallazgo(herramienta)!;
  const { superiores, inferiores } = filasDe(denticion);
  const altoTotal = (superiores.length + inferiores.length) * ALTO_FILA + SEPARACION_ARCADAS;

  function clic(diente: number, superficie: Superficie) {
    if (!onChange) return;
    if (herramienta === "BORRAR") onChange(limpiarDiente(marcas, diente));
    else onChange(aplicarHallazgo(marcas, diente, herramienta, superficie));
  }

  const resumen = useMemo(() => {
    const porDiente = new Map<number, Marca[]>();
    for (const m of ordenarMarcas(marcas)) porDiente.set(m.diente, [...(porDiente.get(m.diente) ?? []), m]);
    return [...porDiente.entries()];
  }, [marcas]);

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
        estado={estados?.get(d)}
      />
    ));

  const yInferiores = superiores.length * ALTO_FILA + SEPARACION_ARCADAS;

  return (
    <div className="flex flex-col gap-4 xl:flex-row">
      <div className="min-w-0 flex-1">
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

      {editable && (
        <div className="xl:w-64 shrink-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Convenciones</p>
          <p className="text-[11px] text-slate-500 mb-2">
            Elige una convención y haz clic en la cara del diente (las de diente completo se aplican con clic en cualquier parte). Clic
            de nuevo para quitarla.
          </p>
          <div className="grid grid-cols-2 xl:grid-cols-1 gap-1">
            {HALLAZGOS.map((h) => (
              <button
                key={h.codigo}
                type="button"
                onClick={() => setHerramienta(h.codigo)}
                className={`flex items-center gap-2 rounded-md border px-2 py-0.5 text-left text-xs transition-colors ${
                  herramienta === h.codigo ? "border-cyan-600 bg-cyan-50 ring-1 ring-cyan-600" : "border-slate-200 hover:bg-slate-50"
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
                herramienta === "BORRAR" ? "border-cyan-600 bg-cyan-50 ring-1 ring-cyan-600" : "border-slate-200 hover:bg-slate-50"
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
