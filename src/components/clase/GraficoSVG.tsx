"use client";

import { useState } from "react";
import type { TipoGrafico } from "@/lib/clase/tipos";

/** Paleta categórica validada (orden fijo, nunca se cicla); con más de 6 categorías el resto va a «Otros». */
export const COLORES_GRAFICO = ["#3558B0", "#E8A400", "#0F9D6E", "#C2410C", "#3E9FE0", "#8B5CF6"];
const GRIS_OTROS = "#94A3B8";
const SERIE = COLORES_GRAFICO[0];

const W = 640;
const H = 330;

const compacto = new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 });
const completo = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

/** Marcas del eje: 0 y múltiplos «redondos» (1, 2 o 5 × 10ⁿ) hasta pasar el máximo. */
function marcas(max: number): number[] {
  if (max <= 0) return [0, 1];
  const bruto = max / 4;
  const pot = 10 ** Math.floor(Math.log10(bruto));
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * pot).find((p) => max / p <= 5) ?? 10 * pot;
  const out: number[] = [];
  for (let v = 0; v < max + paso * 0.999; v += paso) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

const corto = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);

/**
 * Gráfico de una serie, dibujado como lo haría Google Sheets (columnas, barras, líneas o
 * circular), con un recuadro al pasar el mouse. Sirve para las simulaciones de la clase.
 */
