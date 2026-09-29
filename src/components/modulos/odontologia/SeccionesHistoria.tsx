"use client";

import type { ReactNode } from "react";
import {
  ALERTAS_MEDICAS,
  ANTECEDENTES_ODONTOLOGICOS,
  ANTECEDENTES_PERSONALES,
  EXAMEN_DENTAL,
  EXAMEN_ESTOMATOLOGICO_NA,
  EXAMEN_ESTOMATOLOGICO_SN,
  type HistoriaOdontologica,
  type ItemCatalogo,
  type SiNo,
} from "@/lib/modulos/odontologia/historia";
import type { Denticion } from "@/lib/modulos/odontologia/odontograma";
import Odontograma from "./Odontograma";
import IndicePlaca from "./IndicePlaca";

export type PacienteOdontologia = {
  nombres: string;
  primerApellido: string;
  segundoApellido: string | null;
  tipoDocumento: string;
  documento: string;
  sexo: string;
  fechaNacimiento: string;
  eps: string | null;
  profesion: string | null;
  ocupacion: string | null;
  estadoCivil: string | null;
  telefono: string | null;
  direccion: string | null;
  contactoEmergencia: string | null;
  parentescoContacto: string | null;
  telefonoContacto: string | null;
};

/** `set` ausente = solo lectura (revisión del docente). */
export type PropsSeccion = {
  h: HistoriaOdontologica;
  set?: (cambio: Partial<HistoriaOdontologica>) => void;
};

const claseInput =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:bg-slate-50 disabled:text-slate-700";

export function Recuadro({ titulo, children, extra }: { titulo: string; children: ReactNode; extra?: ReactNode }) {
  return (
    <section className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-heading font-semibold text-cyan-900">{titulo}</h3>
        {extra}
      </div>
      {children}
    </section>
  );
}

function Texto({
  etiqueta,
  valor,
  onChange,
  filas = 2,
}: {
  etiqueta: string;
  valor: string;
  onChange?: (v: string) => void;
  filas?: number;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
      {etiqueta}
      {filas > 1 ? (
        <textarea rows={filas} value={valor} disabled={!onChange} onChange={(e) => onChange?.(e.target.value)} className={claseInput} />
      ) : (
        <input value={valor} disabled={!onChange} onChange={(e) => onChange?.(e.target.value)} className={claseInput} />
      )}
    </label>
  );
}

