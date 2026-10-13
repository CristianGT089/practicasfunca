"use client";

import {
  BRADEN,
  CONCIENCIA,
  DOWNTON,
  EGRESOS,
  GLASGOW,
  INGRESOS,
  SOAPIE,
  VALORACION,
  VIAS,
  calcularBalance,
  interpretarSignos,
  medicamentoVacio,
  puntajeBraden,
  puntajeDownton,
  puntajeGlasgow,
  tomaVacia,
  type HojaEnfermeria,
  type ItemEscala,
  type Nivel,
  type TomaSignos,
} from "@/lib/modulos/enfermeria/hoja";
import { GrillaSi, Recuadro, Texto, claseInput } from "@/components/modulos/odontologia/SeccionesHistoria";

export type PacienteHoja = { nombre: string; edad: number | null; documento?: string | null };

type Props = {
  h: HojaEnfermeria;
  /** Sin `set` la hoja es de solo lectura (revisión del docente). */
  set?: (cambio: Partial<HojaEnfermeria>) => void;
  paciente?: PacienteHoja | null;
};

const COLOR_NIVEL: Record<Nivel, string> = {
  normal: "bg-emerald-50 text-emerald-700 border-emerald-200",
  alerta: "bg-amber-50 text-amber-800 border-amber-300",
  critico: "bg-red-50 text-red-700 border-red-300",
};

