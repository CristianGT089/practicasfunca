"use client";

import type { ReactNode } from "react";
import type { Visual } from "@/lib/clase/tipos";
import { COLORES_GRAFICO } from "./GraficoSVG";

/**
 * Ilustraciones de las diapositivas `visual`: dibujos que explican una idea (la caja negra, el
 * signo $, BUSCARV, las zonas de la tabla dinámica…) mejor que una rejilla de tarjetas. Cada una
 * está pensada para caber en una pantalla 16:9 sin scroll.
 */
export default function Visuales({ visual }: { visual: Visual }) {
  switch (visual) {
    case "caja-negra":
      return <CajaNegra />;
    case "copiar":
      return <Copiar />;
    case "decision":
      return <Decision />;
    case "buscar":
      return <Buscar />;
    case "tipos-grafico":
      return <TiposGrafico />;
    case "partes-grafico":
      return <PartesGrafico />;
    case "zonas-dinamica":
      return <ZonasDinamica />;
    case "cuadricula":
      return <Cuadricula />;
    case "ordenar-filtrar":
      return <OrdenarFiltrar />;
  }
}

// ───────────────────────── Piezas comunes ─────────────────────────

/** Papeles de las partes de una fórmula: cada uno con su color, siempre el mismo. */
const PAPEL = {
  igual: "bg-slate-200 text-slate-700",
  nombre: "bg-blue-800 text-white",
  signo: "bg-slate-100 text-slate-500",
  a1: "bg-gold-100 text-[#7A5900]",
  a2: "bg-emerald-100 text-emerald-800",
  a3: "bg-rose-100 text-rose-800",
  a4: "bg-violet-100 text-violet-800",
} as const;
type Papel = keyof typeof PAPEL;
type Pieza = { t: string; p: Papel; n?: string };