function SiNoCampo({ etiqueta, valor, onChange }: { etiqueta: string; valor: SiNo; onChange?: (v: SiNo) => void }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs text-slate-700">
      <span>{etiqueta}</span>
      <div className="flex gap-1 shrink-0">
        {(["SI", "NO"] as const).map((op) => (
          <button
            key={op}
            type="button"
            disabled={!onChange}
            onClick={() => onChange?.(valor === op ? "" : op)}
            className={`rounded-md border px-2 py-0.5 font-semibold ${
              valor === op ? "border-cyan-600 bg-cyan-600 text-white" : "border-slate-300 text-slate-500 hover:bg-slate-50"
            } disabled:cursor-default`}
          >
            {op === "SI" ? "Sí" : "No"}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Lista "Marque Sí o No": marcado = Sí; sin marcar = No. */
export function GrillaSi({
  items,
  seleccion,
  onChange,
  columnas = "sm:grid-cols-2 lg:grid-cols-4",
  etiquetaSi = "Sí",
}: {
  items: ItemCatalogo[];
  seleccion: string[];
  onChange?: (v: string[]) => void;
  columnas?: string;
  etiquetaSi?: string;
}) {
  const alternar = (c: string) => onChange?.(seleccion.includes(c) ? seleccion.filter((x) => x !== c) : [...seleccion, c]);
  return (
    <div className={`grid grid-cols-1 ${columnas} gap-1`}>
      {items.map((it, i) => {
        const marcado = seleccion.includes(it.codigo);
        return (
          <button
            key={it.codigo}
            type="button"
            disabled={!onChange}
            onClick={() => alternar(it.codigo)}
            className={`flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-left text-xs transition-colors ${
              marcado ? "border-cyan-600 bg-cyan-50 text-cyan-900" : "border-slate-200 text-slate-600 hover:bg-slate-50"
            } disabled:cursor-default`}
          >
            <span>
              <span className="text-slate-400 mr-1">{i + 1}.</span>
              {it.etiqueta}
            </span>
            <span className={`shrink-0 font-semibold ${marcado ? "text-cyan-700" : "text-slate-400"}`}>{marcado ? etiquetaSi : "No"}</span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------

export function SeccionIdentificacion({ paciente }: { paciente: PacienteOdontologia }) {
  const nacimiento = new Date(paciente.fechaNacimiento);
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  if (hoy < new Date(hoy.getFullYear(), nacimiento.getMonth(), nacimiento.getDate())) edad -= 1;
  const campos: [string, string | null][] = [
    ["Nombres", paciente.nombres],
    ["Primer apellido", paciente.primerApellido],
    ["Segundo apellido", paciente.segundoApellido],
    ["Identificación", `${paciente.tipoDocumento} ${paciente.documento}`],
    ["Sexo", paciente.sexo === "F" ? "Femenino" : "Masculino"],
    ["Fecha de nacimiento", nacimiento.toLocaleDateString("es-CO", { timeZone: "UTC" })],
    ["Edad", `${edad} años`],
    ["EPS", paciente.eps],
    ["Profesión", paciente.profesion],
    ["Ocupación", paciente.ocupacion],
    ["Estado civil", paciente.estadoCivil],
    ["Teléfono - celular", paciente.telefono],
    ["Dirección residencia", paciente.direccion],
    ["En caso de emergencia avisar a", paciente.contactoEmergencia],
    ["Parentesco", paciente.parentescoContacto],
    ["Teléfono contacto", paciente.telefonoContacto],
  ];
  return (
    <Recuadro titulo="I. Identificación del paciente" extra={<span className="text-[11px] text-slate-400">Datos de admisiones</span>}>
      <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1 text-sm">
        {campos.map(([k, v]) => (
          <div key={k} className="flex gap-1">
            <dt className="text-slate-500">{k}:</dt>
            <dd className="font-medium text-slate-800">{v || "—"}</dd>
          </div>
        ))}
      </dl>
    </Recuadro>
  );
}

export function SeccionAlerta({ h, set }: PropsSeccion) {
  return (
    <Recuadro titulo="Alerta médica">
      <p className="text-xs text-slate-500 mb-2">Marca lo que cambia la forma de atender a este paciente (va en el encabezado de la historia).</p>
      <GrillaSi items={ALERTAS_MEDICAS} seleccion={h.alertaMedica} onChange={set && ((v) => set({ alertaMedica: v }))} columnas="sm:grid-cols-2" etiquetaSi="Alerta" />
      <div className="mt-2">
        <Texto etiqueta="Nota de la alerta" valor={h.alertaMedicaNota} onChange={set && ((v) => set({ alertaMedicaNota: v }))} filas={1} />
      </div>
    </Recuadro>
  );
}

export function SeccionAnamnesis({ h, set }: PropsSeccion) {
  return (
    <div className="flex flex-col gap-4">
      <Recuadro titulo="II. Motivo de consulta">
        <Texto etiqueta="En palabras del paciente" valor={h.motivoConsulta} onChange={set && ((v) => set({ motivoConsulta: v }))} />
      </Recuadro>
      <Recuadro titulo="III. Historia de la enfermedad">
        <Texto etiqueta="Enfermedad actual" valor={h.enfermedadActual} onChange={set && ((v) => set({ enfermedadActual: v }))} filas={3} />
      </Recuadro>
      <Recuadro titulo="IV. Antecedentes personales y familiares">
        <GrillaSi items={ANTECEDENTES_PERSONALES} seleccion={h.antecedentesPersonales} onChange={set && ((v) => set({ antecedentesPersonales: v }))} />
        <div className="mt-2">
          <Texto etiqueta="Observaciones" valor={h.antecedentesPersonalesObs} onChange={set && ((v) => set({ antecedentesPersonalesObs: v }))} />
        </div>
      </Recuadro>
      <Recuadro titulo="V. Antecedentes odontológicos">
        <GrillaSi items={ANTECEDENTES_ODONTOLOGICOS} seleccion={h.antecedentesOdontologicos} onChange={set && ((v) => set({ antecedentesOdontologicos: v }))} />
        <div className="mt-2">
          <Texto etiqueta="Observaciones" valor={h.antecedentesOdontologicosObs} onChange={set && ((v) => set({ antecedentesOdontologicosObs: v }))} />
        </div>
      </Recuadro>
    </div>
  );
}

export function SeccionExamenes({ h, set }: PropsSeccion) {
  const r = h.radiografia;
  const setRx = (c: Partial<HistoriaOdontologica["radiografia"]>) => set?.({ radiografia: { ...r, ...c } });
  return (
    <div className="flex flex-col gap-4">
      <Recuadro titulo="VI. Examen estomatológico">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 mb-1">Normal / Anormal (marcado = anormal)</p>
            <GrillaSi
              items={EXAMEN_ESTOMATOLOGICO_NA}
              seleccion={h.examenEstomatologico}
              onChange={set && ((v) => set({ examenEstomatologico: v }))}
              columnas="sm:grid-cols-2"
              etiquetaSi="A"
            />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 mb-1">Sí / No</p>
            <GrillaSi
              items={EXAMEN_ESTOMATOLOGICO_SN}
              seleccion={h.examenEstomatologico}
              onChange={set && ((v) => set({ examenEstomatologico: v }))}
              columnas="sm:grid-cols-2"
            />
          </div>
        </div>
        <div className="mt-2">
          <Texto etiqueta="Observaciones" valor={h.examenEstomatologicoObs} onChange={set && ((v) => set({ examenEstomatologicoObs: v }))} />
        </div>
      </Recuadro>

      <Recuadro titulo="VII. Examen pulpar, dental y periodontal">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {EXAMEN_DENTAL.map((g) => (
            <div key={g.grupo}>
              <p className="text-[11px] font-semibold text-slate-500 mb-1">{g.grupo}</p>
              <GrillaSi items={g.items} seleccion={h.examenDental} onChange={set && ((v) => set({ examenDental: v }))} columnas="" />
            </div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Texto etiqueta="Dientes afectados" valor={h.dientesAfectados} onChange={set && ((v) => set({ dientesAfectados: v }))} filas={1} />
          <Texto etiqueta="Observaciones" valor={h.examenDentalObs} onChange={set && ((v) => set({ examenDentalObs: v }))} filas={1} />
        </div>
      </Recuadro>

      <Recuadro titulo="IX. Análisis radiográfico">
        <div className="flex flex-col gap-2">
          <SiNoCampo etiqueta="¿Requiere radiografías?" valor={r.requiere} onChange={set && ((v) => setRx({ requiere: v }))} />
          <div className="flex gap-4 text-xs text-slate-700">
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={r.periapical} disabled={!set} onChange={(e) => setRx({ periapical: e.target.checked })} /> Periapical
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={r.panoramica} disabled={!set} onChange={(e) => setRx({ panoramica: e.target.checked })} /> Panorámica
            </label>
          </div>
          <Texto etiqueta="Dientes" valor={r.dientes} onChange={set && ((v) => setRx({ dientes: v }))} filas={1} />
          <Texto etiqueta="Observaciones" valor={r.observaciones} onChange={set && ((v) => setRx({ observaciones: v }))} />
        </div>
      </Recuadro>
    </div>
  );
}

export function SeccionOdontograma({ h, set, denticion }: PropsSeccion & { denticion: Denticion }) {
  return (
    <Recuadro titulo="X. Odontograma">
      <Odontograma denticion={denticion} marcas={h.odontograma} onChange={set && ((v) => set({ odontograma: v }))} />
    </Recuadro>
  );
}

export function SeccionPlacaHigiene({ h, set, denticion }: PropsSeccion & { denticion: Denticion }) {
  const hi = h.higiene;
  const setHi = (c: Partial<HistoriaOdontologica["higiene"]>) => set?.({ higiene: { ...hi, ...c } });
  return (
    <div className="flex flex-col gap-4">
      <Recuadro titulo="XIII. Índice de placa bacteriana (O'Leary)">
        <p className="text-xs text-slate-500 mb-2">Pinta de rojo las superficies teñidas por el revelador. Los dientes ausentes del odontograma no cuentan.</p>
        <IndicePlaca denticion={denticion} odontograma={h.odontograma} marcas={h.placa} onChange={set && ((v) => set({ placa: v }))} />
        <div className="mt-3 flex items-end gap-3">
          <div className="text-xs text-slate-600">
            <p className="font-semibold">Superficies teñidas × 100</p>
            <p className="border-t border-slate-400">Superficies presentes</p>
          </div>
          <span className="text-slate-500">=</span>
          <label className="flex items-center gap-1 text-xs font-medium text-slate-600">
            <input
              value={h.indicePlaca}
              disabled={!set}
              onChange={(e) => set?.({ indicePlaca: e.target.value })}
              className={`${claseInput} w-24`}
              placeholder="0"
              inputMode="decimal"
            />
            % índice final
          </label>
        </div>
      </Recuadro>

      <Recuadro titulo="XIV. Higiene oral">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-2">
          <Texto etiqueta="Última visita al odontólogo" valor={hi.ultimaVisita} onChange={set && ((v) => setHi({ ultimaVisita: v }))} filas={1} />
          <Texto etiqueta="Motivo" valor={hi.motivoUltimaVisita} onChange={set && ((v) => setHi({ motivoUltimaVisita: v }))} filas={1} />
          <SiNoCampo etiqueta="¿Se cepilla los dientes?" valor={hi.seCepilla} onChange={set && ((v) => setHi({ seCepilla: v }))} />
          <Texto etiqueta="¿Cuántas veces se cepilla al día?" valor={hi.vecesDia} onChange={set && ((v) => setHi({ vecesDia: v }))} filas={1} />
          <SiNoCampo etiqueta="Usa seda dental" valor={hi.sedaDental} onChange={set && ((v) => setHi({ sedaDental: v }))} />
          <SiNoCampo etiqueta="Usa enjuague bucal" valor={hi.enjuague} onChange={set && ((v) => setHi({ enjuague: v }))} />
          <SiNoCampo etiqueta="Le han aplicado flúor" valor={hi.fluor} onChange={set && ((v) => setHi({ fluor: v }))} />
          <Texto etiqueta="Última aplicación de flúor" valor={hi.ultimaFluor} onChange={set && ((v) => setHi({ ultimaFluor: v }))} filas={1} />
          <SiNoCampo etiqueta="Tiene tratamiento de ortodoncia" valor={hi.ortodoncia} onChange={set && ((v) => setHi({ ortodoncia: v }))} />
          <SiNoCampo etiqueta="Usa cepillo interproximal" valor={hi.cepilloInterproximal} onChange={set && ((v) => setHi({ cepilloInterproximal: v }))} />
          <Texto etiqueta="Última limpieza o fase higiénica" valor={hi.ultimaLimpieza} onChange={set && ((v) => setHi({ ultimaLimpieza: v }))} filas={1} />
        </div>
      </Recuadro>
    </div>
  );
}

const pesos = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`;

export function SeccionDiagnosticoPlan({ h, set }: PropsSeccion) {
  const d = h.diagnostico;
  const setD = (c: Partial<HistoriaOdontologica["diagnostico"]>) => set?.({ diagnostico: { ...d, ...c } });
  const p = h.pronostico;
  const setP = (c: Partial<HistoriaOdontologica["pronostico"]>) => set?.({ pronostico: { ...p, ...c } });
  const plan = h.planTratamiento;
  const setPlan = (i: number, c: Partial<(typeof plan)[number]>) => set?.({ planTratamiento: plan.map((r, j) => (j === i ? { ...r, ...c } : r)) });
  const total = plan.reduce((a, r) => a + r.valorUnitario * r.cantidad, 0);

  return (
    <div className="flex flex-col gap-4">
      <Recuadro titulo="XI. Diagnóstico(s)">
        <div className="grid grid-cols-1 gap-2">
          <Texto etiqueta="Articular" valor={d.articular} onChange={set && ((v) => setD({ articular: v }))} filas={1} />
          <Texto etiqueta="Pulpar" valor={d.pulpar} onChange={set && ((v) => setD({ pulpar: v }))} filas={1} />
          <Texto etiqueta="Periodontal" valor={d.periodontal} onChange={set && ((v) => setD({ periodontal: v }))} filas={1} />
          <Texto etiqueta="Dental" valor={d.dental} onChange={set && ((v) => setD({ dental: v }))} filas={1} />
          <Texto etiqueta="Remisión (a quién y por qué)" valor={d.remision} onChange={set && ((v) => setD({ remision: v }))} filas={1} />
        </div>
      </Recuadro>
      <Recuadro titulo="XII. Pronóstico">
        <div className="grid grid-cols-1 gap-2">
          <Texto etiqueta="Favorable" valor={p.favorable} onChange={set && ((v) => setP({ favorable: v }))} filas={1} />
          <Texto etiqueta="Desfavorable" valor={p.desfavorable} onChange={set && ((v) => setP({ desfavorable: v }))} filas={1} />
        </div>
      </Recuadro>
      <Recuadro
        titulo="XV. Plan de tratamiento"
        extra={
          set && (
            <button
              type="button"
              onClick={() => set({ planTratamiento: [...plan, { tratamiento: "", valorUnitario: 0, cantidad: 1 }] })}
              className="rounded-md border border-cyan-600 px-2 py-0.5 text-xs font-semibold text-cyan-700 hover:bg-cyan-50"
            >
              + Agregar
            </button>
          )
        }
      >
        {plan.length === 0 ? (
          <p className="text-xs text-slate-400">Sin tratamientos registrados.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-1 font-semibold">Tratamiento</th>
                <th className="py-1 font-semibold w-28">Valor unitario</th>
                <th className="py-1 font-semibold w-16">Cant.</th>
                <th className="py-1 font-semibold w-24 text-right">Valor total</th>
                {set && <th className="w-6" />}
              </tr>
            </thead>
            <tbody>
              {plan.map((r, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="py-1 pr-2">
                    <input value={r.tratamiento} disabled={!set} onChange={(e) => setPlan(i, { tratamiento: e.target.value })} className={claseInput} />
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      type="number"
                      min={0}
                      value={r.valorUnitario}
                      disabled={!set}
                      onChange={(e) => setPlan(i, { valorUnitario: Number(e.target.value) || 0 })}
                      className={claseInput}
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      type="number"
                      min={1}
                      value={r.cantidad}
                      disabled={!set}
                      onChange={(e) => setPlan(i, { cantidad: Number(e.target.value) || 1 })}
                      className={claseInput}
                    />
                  </td>
                  <td className="py-1 text-right font-medium text-slate-700">{pesos(r.valorUnitario * r.cantidad)}</td>
                  {set && (
                    <td className="py-1 text-right">
                      <button type="button" onClick={() => set({ planTratamiento: plan.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-600" title="Quitar">
                        ✕
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              <tr className="border-t border-slate-300">
                <td colSpan={3} className="py-1 text-right font-semibold text-slate-600">
                  Total
                </td>
                <td className="py-1 text-right font-bold text-slate-800">{pesos(total)}</td>
                {set && <td />}
              </tr>
            </tbody>
          </table>
        )}
      </Recuadro>
    </div>
  );
}

export function SeccionEvolucion({ h, set }: PropsSeccion) {
  const ev = h.evolucion;
  const setEv = (i: number, c: Partial<(typeof ev)[number]>) => set?.({ evolucion: ev.map((r, j) => (j === i ? { ...r, ...c } : r)) });
  return (
    <Recuadro
      titulo="XVI. Evolución del tratamiento"
      extra={
        set && (
          <button
            type="button"
            onClick={() =>
              set({
                evolucion: [...ev, { fecha: new Date().toISOString().slice(0, 10), horaEntrada: "", horaSalida: "", descripcion: "" }],
              })
            }
            className="rounded-md border border-cyan-600 px-2 py-0.5 text-xs font-semibold text-cyan-700 hover:bg-cyan-50"
          >
            + Agregar
          </button>
        )
      }
    >
      <p className="text-xs text-slate-500 mb-2">Describe detalladamente el procedimiento, sin siglas ni abreviaturas.</p>
      {ev.length === 0 ? (
        <p className="text-xs text-slate-400">Sin evoluciones registradas.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {ev.map((r, i) => (
            <div key={i} className="rounded-lg border border-slate-200 p-2 flex flex-col gap-2">
              <div className="grid grid-cols-3 gap-2">
                <input type="date" value={r.fecha} disabled={!set} onChange={(e) => setEv(i, { fecha: e.target.value })} className={claseInput} />
                <input type="time" value={r.horaEntrada} disabled={!set} onChange={(e) => setEv(i, { horaEntrada: e.target.value })} className={claseInput} title="Hora de entrada" />
                <input type="time" value={r.horaSalida} disabled={!set} onChange={(e) => setEv(i, { horaSalida: e.target.value })} className={claseInput} title="Hora de salida" />
              </div>
              <textarea rows={2} value={r.descripcion} disabled={!set} onChange={(e) => setEv(i, { descripcion: e.target.value })} className={claseInput} placeholder="Evolución" />
              {set && (
                <button type="button" onClick={() => set({ evolucion: ev.filter((_, j) => j !== i) })} className="self-end text-xs text-slate-400 hover:text-red-600">
                  Quitar
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </Recuadro>
  );
}