export default function GraficoSVG({
  tipo,
  etiquetas,
  valores,
  titulo,
  nombreSerie,
}: {
  tipo: TipoGrafico;
  etiquetas: string[];
  valores: number[];
  titulo?: string;
  nombreSerie?: string;
}) {
  const [hover, setHover] = useState<{ i: number; x: number; y: number } | null>(null);
  const n = etiquetas.length;
  const nombre = nombreSerie ?? "Valor";

  let cuerpo: React.ReactNode = null;
  let leyenda: React.ReactNode = null;
  let recuadro: React.ReactNode = null;

  if (!n) cuerpo = <text x={W / 2} y={H / 2} textAnchor="middle" className="fill-slate-400 text-sm">Sin datos para graficar</text>;
  else if (tipo === "circular") {
    // Partes de un todo: porcentajes. Más de 6 porciones → «Otros».
    let partes = etiquetas.map((e, i) => ({ e, v: Math.max(0, valores[i] ?? 0), i }));
    if (partes.length > 6) {
      const orden = [...partes].sort((a, b) => b.v - a.v);
      partes = [...orden.slice(0, 5), { e: "Otros", v: orden.slice(5).reduce((s, p) => s + p.v, 0), i: -1 }];
    }
    const total = partes.reduce((s, p) => s + p.v, 0) || 1;
    const cx = 200;
    const cy = H / 2 + 6;
    const r = 120;
    let ang = -Math.PI / 2;
    cuerpo = partes.map((p, k) => {
      const a = (p.v / total) * Math.PI * 2;
      const a0 = ang;
      const a1 = ang + a;
      ang = a1;
      const color = p.i === -1 ? GRIS_OTROS : COLORES_GRAFICO[k];
      const grande = a > Math.PI ? 1 : 0;
      const d =
        a >= Math.PI * 2 - 1e-6
          ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`
          : `M ${cx} ${cy} L ${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} A ${r} ${r} 0 ${grande} 1 ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)} Z`;
      const medio = (a0 + a1) / 2;
      const pct = (p.v / total) * 100;
      return (
        <g key={k} onMouseEnter={() => setHover({ i: k, x: cx + r * 0.6 * Math.cos(medio), y: cy + r * 0.6 * Math.sin(medio) })} onMouseLeave={() => setHover(null)}>
          <path d={d} fill={color} stroke="#fff" strokeWidth={2} opacity={hover && hover.i !== k ? 0.55 : 1} />
          {pct >= 7 && (
            <text x={cx + r * 0.66 * Math.cos(medio)} y={cy + r * 0.66 * Math.sin(medio)} textAnchor="middle" dominantBaseline="middle" className="pointer-events-none fill-white text-[13px] font-bold" style={{ paintOrder: "stroke" }} stroke="rgba(0,0,0,.25)" strokeWidth={2}>
              {Math.round(pct)}%
            </text>
          )}
        </g>
      );
    });
    leyenda = (
      <g transform={`translate(${cx + r + 40}, ${cy - partes.length * 13})`}>
        {partes.map((p, k) => (
          <g key={k} transform={`translate(0, ${k * 26})`}>
            <rect width={12} height={12} rx={3} fill={p.i === -1 ? GRIS_OTROS : COLORES_GRAFICO[k]} />
            <text x={20} y={10} className="fill-slate-700 text-[13px]">
              {corto(p.e, 22)} · <tspan className="font-semibold">{Math.round((p.v / total) * 100)}%</tspan>
            </text>
          </g>
        ))}
      </g>
    );
    const textoHover = hover ? partes[hover.i] : null;
    if (textoHover) recuadro = <Recuadro x={hover!.x} y={hover!.y} lineas={[textoHover.e, `${completo.format(textoHover.v)} (${Math.round((textoHover.v / total) * 100)}%)`]} />;
  } else {
    const max = Math.max(0, ...valores);
    const ticks = marcas(max);
    const tope = ticks[ticks.length - 1] || 1;
    const horizontal = tipo === "barras";
    const largo = Math.max(...etiquetas.map((e) => e.length));
    const izq = horizontal ? Math.min(170, 14 + Math.min(largo, 24) * 6.6) : 58;
    // Etiquetas largas o muchas: se inclinan y necesitan más espacio abajo.
    const inclinar = !horizontal && (n > 6 || largo * 6.5 > (W - 58 - 24) / n);
    const abajo = horizontal ? 34 : inclinar ? 96 : 50;
    const arriba = 18;
    const der = 24;
    const anchoUtil = W - izq - der;
    const altoUtil = H - arriba - abajo;

    if (horizontal) {
      const banda = altoUtil / n;
      const x = (v: number) => izq + (v / tope) * anchoUtil;
      cuerpo = (
        <>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={arriba} y2={H - abajo} stroke="#E2E8F0" />
              <text x={x(t)} y={H - abajo + 18} textAnchor="middle" className="fill-slate-500 text-[11px]">{compacto.format(t)}</text>
            </g>
          ))}
          {etiquetas.map((e, i) => {
            const y = arriba + i * banda + banda * 0.2;
            const alto = Math.max(4, banda * 0.6);
            const w = Math.max(0, x(valores[i] ?? 0) - izq);
            return (
              <g key={i} onMouseEnter={() => setHover({ i, x: izq + w, y: y + alto / 2 })} onMouseLeave={() => setHover(null)}>
                <rect x={izq} y={arriba + i * banda} width={anchoUtil} height={banda} fill="transparent" />
                <path d={barra(izq, y, w, alto, "h")} fill={SERIE} opacity={hover && hover.i !== i ? 0.55 : 1} />
                <text x={izq - 8} y={y + alto / 2} textAnchor="end" dominantBaseline="middle" className="fill-slate-700 text-[12px]">{corto(e, 24)}</text>
              </g>
            );
          })}
          <line x1={izq} x2={izq} y1={arriba} y2={H - abajo} stroke="#94A3B8" />
        </>
      );
    } else {
      const banda = anchoUtil / n;
      const y = (v: number) => H - abajo - (v / tope) * altoUtil;
      const rotar = inclinar;
      const cx = (i: number) => izq + i * banda + banda / 2;
      cuerpo = (
        <>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={izq} x2={W - der} y1={y(t)} y2={y(t)} stroke="#E2E8F0" />
              <text x={izq - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" className="fill-slate-500 text-[11px]">{compacto.format(t)}</text>
            </g>
          ))}
          {etiquetas.map((e, i) => (
            <text
              key={i}
              x={cx(i)}
              y={H - abajo + 16}
              textAnchor={rotar ? "end" : "middle"}
              transform={rotar ? `rotate(-30 ${cx(i)} ${H - abajo + 16})` : undefined}
              className="fill-slate-700 text-[12px]"
            >
              {corto(e, rotar ? 20 : 18)}
            </text>
          ))}
          {tipo === "columnas" &&
            etiquetas.map((_, i) => {
              const ancho = Math.max(4, Math.min(56, banda * 0.6));
              const v = valores[i] ?? 0;
              return (
                <g key={i} onMouseEnter={() => setHover({ i, x: cx(i), y: y(v) })} onMouseLeave={() => setHover(null)}>
                  <rect x={izq + i * banda} y={arriba} width={banda} height={altoUtil} fill="transparent" />
                  <path d={barra(cx(i) - ancho / 2, y(v), ancho, H - abajo - y(v), "v")} fill={SERIE} opacity={hover && hover.i !== i ? 0.55 : 1} />
                </g>
              );
            })}
          {tipo === "lineas" && (
            <>
              {hover && <line x1={cx(hover.i)} x2={cx(hover.i)} y1={arriba} y2={H - abajo} stroke="#94A3B8" strokeDasharray="3 3" />}
              <polyline points={etiquetas.map((_, i) => `${cx(i)},${y(valores[i] ?? 0)}`).join(" ")} fill="none" stroke={SERIE} strokeWidth={2} strokeLinejoin="round" />
              {etiquetas.map((_, i) => (
                <g key={i} onMouseEnter={() => setHover({ i, x: cx(i), y: y(valores[i] ?? 0) })} onMouseLeave={() => setHover(null)}>
                  <rect x={izq + i * banda} y={arriba} width={banda} height={altoUtil} fill="transparent" />
                  <circle cx={cx(i)} cy={y(valores[i] ?? 0)} r={hover?.i === i ? 6 : 4} fill={SERIE} stroke="#fff" strokeWidth={2} />
                </g>
              ))}
            </>
          )}
          <line x1={izq} x2={W - der} y1={H - abajo} y2={H - abajo} stroke="#94A3B8" />
        </>
      );
    }
    if (hover) recuadro = <Recuadro x={hover.x} y={hover.y} lineas={[etiquetas[hover.i], `${nombre}: ${completo.format(valores[hover.i] ?? 0)}`]} />;
  }

  return (
    <figure className="rounded-2xl border border-slate-200 bg-white p-3">
      <figcaption className={`px-2 text-center font-heading text-base font-bold ${titulo ? "text-slate-800" : "italic text-slate-400"}`}>
        {titulo || "Título del gráfico"}
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${titulo || "Gráfico"}: ${etiquetas.map((e, i) => `${e} ${valores[i]}`).join(", ")}`}>
        {cuerpo}
        {leyenda}
        {recuadro}
      </svg>
    </figure>
  );
}