/** Una fórmula con cada parte coloreada y, debajo, qué es cada parte. */
function Formula({ piezas, grande }: { piezas: Pieza[]; grande?: boolean }) {
  return (
    <div className="flex flex-wrap items-start justify-center gap-1">
      {piezas.map((x, i) => (
        <div key={i} className="flex flex-col items-center">
          <span className={`rounded-lg px-2 py-1 font-mono font-bold ${grande ? "text-2xl" : "text-xl"} ${PAPEL[x.p]}`}>{x.t}</span>
          {x.n && (
            <>
              <span className={`mt-1 h-2 w-full rounded-b-md border-x-2 border-b-2 ${x.p === "nombre" ? "border-blue-800" : "border-slate-300"}`} aria-hidden />
              <span className="mt-1 max-w-32 text-center text-xs font-semibold leading-tight text-slate-600">{x.n}</span>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

/** Hasta qué ancho el contenido va apilado: ahí la flecha apunta hacia abajo. */
const APILADA = { md: "max-md:rotate-90", lg: "max-lg:rotate-90" } as const;

function Flecha({
  texto,
  abajo,
  apilada,
  className = "",
}: {
  texto?: string;
  abajo?: boolean;
  /** El contenido se apila por debajo de este ancho (la flecha gira hacia abajo). */
  apilada?: keyof typeof APILADA;
  className?: string;
}) {
  return (
    <div className={`flex shrink-0 flex-col items-center justify-center gap-1 text-gold-600 ${className}`} aria-hidden>
      <svg viewBox="0 0 60 24" className={`h-6 w-14 ${abajo ? "rotate-90" : apilada ? APILADA[apilada] : ""}`}>
        <path d="M2 12 H50" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        <path d="M42 4 L54 12 L42 20" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {texto && <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{texto}</span>}
    </div>
  );
}

function Rotulo({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`mb-2 text-xs font-bold uppercase tracking-[0.15em] text-blue-500 ${className}`}>{children}</p>;
}

/** Número en círculo para señalar partes de un dibujo. */
function Paso({ n, className = "" }: { n: number; className?: string }) {
  return <span className={`inline-grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gold-500 text-xs font-extrabold text-blue-900 ${className}`}>{n}</span>;
}

/** Celda de una mini hoja. */
function C({ children, className = "", num }: { children?: ReactNode; className?: string; num?: boolean }) {
  return <td className={`border border-slate-200 px-2 py-1 ${num ? "text-right" : ""} ${className}`}>{children}</td>;
}

// ───────────────────────── La caja negra ─────────────────────────

function CajaNegra() {
  return (
    <div className="mt-5 flex flex-col gap-6">
      <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-[1fr_auto_1.3fr_auto_1fr]">
        {/* Entran los datos */}
        <div className="flex flex-col items-center">
          <Rotulo>1 · Entran los datos</Rotulo>
          <div className="overflow-hidden rounded-xl border border-slate-300 bg-white text-sm shadow-sm">
            <table className="border-collapse">
              <tbody>
                <tr>
                  <td className="w-8 bg-slate-100 text-center text-xs text-slate-500" />
                  <td className="bg-slate-100 px-3 text-center text-xs font-semibold text-slate-500">B</td>
                </tr>
                {[120, 80, 45, 60].map((v, i) => (
                  <tr key={i}>
                    <td className="bg-slate-100 text-center text-xs text-slate-500">{i + 2}</td>
                    <td className="border border-gold-500/40 bg-gold-50 px-6 py-1 text-right font-semibold text-blue-950">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-center text-sm text-slate-600">
            Los <b>argumentos</b>: aquí, el rango <span className="font-mono font-bold">B2:B5</span>
          </p>
        </div>

        <Flecha apilada="md" />

        {/* La caja */}
        <div className="flex flex-col items-center">
          <Rotulo>2 · La función trabaja</Rotulo>
          <div className="relative w-full max-w-xs overflow-hidden rounded-3xl bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 px-6 py-7 text-center shadow-xl ring-4 ring-blue-900/10">
            <div
              className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle,#fff_1px,transparent_1px)] [background-size:14px_14px]"
              aria-hidden
            />
            <div className="relative flex items-center justify-center gap-1 text-4xl" aria-hidden>
              <span className="inline-block animate-[spin_6s_linear_infinite]">⚙️</span>
              <span className="inline-block animate-[spin_4s_linear_infinite_reverse] text-2xl">⚙️</span>
            </div>
            <p className="relative mt-2 font-mono text-4xl font-extrabold tracking-wide text-gold-400">SUMA</p>
            <p className="relative mt-2 text-sm text-blue-200">No ves cómo calcula por dentro… ¡y no hace falta!</p>
          </div>
        </div>

        <Flecha apilada="md" />

        {/* Sale el resultado */}
        <div className="flex flex-col items-center">
          <Rotulo>3 · Sale el resultado</Rotulo>
          <div className="w-full max-w-56 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-2 py-1 font-mono text-sm">
              <span className="italic text-slate-400">fx</span>
              <span className="font-semibold text-blue-900">=SUMA(B2:B5)</span>
            </div>
            <div className="px-4 py-3 text-right font-heading text-4xl font-extrabold text-emerald-700 outline outline-2 -outline-offset-2 outline-[#1A73E8]">305</div>
          </div>
          <p className="mt-2 text-center text-sm text-slate-600">En la celda donde escribiste la fórmula</p>
        </div>
      </div>

      <div className="rounded-3xl bg-white px-4 py-4 shadow-sm ring-1 ring-blue-100">
        <Rotulo className="text-center">Así se escribe cualquier función</Rotulo>
        <Formula
          grande
          piezas={[
            { t: "=", p: "igual", n: "empieza con =" },
            { t: "SI", p: "nombre", n: "el nombre" },
            { t: "(", p: "signo", n: "abre" },
            { t: "B2>38", p: "a1", n: "argumento 1" },
            { t: ";", p: "signo", n: "separa" },
            { t: '"Fiebre"', p: "a2", n: "argumento 2" },
            { t: ";", p: "signo" },
            { t: '"Normal"', p: "a3", n: "argumento 3" },
            { t: ")", p: "signo", n: "cierra" },
          ]}
        />
      </div>
    </div>
  );
}

// ───────────────────────── Copiar: relativas y absolutas ─────────────────────────

const FILAS_COPIAR = [
  { fila: 2, total: "60.000", bien: "0,17" },
  { fila: 3, total: "64.000", bien: "0,19" },
  { fila: 4, total: "54.000", bien: "0,16" },
];

function PanelCopiar({ conPesos }: { conPesos: boolean }) {
  return (
    <div className={`flex-1 rounded-3xl border-2 p-4 ${conPesos ? "border-emerald-300 bg-emerald-50/60" : "border-rose-300 bg-rose-50/60"}`}>
      <p className={`font-heading text-xl font-bold ${conPesos ? "text-emerald-800" : "text-rose-800"}`}>{conPesos ? "✅ Con $: =D2/$D$7" : "❌ Sin $: =D2/D7"}</p>
      <div className="mt-3 flex items-stretch gap-3">
        <div className="flex flex-col items-center justify-center text-xs font-bold uppercase tracking-wider text-slate-500" aria-hidden>
          <span>copias</span>
          <span className="text-3xl leading-none text-gold-600">↓</span>
        </div>
        <div className="min-w-0 flex-1 overflow-x-auto">
          <table className="w-full border-collapse overflow-hidden rounded-xl bg-white text-sm shadow-sm">
            <thead>
              <tr className="bg-slate-100 text-xs text-slate-500">
                <th className="w-10 py-1" />
                <th className="py-1">La fórmula queda…</th>
                <th className="py-1">Da</th>
              </tr>
            </thead>
            <tbody>
              {FILAS_COPIAR.map((f) => (
                <tr key={f.fila}>
                  <C className="bg-slate-50 text-center text-xs font-semibold text-slate-500">E{f.fila}</C>
                  <C className="font-mono text-base">
                    =D{f.fila}/
                    {conPesos ? (
                      <span className="rounded bg-emerald-200 px-1 font-bold text-emerald-900">$D$7</span>
                    ) : (
                      <span className={`rounded px-1 font-bold ${f.fila === 2 ? "bg-slate-200 text-slate-800" : "bg-rose-200 text-rose-900"}`}>D{f.fila + 5}</span>
                    )}
                  </C>
                  <C num className={`text-base font-bold ${conPesos || f.fila === 2 ? "text-emerald-700" : "text-rose-700"}`}>
                    {conPesos || f.fila === 2 ? f.bien : "#¡DIV/0!"}
                  </C>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-3 text-[15px] text-slate-700">
        {conPesos ? (
          <>
            El <b>$</b> deja quieto el total: todas las filas dividen entre <span className="font-mono font-bold">D7</span>.
          </>
        ) : (
          <>
            El total se corre a <span className="font-mono font-bold">D8</span>, <span className="font-mono font-bold">D9</span>… celdas vacías, y dividir entre vacío da error.
          </>
        )}
      </p>
    </div>
  );
}

function Copiar() {
  return (
    <div className="mt-5 flex flex-col gap-4">
      <div className="flex flex-col gap-4 md:flex-row">
        <PanelCopiar conPesos={false} />
        <PanelCopiar conPesos />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          ["B2", "Relativa", "Se corre al copiar. La normal."],
          ["$B$7", "Absoluta", "No se mueve nunca: totales, tablas."],
          ["B$7", "Mixta", "Fija solo la fila (o solo la columna)."],
        ].map(([ref, nombre, txt]) => (
          <div key={ref} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-2.5 shadow-sm ring-1 ring-blue-100">
            <span className="font-mono text-xl font-extrabold text-blue-900">{ref}</span>
            <span className="text-sm text-slate-700">
              <b>{nombre}.</b> {txt}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────── SI: decisión ─────────────────────────

function Decision() {
  return (
    <div className="mt-5 flex flex-col items-center gap-5">
      <Formula
        piezas={[
          { t: "=SI(", p: "nombre" },
          { t: "B2>38", p: "a1", n: "la pregunta" },
          { t: ";", p: "signo" },
          { t: '"Fiebre"', p: "a2", n: "si es VERDADERO" },
          { t: ";", p: "signo" },
          { t: '"Normal"', p: "a3", n: "si es FALSO" },
          { t: ")", p: "nombre" },
        ]}
      />
      {/* En pantallas estrechas: el rombo arriba y las dos salidas debajo, con flechas hacia abajo. */}
      <div className="grid w-full max-w-4xl grid-cols-2 items-center gap-x-3 gap-y-2 sm:grid-cols-[1fr_auto_1fr] sm:gap-2">
        <div className="flex flex-col items-center gap-2">
          <span className="flex flex-col items-center text-sm font-extrabold text-emerald-700 sm:hidden" aria-hidden>
            SÍ<span className="text-2xl leading-none">↓</span>
          </span>
          <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50 px-4 py-3 text-center sm:px-6">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              <span className="sm:hidden">Si es sí, </span>muestra
            </p>
            <p className="font-heading text-2xl font-extrabold text-emerald-800 sm:text-3xl">Fiebre</p>
          </div>
          <p className="text-sm text-slate-600">B2 = 39,2 °C</p>
        </div>
        <div className="order-first col-span-2 flex items-center justify-center gap-1 sm:order-none sm:col-span-1">
          <span className="hidden flex-col items-center text-sm font-extrabold text-emerald-700 sm:flex">
            SÍ<span className="text-2xl leading-none">←</span>
          </span>
          {/* El rombo rotado ocupa más que su caja: el margen evita que tape las flechas. */}
          <div className="my-7 grid h-32 w-32 rotate-45 place-items-center rounded-3xl bg-blue-900 shadow-lg sm:mx-7 sm:my-0">
            <div className="-rotate-45 text-center text-white">
              <p className="text-xs uppercase tracking-wider text-blue-200">¿Se cumple?</p>
              <p className="font-mono text-xl font-extrabold text-gold-400">B2 &gt; 38</p>
            </div>
          </div>
          <span className="hidden flex-col items-center text-sm font-extrabold text-rose-700 sm:flex">
            NO<span className="text-2xl leading-none">→</span>
          </span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="flex flex-col items-center text-sm font-extrabold text-rose-700 sm:hidden" aria-hidden>
            NO<span className="text-2xl leading-none">↓</span>
          </span>
          <div className="rounded-2xl border-2 border-rose-300 bg-rose-50 px-4 py-3 text-center sm:px-6">
            <p className="text-xs font-bold uppercase tracking-wider text-rose-700">
              <span className="sm:hidden">Si es no, </span>muestra
            </p>
            <p className="font-heading text-2xl font-extrabold text-rose-800 sm:text-3xl">Normal</p>
          </div>
          <p className="text-sm text-slate-600">B2 = 36,5 °C</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="text-sm font-semibold text-slate-600">Para preguntar:</span>
        {[
          ["=", "igual"],
          ["<>", "distinto"],
          [">", "mayor"],
          ["<", "menor"],
          [">=", "mayor o igual"],
          ["<=", "menor o igual"],
        ].map(([s, n]) => (
          <span key={s} className="rounded-full bg-white px-3 py-1 text-sm shadow-sm ring-1 ring-blue-100">
            <b className="font-mono text-blue-900">{s}</b> <span className="text-slate-600">{n}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────── BUSCARV ─────────────────────────

function Buscar() {
  const profesionales = [
    ["P01", "Laura Méndez", "Enfermera jefe"],
    ["P02", "Andrés Cárdenas", "Odontólogo"],
    ["P03", "Diana Rojas", "Auxiliar de enfermería"],
    ["P04", "Julián Ortiz", "Regente de farmacia"],
  ];
  return (
    <div className="mt-4 flex flex-col gap-5">
      <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-[1fr_auto_1.35fr]">
        <div>
          <Rotulo>Turnos (lo que tienes)</Rotulo>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse overflow-hidden rounded-xl bg-white text-[15px] shadow-sm">
              <thead>
                <tr className="bg-blue-900 text-left text-white">
                  <th className="px-2 py-1.5">Paciente</th>
                  <th className="px-2 py-1.5">Código</th>
                  <th className="px-2 py-1.5">Profesional</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <C>Óscar Vega</C>
                  <C>P01</C>
                  <C className="text-slate-400">…</C>
                </tr>
                <tr>
                  <C>Yuliana Cárdenas</C>
                  <C className="bg-gold-100 font-bold">
                    <span className="flex items-center gap-1">
                      <Paso n={1} /> P03
                    </span>
                  </C>
                  <C className="bg-emerald-100 font-bold text-emerald-900">
                    <span className="flex items-center gap-1">
                      <Paso n={4} /> Diana Rojas
                    </span>
                  </C>
                </tr>
                <tr>
                  <C>Carolina Espitia</C>
                  <C>P04</C>
                  <C className="text-slate-400">…</C>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <Flecha texto="busca" apilada="md" />
        <div>
          <Rotulo>Profesionales (la tabla donde busca)</Rotulo>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse overflow-hidden rounded-xl bg-white text-[15px] shadow-sm">
              <thead>
                <tr className="text-center text-xs font-bold text-slate-500">
                  {["columna 1", "columna 2", "columna 3"].map((c, i) => (
                    <th key={c} className={`py-1 ${i === 0 ? "bg-gold-100 text-[#7A5900]" : i === 1 ? "bg-emerald-100 text-emerald-800" : "bg-slate-100"}`}>
                      {c}
                    </th>
                  ))}
                </tr>
                <tr className="bg-blue-900 text-left text-white">
                  <th className="px-2 py-1.5">Código</th>
                  <th className="px-2 py-1.5">Nombre</th>
                  <th className="px-2 py-1.5">Cargo</th>
                </tr>
              </thead>
              <tbody>
                {profesionales.map((p) => {
                  const es = p[0] === "P03";
                  return (
                    <tr key={p[0]} className={es ? "bg-gold-50" : ""}>
                      <C className={es ? "font-bold" : ""}>
                        <span className="flex items-center gap-1">
                          {es && <Paso n={2} />}
                          {p[0]}
                        </span>
                      </C>
                      <C className={es ? "bg-emerald-100 font-bold text-emerald-900" : ""}>
                        <span className="flex items-center gap-1">
                          {es && <Paso n={3} />}
                          {p[1]}
                        </span>
                      </C>
                      <C className="text-slate-600">{p[2]}</C>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="rounded-3xl bg-white px-4 py-4 shadow-sm ring-1 ring-blue-100">
        <Formula
          piezas={[
            { t: "=BUSCARV(", p: "nombre" },
            { t: "B3", p: "a1", n: "① qué busco" },
            { t: ";", p: "signo" },
            { t: "$F$2:$H$5", p: "a2", n: "② dónde: lo busca en la 1.ª columna" },
            { t: ";", p: "signo" },
            { t: "2", p: "a3", n: "③ qué columna traigo" },
            { t: ";", p: "signo" },
            { t: "FALSO", p: "a4", n: "exacto (¡no lo olvides!)" },
            { t: ")", p: "nombre" },
          ]}
        />
        <p className="mt-3 text-center text-[15px] text-slate-700">
          <Paso n={4} className="mr-1 align-middle" /> trae <b>Diana Rojas</b>. Al copiar hacia abajo, cada paciente encuentra a su profesional.
        </p>
      </div>
    </div>
  );
}

// ───────────────────────── Tipos de gráfico ─────────────────────────

function MiniGrafico({ tipo }: { tipo: "columnas" | "barras" | "lineas" | "circular" }) {
  const azul = COLORES_GRAFICO[0];
  if (tipo === "columnas")
    return (
      <svg viewBox="0 0 160 100" className="h-24 w-full">
        <line x1="10" y1="90" x2="150" y2="90" stroke="#94A3B8" />
        {[50, 78, 34, 22, 40].map((h, i) => (
          <rect key={i} x={18 + i * 27} y={90 - h} width="16" height={h} rx="3" fill={azul} />
        ))}
      </svg>
    );
  if (tipo === "barras")
    return (
      <svg viewBox="0 0 160 100" className="h-24 w-full">
        <line x1="44" y1="6" x2="44" y2="94" stroke="#94A3B8" />
        {[100, 70, 48, 34, 16].map((w, i) => (
          <g key={i}>
            <rect x="8" y={11 + i * 17} width="30" height="5" rx="2" fill="#CBD5E1" />
            <rect x="44" y={8 + i * 17} width={w} height="11" rx="3" fill={azul} />
          </g>
        ))}
      </svg>
    );
  if (tipo === "lineas") {
    const pts = [62, 70, 44, 50, 26, 32].map((y, i) => [14 + i * 26, y]);
    return (
      <svg viewBox="0 0 160 100" className="h-24 w-full">
        <line x1="10" y1="90" x2="150" y2="90" stroke="#94A3B8" />
        <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={azul} strokeWidth="3" strokeLinejoin="round" />
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="4.5" fill={azul} stroke="#fff" strokeWidth="2" />
        ))}
      </svg>
    );
  }
  const partes = [0.52, 0.34, 0.14];
  let a = -Math.PI / 2;
  return (
    <svg viewBox="0 0 160 100" className="h-24 w-full">
      {partes.map((p, i) => {
        const a0 = a;
        a += p * Math.PI * 2;
        const r = 44;
        const [cx, cy] = [80, 50];
        const d = `M${cx} ${cy} L${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} A${r} ${r} 0 ${p > 0.5 ? 1 : 0} 1 ${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)} Z`;
        return <path key={i} d={d} fill={COLORES_GRAFICO[i]} stroke="#fff" strokeWidth="2" />;
      })}
    </svg>
  );
}

function TiposGrafico() {
  const tipos = [
    { tipo: "columnas" as const, nombre: "Columnas", para: "Comparar cantidades entre categorías", ej: "Atenciones por servicio" },
    { tipo: "barras" as const, nombre: "Barras", para: "Comparar con nombres largos o muchas categorías", ej: "Medicamentos más vendidos" },
    { tipo: "lineas" as const, nombre: "Líneas", para: "Ver cómo cambia algo en el tiempo", ej: "Facturación mes a mes" },
    { tipo: "circular" as const, nombre: "Circular", para: "Cómo se reparte un total (máx. 5 o 6 partes)", ej: "Pacientes por régimen" },
  ];
  return (
    <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {tipos.map((t) => (
        <div key={t.tipo} className="tarjeta flex flex-col p-4">
          <div className="rounded-2xl bg-blue-50/70 p-2">
            <MiniGrafico tipo={t.tipo} />
          </div>
          <p className="mt-3 font-heading text-xl font-bold text-blue-900">{t.nombre}</p>
          <p className="mt-1 text-[15px] text-slate-700">{t.para}</p>
          <p className="mt-auto pt-2 text-sm font-semibold text-gold-700">Ej.: {t.ej}</p>
        </div>
      ))}
    </div>
  );
}

// ───────────────────────── Partes de un gráfico ─────────────────────────

function Globo({ n, cx, cy }: { n: number; cx: number; cy: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r="13" fill="#FBBA00" />
      <text x={cx} y={cy + 4.5} textAnchor="middle" className="fill-blue-900 text-[13px] font-extrabold">
        {n}
      </text>
    </g>
  );
}

const DATOS_PARTES = [
  ["Consulta", 42],
  ["Vacunación", 65],
  ["Curación", 28],
  ["Odontología", 19],
  ["Urgencias", 33],
] as const;

/**
 * El gráfico con sus partes numeradas. En el celular se dibuja más angosto (rótulos del eje X
 * inclinados y el título en dos líneas) para que el texto no quede diminuto al encogerse.
 */
function LienzoPartes({ estrecho }: { estrecho?: boolean }) {
  const azul = COLORES_GRAFICO[0];
  // Área del gráfico dentro del SVG.
  const [ancho, alto] = estrecho ? [340, 300] : [520, 300];
  const [x0, x1, y0, y1] = estrecho ? [46, 330, 72, 228] : [70, 470, 60, 250];
  const y = (v: number) => y1 - (v / 80) * (y1 - y0);
  const banda = (x1 - x0) / DATOS_PARTES.length;
  const media = estrecho ? 18 : 22;
  return (
    <svg viewBox={`0 0 ${ancho} ${alto}`} className="h-auto w-full" role="img" aria-label="Gráfico de columnas con sus partes numeradas">
      {estrecho ? (
        <>
          <text x="186" y="26" textAnchor="middle" className="fill-slate-800 text-[17px] font-bold">
            Atenciones por servicio
          </text>
          <text x="186" y="47" textAnchor="middle" className="fill-slate-600 text-[14px] font-semibold">
            enero 2026
          </text>
          <Globo n={1} cx={18} cy={30} />
        </>
      ) : (
        <>
          <text x="270" y="30" textAnchor="middle" className="fill-slate-800 text-[17px] font-bold">
            Atenciones por servicio · enero 2026
          </text>
          <Globo n={1} cx={98} cy={25} />
        </>
      )}
      {[0, 20, 40, 60, 80].map((t) => (
        <g key={t}>
          <line x1={x0} x2={x1} y1={y(t)} y2={y(t)} stroke="#E2E8F0" />
          <text x={x0 - 8} y={y(t) + 4} textAnchor="end" className="fill-slate-500 text-[12px]">
            {t}
          </text>
        </g>
      ))}
      <Globo n={2} cx={estrecho ? 16 : 22} cy={estrecho ? y(70) : 150} />
      {DATOS_PARTES.map(([nombre, v], i) => {
        const cx = x0 + banda * i + banda / 2;
        const [a, b] = [cx - media, cx + media];
        return (
          <g key={nombre}>
            <path d={`M${a} ${y1} V${y(v) + 4} Q${a} ${y(v)} ${a + 4} ${y(v)} H${b - 4} Q${b} ${y(v)} ${b} ${y(v) + 4} V${y1} Z`} fill={azul} />
            {estrecho ? (
              <text x={cx + 4} y={y1 + 16} textAnchor="end" transform={`rotate(-35 ${cx + 4} ${y1 + 16})`} className="fill-slate-700 text-[12px]">
                {nombre}
              </text>
            ) : (
              <text x={cx} y={y1 + 18} textAnchor="middle" className="fill-slate-700 text-[12px]">
                {nombre}
              </text>
            )}
            {i === 1 && (
              <text x={cx} y={y(v) - 8} textAnchor="middle" className="fill-slate-800 text-[13px] font-bold">
                {v}
              </text>
            )}
          </g>
        );
      })}
      <line x1={x0} x2={x1} y1={y1} y2={y1} stroke="#94A3B8" />
      {estrecho ? (
        <>
          <Globo n={3} cx={325} cy={254} />
          {/* La serie se señala sobre la columna: al lado no hay espacio. */}
          <Globo n={4} cx={x0 + banda * 2.5} cy={y1 - 20} />
          <Globo n={5} cx={x0 + banda * 1.5 + 28} cy={y(65) - 12} />
        </>
      ) : (
        <>
          <Globo n={3} cx={490} cy={268} />
          <Globo n={4} cx={x0 + banda * 2.5 + 40} cy={y(28) + 10} />
          <Globo n={5} cx={x0 + banda * 1.5 + 34} cy={y(65) - 12} />
        </>
      )}
    </svg>
  );
}

function PartesGrafico() {
  const partes = [
    { n: 1, nombre: "Título", texto: "Dice qué muestra y de cuándo." },
    { n: 2, nombre: "Eje Y (valores)", texto: "La cantidad. Empieza en 0." },
    { n: 3, nombre: "Eje X (categorías)", texto: "Los nombres o el tiempo." },
    { n: 4, nombre: "Serie", texto: "Los valores dibujados: una serie, un color." },
    { n: 5, nombre: "Etiqueta de datos", texto: "El número exacto, solo donde importa." },
  ];
  return (
    <div className="mt-4 grid grid-cols-1 items-center gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <div className="rounded-3xl bg-white p-3 shadow-sm ring-1 ring-blue-100">
        <div className="sm:hidden">
          <LienzoPartes estrecho />
        </div>
        <div className="hidden sm:block">
          <LienzoPartes />
        </div>
      </div>
      <ol className="flex flex-col gap-2">
        {partes.map((p) => (
          <li key={p.n} className="flex items-start gap-3 rounded-2xl bg-white px-4 py-2.5 shadow-sm ring-1 ring-blue-100">
            <Paso n={p.n} className="mt-0.5" />
            <span>
              <b className="font-heading text-blue-900">{p.nombre}.</b> <span className="text-slate-700">{p.texto}</span>
            </span>
          </li>
        ))}
        <li className="rounded-2xl border-2 border-gold-500/50 bg-gold-50 px-4 py-2.5 text-[15px] text-blue-950">
          <b>Leyenda:</b> dice qué es cada color. Con una sola serie, sobra: el título ya lo dice.
        </li>
      </ol>
    </div>
  );
}

// ───────────────────────── Las 4 zonas de la tabla dinámica ─────────────────────────

const ZONA = {
  filas: { color: "bg-gold-100 text-[#7A5900] ring-gold-500/40", nombre: "Filas" },
  columnas: { color: "bg-sky-100 text-sky-900 ring-sky-300", nombre: "Columnas" },
  valores: { color: "bg-emerald-100 text-emerald-900 ring-emerald-300", nombre: "Valores" },
  filtros: { color: "bg-violet-100 text-violet-900 ring-violet-300", nombre: "Filtros" },
};

function ZonasDinamica() {
  const datos: [string, string, string, string][] = [
    ["Vacunación", "Centro", "18.000", "Atendida"],
    ["Curación", "Norte", "28.000", "Atendida"],
    ["Vacunación", "Norte", "36.000", "Atendida"],
    ["Curación", "Centro", "56.000", "Atendida"],
    ["Vacunación", "Centro", "18.000", "Cancelada"],
    ["Curación", "Norte", "28.000", "Atendida"],
  ];
  const encabezados: [string, keyof typeof ZONA][] = [
    ["Servicio", "filas"],
    ["Sede", "columnas"],
    ["Valor", "valores"],
    ["Estado", "filtros"],
  ];
  return (
    <div className="mt-4 grid grid-cols-1 items-center gap-3 lg:grid-cols-[1.25fr_auto_0.9fr_auto_1.1fr]">
      <div>
        <Rotulo>Los datos (muchas filas)</Rotulo>
        <div className="min-w-0 flex-1 overflow-x-auto">
          <table className="w-full border-collapse overflow-hidden rounded-xl bg-white text-sm shadow-sm">
            <thead>
              <tr>
                {encabezados.map(([h, z]) => (
                  <th key={h} className={`px-2 py-1.5 text-left ring-1 ring-inset ${ZONA[z].color}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {datos.map((f, i) => {
                const fuera = f[3] === "Cancelada";
                return (
                  <tr key={i} className={fuera ? "text-slate-300 line-through" : ""}>
                    {f.map((c, j) => (
                      <C key={j} num={j === 2}>
                        {c}
                      </C>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <Flecha apilada="lg" />
      <div>
        <Rotulo>El editor: 4 zonas</Rotulo>
        <div className="flex flex-col gap-2">
          {(
            [
              ["filas", "Servicio", "grupos hacia abajo"],
              ["columnas", "Sede", "grupos hacia la derecha"],
              ["valores", "Valor · SUMA", "lo que se calcula"],
              ["filtros", "Estado = Atendida", "lo que se deja fuera"],
            ] as const
          ).map(([z, campo, ayuda]) => (
            <div key={z} className={`rounded-xl px-3 py-2 ring-1 ring-inset ${ZONA[z].color}`}>
              <p className="text-[11px] font-bold uppercase tracking-wider opacity-80">{ZONA[z].nombre}</p>
              <p className="font-semibold">{campo}</p>
              <p className="text-xs opacity-80">{ayuda}</p>
            </div>
          ))}
        </div>
      </div>
      <Flecha apilada="lg" />
      <div>
        <Rotulo>El resultado (en segundos)</Rotulo>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse overflow-hidden rounded-xl bg-white text-[15px] shadow-sm">
            <thead>
              <tr>
                <th className="border border-slate-200 bg-slate-50 px-2 py-1.5 text-left text-xs text-slate-500">SUMA de Valor</th>
                {["Centro", "Norte"].map((s) => (
                  <th key={s} className={`border border-slate-200 px-2 py-1.5 text-right ${ZONA.columnas.color}`}>
                    {s}
                  </th>
                ))}
                <th className="border border-slate-200 bg-slate-100 px-2 py-1.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Curación", "56.000", "56.000", "112.000"],
                ["Vacunación", "18.000", "36.000", "54.000"],
              ].map(([s, ...v]) => (
                <tr key={s}>
                  <td className={`border border-slate-200 px-2 py-1.5 font-semibold ${ZONA.filas.color}`}>{s}</td>
                  {v.map((x, i) => (
                    <td key={i} className={`border border-slate-200 px-2 py-1.5 text-right ${i === 2 ? "bg-slate-50 font-semibold" : "bg-emerald-50 text-emerald-900"}`}>
                      {x}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="font-bold">
                <td className="border border-slate-200 bg-slate-100 px-2 py-1.5">Total</td>
                {["74.000", "92.000", "166.000"].map((x) => (
                  <td key={x} className="border border-slate-200 bg-slate-100 px-2 py-1.5 text-right">
                    {x}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-sm text-slate-600">La cancelada no cuenta: la dejó fuera el filtro.</p>
      </div>
    </div>
  );
}

// ───────────────────────── Clase 2: la cuadrícula ─────────────────────────

function Cuadricula() {
  const columnas = ["A", "B", "C", "D", "E"];
  const datos = [
    ["Medicamento", "Unidades", "Precio", "Vence", "Lote"],
    ["Ibuprofeno", "80", "800", "15/02/27", "A23"],
    ["Amoxicilina", "60", "1.500", "01/04/27", "B11"],
    ["Loratadina", "45", "1.200", "05/01/27", "C07"],
    ["Suero oral", "30", "2.500", "01/03/28", "D02"],
  ];
  const partes = [
    { n: 1, nombre: "Libro", texto: "El archivo completo: Inventario_Farmacia." },
    { n: 2, nombre: "Hoja", texto: "Cada pestaña de abajo: Enero, Febrero…" },
    { n: 3, nombre: "Columna", texto: "Vertical, con letras: la C." },
    { n: 4, nombre: "Fila", texto: "Horizontal, con números: la 4." },
    { n: 5, nombre: "Celda", texto: "El cruce: C4. Primero la letra, luego el número." },
    { n: 6, nombre: "Rango", texto: "Un grupo de celdas: E2:E5." },
  ];
  return (
    <div className="mt-4 grid grid-cols-1 items-center gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
      <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-md">
        <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
          <span className="grid h-6 w-6 place-items-center rounded bg-emerald-600 text-xs font-bold text-white">▦</span>
          <span className="font-semibold text-slate-800">Inventario_Farmacia</span>
          <Paso n={1} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs sm:text-sm">
            <thead>
              <tr>
                <th className="w-9 border border-slate-200 bg-slate-100" />
                {columnas.map((c) => (
                  <th key={c} className={`border border-slate-200 py-0.5 font-semibold ${c === "C" ? "bg-sky-200 text-sky-900" : "bg-slate-100 text-slate-500"}`}>
                    {c === "C" ? (
                      <span className="inline-flex items-center gap-1">
                        C <Paso n={3} />
                      </span>
                    ) : (
                      c
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {datos.map((fila, f) => (
                <tr key={f}>
                  <td className={`border border-slate-200 text-center font-semibold ${f === 3 ? "bg-gold-100 text-[#7A5900]" : "bg-slate-100 text-slate-500"}`}>
                    {f === 3 ? (
                      <span className="inline-flex items-center gap-0.5">
                        4<Paso n={4} className="!h-5 !w-5" />
                      </span>
                    ) : (
                      f + 1
                    )}
                  </td>
                  {fila.map((v, c) => {
                    const enCol = c === 2;
                    const enFila = f === 3;
                    const celda = enCol && enFila;
                    const rango = c === 4 && f >= 1;
                    return (
                      <td
                        key={c}
                        className={`border px-1 py-1.5 sm:px-2 ${f === 0 ? "font-bold" : ""} ${c > 0 && c < 3 && f > 0 ? "text-right" : ""} ${
                          celda
                            ? "relative border-slate-200 bg-white outline outline-[3px] -outline-offset-2 outline-[#1A73E8]"
                            : rango
                              ? "border-dashed border-violet-400 bg-violet-50"
                              : enCol
                                ? "border-slate-200 bg-sky-50"
                                : enFila
                                  ? "border-slate-200 bg-gold-50"
                                  : "border-slate-200"
                        }`}
                      >
                        {v}
                        {celda && <Paso n={5} className="absolute -right-2 -top-3" />}
                        {c === 4 && f === 1 && <Paso n={6} className="ml-1 align-middle" />}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-1 border-t border-slate-200 bg-slate-50 px-2 py-1.5 text-sm">
          <span className="rounded-t-md border-b-2 border-emerald-600 bg-white px-3 py-1 font-semibold text-emerald-700">Enero</span>
          <span className="px-3 py-1 text-slate-500">Febrero</span>
          <Paso n={2} />
        </div>
      </div>
      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
        {partes.map((p) => (
          <li key={p.n} className="flex items-start gap-3 rounded-2xl bg-white px-4 py-2 shadow-sm ring-1 ring-blue-100">
            <Paso n={p.n} className="mt-0.5" />
            <span>
              <b className="font-heading text-blue-900">{p.nombre}.</b> <span className="text-slate-700">{p.texto}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ───────────────────────── Clase 2: ordenar y filtrar ─────────────────────────

function Cabeza({ marca }: { marca: number }) {
  return (
    <tr className="bg-blue-900 text-left text-white">
      <th className="w-8 bg-blue-950 text-center text-xs font-normal text-blue-200">1</th>
      {["Medicamento", "Categoría", "Unidades"].map((h, i) => (
        <th key={h} className={`px-2 py-1.5 ${i === 2 ? "text-right" : ""}`}>
          {h} {i === marca && <span className="ml-1 rounded bg-gold-500 px-1 text-xs text-blue-900">{marca === 2 ? "Z→A" : "▼ filtro"}</span>}
        </th>
      ))}
    </tr>
  );
}

function OrdenarFiltrar() {
  const ordenado = [
    ["Acetaminofén", "Analgésico", 120],
    ["Ibuprofeno", "Analgésico", 80],
    ["Amoxicilina", "Antibiótico", 60],
    ["Loratadina", "Antialérgico", 45],
    ["Cefalexina", "Antibiótico", 25],
  ];
  const original = [
    ["Ibuprofeno", "Analgésico", 80],
    ["Amoxicilina", "Antibiótico", 60],
    ["Loratadina", "Antialérgico", 45],
    ["Acetaminofén", "Analgésico", 120],
    ["Cefalexina", "Antibiótico", 25],
  ];
  return (
    <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
      <div className="rounded-3xl border-2 border-blue-200 bg-white p-4">
        <p className="font-heading text-xl font-bold text-blue-900">🔀 Ordenar: cambia el orden</p>
        <p className="text-[15px] text-slate-600">Unidades de mayor a menor. Están todas, en otro orden.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse overflow-hidden rounded-xl text-sm">
            <thead>
              <Cabeza marca={2} />
            </thead>
            <tbody>
              {ordenado.map((f, i) => (
                <tr key={i}>
                  <C className="bg-slate-100 text-center text-xs text-slate-500">{i + 2}</C>
                  <C>{f[0]}</C>
                  <C>{f[1]}</C>
                  <C num className="font-semibold">
                    {f[2]}
                  </C>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-sm font-semibold text-emerald-700">Filas 2, 3, 4, 5, 6: seguidas.</p>
      </div>
      <div className="rounded-3xl border-2 border-blue-200 bg-white p-4">
        <p className="font-heading text-xl font-bold text-blue-900">🔍 Filtrar: oculta, no borra</p>
        <p className="text-[15px] text-slate-600">Solo «Antibiótico». Las demás siguen ahí, escondidas.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse overflow-hidden rounded-xl text-sm">
            <thead>
              <Cabeza marca={1} />
            </thead>
            <tbody>
              {original.map((f, i) => {
                const ve = f[1] === "Antibiótico";
                return ve ? (
                  <tr key={i}>
                    <C className="bg-slate-100 text-center text-xs font-bold text-blue-700">{i + 2}</C>
                    <C>{f[0]}</C>
                    <C className="font-semibold">{f[1]}</C>
                    <C num>{f[2]}</C>
                  </tr>
                ) : (
                  <tr key={i} aria-hidden>
                    <td colSpan={4} className="h-1.5 border-x border-slate-200 bg-[repeating-linear-gradient(45deg,#E2E8F0_0,#E2E8F0_4px,#fff_4px,#fff_8px)]" />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-sm font-semibold text-rose-700">Filas 3 y 6: los números se saltan. Esa es la pista.</p>
      </div>
    </div>
  );
}