function Insignia({ nivel, children }: { nivel: Nivel; children: React.ReactNode }) {
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${COLOR_NIVEL[nivel]}`}>{children}</span>;
}

/** La hoja de enfermería completa, en el orden en que se diligencia durante el turno. */
export default function HojaEnfermeriaFormulario({ h, set, paciente }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <Identificacion h={h} set={set} paciente={paciente} />
      <SignosVitales h={h} set={set} paciente={paciente} />
      <Valoracion h={h} set={set} />
      <EscalasRiesgo h={h} set={set} />
      <Balance h={h} set={set} />
      <Medicamentos h={h} set={set} />
      <Nota h={h} set={set} />
    </div>
  );
}

// ---------------------------------------------------------------------------

function Identificacion({ h, set, paciente }: Props) {
  return (
    <Recuadro titulo="1. Identificación">
      {paciente && (
        <p className="mb-3 text-sm text-slate-700">
          <b className="text-slate-900">{paciente.nombre}</b>
          {paciente.edad !== null && ` · ${paciente.edad} años`}
          {paciente.documento && ` · ${paciente.documento}`}
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Texto etiqueta="Servicio" valor={h.servicio} onChange={set && ((v) => set({ servicio: v }))} filas={1} />
        <Texto etiqueta="Cama / habitación" valor={h.cama} onChange={set && ((v) => set({ cama: v }))} filas={1} />
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Turno
          <select value={h.turno} disabled={!set} onChange={(e) => set?.({ turno: e.target.value as HojaEnfermeria["turno"] })} className={claseInput}>
            <option value="">Elegir</option>
            <option value="MANANA">Mañana</option>
            <option value="TARDE">Tarde</option>
            <option value="NOCHE">Noche</option>
          </select>
        </label>
        <div className="sm:col-span-2">
          <Texto etiqueta="Diagnóstico médico" valor={h.diagnosticoMedico} onChange={set && ((v) => set({ diagnosticoMedico: v }))} filas={1} />
        </div>
        <div>
          <Texto etiqueta="Alergias" valor={h.alergias} onChange={set && ((v) => set({ alergias: v }))} filas={1} />
          {h.alergias.trim() && !/^(no|ninguna|niega)/i.test(h.alergias.trim()) && (
            <p className="mt-1 rounded-lg bg-red-600 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-white">Alergia: {h.alergias}</p>
          )}
        </div>
      </div>
    </Recuadro>
  );
}

// ---------------------------------------------------------------------------

const COLUMNAS: { campo: keyof TomaSignos; titulo: string; unidad: string; paso?: number }[] = [
  { campo: "fc", titulo: "FC", unidad: "lpm" },
  { campo: "fr", titulo: "FR", unidad: "rpm" },
  { campo: "temperatura", titulo: "T°", unidad: "°C", paso: 0.1 },
  { campo: "satO2", titulo: "SatO₂", unidad: "%" },
  { campo: "glucometria", titulo: "Glucometría", unidad: "mg/dL" },
  { campo: "dolor", titulo: "Dolor (EVA)", unidad: "0–10" },
];

function SignosVitales({ h, set, paciente }: Props) {
  const cambiarToma = (i: number, c: Partial<TomaSignos>) => set?.({ signos: h.signos.map((t, j) => (j === i ? { ...t, ...c } : t)) });
  const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));
  const edad = paciente?.edad ?? null;
  return (
    <Recuadro
      titulo="2. Signos vitales"
      extra={
        set && (
          <button
            type="button"
            onClick={() => set({ signos: [...h.signos, tomaVacia()] })}
            className="rounded-full border border-blue-700 px-2.5 py-0.5 text-xs font-semibold text-blue-800 hover:bg-blue-50"
          >
            + Otra toma
          </button>
        )
      }
    >
      <div className="flex flex-col gap-3">
        {h.signos.map((t, i) => {
          const interp = interpretarSignos(t, edad);
          return (
            <div key={i} className="rounded-xl border border-blue-100 p-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Hora <span className="text-[10px] font-normal text-slate-400">24 h</span>
                  <input type="time" value={t.hora} disabled={!set} onChange={(e) => cambiarToma(i, { hora: e.target.value })} className={`${claseInput} px-2`} />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 sm:col-span-1">
                  TA <span className="text-[10px] font-normal text-slate-400">mmHg</span>
                  <span className="flex items-center gap-1">
                    <input
                      inputMode="numeric"
                      aria-label="Tensión sistólica"
                      value={t.tas ?? ""}
                      disabled={!set}
                      onChange={(e) => cambiarToma(i, { tas: num(e.target.value) })}
                      className={`${claseInput} px-2`}
                    />
                    /
                    <input
                      inputMode="numeric"
                      aria-label="Tensión diastólica"
                      value={t.tad ?? ""}
                      disabled={!set}
                      onChange={(e) => cambiarToma(i, { tad: num(e.target.value) })}
                      className={`${claseInput} px-2`}
                    />
                  </span>
                  {interp.tas && <Insignia nivel={interp.tas.nivel}>{interp.tas.texto}</Insignia>}
                </label>
                {COLUMNAS.map((c) => {
                  const it = interp[c.campo];
                  return (
                    <label key={c.campo} className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                      {c.titulo} <span className="text-[10px] font-normal text-slate-400">{c.unidad}</span>
                      <input
                        inputMode="decimal"
                        value={(t[c.campo] as number | null) ?? ""}
                        disabled={!set}
                        onChange={(e) => cambiarToma(i, { [c.campo]: num(e.target.value) })}
                        className={claseInput}
                      />
                      {it && <Insignia nivel={it.nivel}>{it.texto}</Insignia>}
                    </label>
                  );
                })}
              </div>
              {set && h.signos.length > 1 && (
                <button
                  type="button"
                  onClick={() => set({ signos: h.signos.filter((_, j) => j !== i) })}
                  className="mt-2 text-xs text-slate-500 hover:text-red-600"
                >
                  Quitar esta toma
                </button>
              )}
            </div>
          );
        })}
        <p className="text-[11px] text-slate-500">
          {edad !== null && edad < 18
            ? "Paciente menor de edad: los rangos normales cambian con la edad; la interpretación automática no aplica."
            : "La interpretación usa rangos de referencia de adulto en reposo."}
        </p>
      </div>
    </Recuadro>
  );
}

// ---------------------------------------------------------------------------

function Valoracion({ h, set }: Props) {
  return (
    <Recuadro titulo="3. Valoración">
      <p className="text-[11px] font-semibold text-slate-500 mb-1">Estado de conciencia</p>
      <div className="mb-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Estado de conciencia">
        {CONCIENCIA.map((c) => (
          <button
            key={c.codigo}
            type="button"
            role="radio"
            aria-checked={h.conciencia === c.codigo}
            disabled={!set}
            onClick={() => set?.({ conciencia: h.conciencia === c.codigo ? "" : c.codigo })}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              h.conciencia === c.codigo ? "border-blue-700 bg-blue-800 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {c.etiqueta}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {VALORACION.map((g) => (
          <div key={g.grupo}>
            <p className="text-[11px] font-semibold text-slate-500 mb-1">{g.grupo}</p>
            <GrillaSi items={g.items} seleccion={h.valoracion} onChange={set && ((v) => set({ valoracion: v }))} columnas="sm:grid-cols-2" />
          </div>
        ))}
      </div>
    </Recuadro>
  );
}

// ---------------------------------------------------------------------------

function SelectEscala({
  escala,
  respuestas,
  onChange,
}: {
  escala: ItemEscala[];
  respuestas: Record<string, number>;
  onChange?: (r: Record<string, number>) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {escala.map((item) => (
        <label key={item.codigo} className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          {item.etiqueta}
          <select
            value={respuestas[item.codigo] ?? ""}
            disabled={!onChange}
            onChange={(e) => {
              const r = { ...respuestas };
              if (e.target.value === "") delete r[item.codigo];
              else r[item.codigo] = Number(e.target.value);
              onChange?.(r);
            }}
            className={claseInput}
          >
            <option value="">Elegir</option>
            {item.opciones.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.valor} — {o.etiqueta}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}

function EscalasRiesgo({ h, set }: Props) {
  const e = h.escalas;
  const setE = (c: Partial<HojaEnfermeria["escalas"]>) => set?.({ escalas: { ...e, ...c } });
  const braden = puntajeBraden(e.braden);
  const glasgow = puntajeGlasgow(e.glasgow);
  const downton = puntajeDownton(e.downton);
  const resultado = (r: { total: number; riesgo: string; nivel: Nivel } | null, faltan: string) =>
    r ? (
      <Insignia nivel={r.nivel}>
        {r.total} · {r.riesgo}
      </Insignia>
    ) : (
      <span className="text-[11px] text-slate-400">{faltan}</span>
    );
  return (
    <Recuadro titulo="4. Escalas de valoración">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-blue-100 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-800">Braden <span className="text-[11px] font-normal text-slate-500">(lesión por presión)</span></p>
            {resultado(braden, "Completa los 6 ítems")}
          </div>
          <SelectEscala escala={BRADEN} respuestas={e.braden} onChange={set && ((r) => setE({ braden: r }))} />
        </div>
        <div className="rounded-xl border border-blue-100 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-800">Glasgow <span className="text-[11px] font-normal text-slate-500">(conciencia)</span></p>
            {resultado(glasgow, "Completa los 3 ítems")}
          </div>
          <SelectEscala escala={GLASGOW} respuestas={e.glasgow} onChange={set && ((r) => setE({ glasgow: r }))} />
        </div>
        <div className="rounded-xl border border-blue-100 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-800">Downton <span className="text-[11px] font-normal text-slate-500">(caídas)</span></p>
            {resultado(downton, "")}
          </div>
          <div className="flex flex-col gap-2">
            {DOWNTON.map((g) => (
              <div key={g.grupo}>
                <p className="text-[11px] font-semibold text-slate-500 mb-1">{g.grupo}</p>
                <GrillaSi items={g.items} seleccion={e.downton} onChange={set && ((v) => setE({ downton: v }))} columnas="" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Recuadro>
  );
}

// ---------------------------------------------------------------------------

function Balance({ h, set }: Props) {
  const b = h.balance;
  const c = calcularBalance(b);
  const setLinea = (tipo: "ingresos" | "egresos", codigo: string, v: string) => {
    const n = Math.max(0, Math.round(Number(v) || 0));
    const lista = { ...b[tipo] };
    if (n > 0) lista[codigo] = n;
    else delete lista[codigo];
    set?.({ balance: { ...b, [tipo]: lista } });
  };
  const columna = (titulo: string, tipo: "ingresos" | "egresos", catalogo: typeof INGRESOS, total: number) => (
    <div className="rounded-xl border border-blue-100 p-3">
      <p className="mb-2 text-sm font-semibold text-slate-800">{titulo}</p>
      <div className="flex flex-col gap-1.5">
        {catalogo.map((i) => (
          <label key={i.codigo} className="flex items-center justify-between gap-2 text-xs text-slate-700">
            {i.etiqueta}
            <span className="flex items-center gap-1">
              <input
                inputMode="numeric"
                value={b[tipo][i.codigo] ?? ""}
                disabled={!set}
                onChange={(e) => setLinea(tipo, i.codigo, e.target.value)}
                className={`${claseInput} w-24 text-right`}
                aria-label={`${titulo}: ${i.etiqueta} (ml)`}
              />
              <span className="text-slate-400">ml</span>
            </span>
          </label>
        ))}
        <p className="mt-1 flex justify-between border-t border-blue-100 pt-1.5 text-sm font-semibold text-slate-800">
          Total <span>{total.toLocaleString("es-CO")} ml</span>
        </p>
      </div>
    </div>
  );
  return (
    <Recuadro
      titulo="5. Control de líquidos (balance)"
      extra={
        <label className="flex items-center gap-1.5 text-xs text-slate-600">
          Periodo
          <select
            value={b.horas}
            disabled={!set}
            onChange={(e) => set?.({ balance: { ...b, horas: Number(e.target.value) } })}
            className="rounded-lg border border-blue-200 px-2 py-1 text-xs"
          >
            {[6, 8, 12, 24].map((x) => (
              <option key={x} value={x}>
                {x} horas
              </option>
            ))}
          </select>
        </label>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-stretch">
        {columna("Ingresos", "ingresos", INGRESOS, c.ingresos)}
        {columna("Egresos", "egresos", EGRESOS, c.egresos)}
        <div className="grid place-items-center rounded-xl bg-blue-50 px-6 py-3 text-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Balance</p>
            <p className={`font-heading text-2xl font-extrabold ${c.balance > 0 ? "text-blue-800" : c.balance < 0 ? "text-amber-700" : "text-slate-700"}`}>
              {c.balance > 0 ? "+" : ""}
              {c.balance.toLocaleString("es-CO")} ml
            </p>
            <p className="text-[11px] text-slate-500">{c.balance > 0 ? "Positivo" : c.balance < 0 ? "Negativo" : "Neutro"} en {b.horas} h</p>
          </div>
        </div>
      </div>
    </Recuadro>
  );
}

// ---------------------------------------------------------------------------

function Medicamentos({ h, set }: Props) {
  const filas = h.medicamentos;
  const cambiar = (i: number, c: Partial<(typeof filas)[number]>) => set?.({ medicamentos: filas.map((m, j) => (j === i ? { ...m, ...c } : m)) });
  return (
    <Recuadro
      titulo="6. Administración de medicamentos"
      extra={
        set && (
          <button
            type="button"
            onClick={() => set({ medicamentos: [...filas, medicamentoVacio()] })}
            className="rounded-full border border-blue-700 px-2.5 py-0.5 text-xs font-semibold text-blue-800 hover:bg-blue-50"
          >
            + Medicamento
          </button>
        )
      }
    >
      {filas.length === 0 ? (
        <p className="text-xs text-slate-400">Sin medicamentos registrados en este turno.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {filas.map((m, i) => (
            <div key={i} className="rounded-xl border border-blue-100 p-3">
              <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                <div className="col-span-2">
                  <Texto etiqueta="Medicamento" valor={m.medicamento} onChange={set && ((v) => cambiar(i, { medicamento: v }))} filas={1} />
                </div>
                <Texto etiqueta="Dosis" valor={m.dosis} onChange={set && ((v) => cambiar(i, { dosis: v }))} filas={1} />
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Vía
                  <select value={m.via} disabled={!set} onChange={(e) => cambiar(i, { via: e.target.value })} className={claseInput}>
                    <option value="">Elegir</option>
                    {VIAS.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <Texto etiqueta="Frecuencia" valor={m.frecuencia} onChange={set && ((v) => cambiar(i, { frecuencia: v }))} filas={1} />
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Hora
                  <input type="time" value={m.hora} disabled={!set} onChange={(e) => cambiar(i, { hora: e.target.value })} className={claseInput} />
                </label>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-slate-600">¿Se administró?</span>
                {(["SI", "NO"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    disabled={!set}
                    aria-pressed={m.administrado === v}
                    onClick={() => cambiar(i, { administrado: m.administrado === v ? "" : v })}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      m.administrado === v
                        ? v === "SI"
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-red-600 bg-red-600 text-white"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {v === "SI" ? "Sí" : "No"}
                  </button>
                ))}
                {set && (
                  <button
                    type="button"
                    onClick={() => set({ medicamentos: filas.filter((_, j) => j !== i) })}
                    className="ml-auto text-xs text-slate-500 hover:text-red-600"
                  >
                    Quitar
                  </button>
                )}
              </div>
              <div className="mt-2">
                <Texto
                  etiqueta={m.administrado === "NO" ? "¿Por qué no se administró? (obligatorio)" : "Observación"}
                  valor={m.observacion}
                  onChange={set && ((v) => cambiar(i, { observacion: v }))}
                  filas={1}
                />
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="mt-2 text-[11px] text-slate-500">Antes de cada medicamento: paciente, medicamento, dosis, vía y hora correctos; alergias y signos vitales.</p>
    </Recuadro>
  );
}

// ---------------------------------------------------------------------------

function Nota({ h, set }: Props) {
  return (
    <Recuadro titulo="7. Nota de enfermería (SOAPIE)">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {SOAPIE.map(({ campo, titulo, ayuda }) => (
          <div key={campo}>
            <Texto etiqueta={titulo} valor={h.nota[campo]} onChange={set && ((v) => set({ nota: { ...h.nota, [campo]: v } }))} filas={2} />
            <p className="mt-0.5 text-[11px] text-slate-400">{ayuda}</p>
          </div>
        ))}
      </div>
    </Recuadro>
  );
}