/** Barra con las puntas de datos redondeadas (4 px) y la base recta sobre el eje. */
function barra(x: number, y: number, w: number, h: number, dir: "v" | "h"): string {
  const r = Math.min(4, dir === "v" ? w / 2 : h / 2, dir === "v" ? h : w);
  if (r <= 0) return "";
  if (dir === "v") return `M ${x} ${y + h} V ${y + r} Q ${x} ${y} ${x + r} ${y} H ${x + w - r} Q ${x + w} ${y} ${x + w} ${y + r} V ${y + h} Z`;
  return `M ${x} ${y} H ${x + w - r} Q ${x + w} ${y} ${x + w} ${y + r} V ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h} H ${x} Z`;
}

/** Recuadro de información al pasar el mouse. */
function Recuadro({ x, y, lineas }: { x: number; y: number; lineas: string[] }) {
  const ancho = Math.max(...lineas.map((l) => l.length)) * 7.2 + 20;
  const alto = lineas.length * 18 + 12;
  const bx = Math.min(Math.max(4, x - ancho / 2), W - ancho - 4);
  const by = y - alto - 12 < 4 ? y + 12 : y - alto - 12;
  return (
    <g className="pointer-events-none">
      <rect x={bx} y={by} width={ancho} height={alto} rx={8} fill="#1E2E55" opacity={0.95} />
      {lineas.map((l, i) => (
        <text key={i} x={bx + 10} y={by + 20 + i * 18} className={`fill-white text-[12px] ${i === 0 ? "font-bold" : ""}`}>
          {l}
        </text>
      ))}
    </g>
  );
}
