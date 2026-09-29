"use client";

import { useMemo } from "react";
import type { ComparacionOdontograma } from "@/lib/modulos/odontologia/calificacion";
import { describirMarca } from "@/lib/modulos/odontologia/calificacion";
import type { Denticion, Marca } from "@/lib/modulos/odontologia/odontograma";
import type { MarcaPlaca } from "@/lib/modulos/odontologia/historia";
import { REMISIONES } from "@/lib/modulos/odontologia/historia";
import Odontograma from "./Odontograma";

export type RevisionOdontologia = {
  puntajes: Record<string, number | null>;
  pesos: Record<string, number>;
  denticion: Denticion;
  odontogramaEsperado: Marca[];
  odontogramaObtenido: Marca[];
  comparacion: ComparacionOdontograma;
  placaEsperada: MarcaPlaca[];
  remisionEsperada: string;
  remisionObtenida: string | null;
};

const NOMBRES_COMPONENTE: Record<string, string> = {
  proceso: "Proceso (interrogar, examinar, ayudas)",
  odontograma: "Odontograma",
  alertaMedica: "Alerta médica",
  antecedentes: "Antecedentes",
  examenes: "Exámenes estomatológico y dental",
  placa: "Índice de placa",
  remision: "Remisión",
};

const etiquetaRemision = (c: string | null) => REMISIONES.find((r) => r.codigo === c)?.etiqueta ?? "—";

/** Comparación odontograma del estudiante vs. el correcto, con el desglose de la nota. */
export default function RevisionOdontograma({ revision }: { revision: RevisionOdontologia }) {
  const { comparacion: c } = revision;
  const estados = useMemo(() => {
    const m = new Map<number, "ok" | "parcial" | "error">();
    for (const a of c.aciertos) m.set(a.diente, "ok");
    for (const p of c.parciales) m.set(p.esperada.diente, m.get(p.esperada.diente) === "error" ? "error" : "parcial");
    for (const x of [...c.faltantes, ...c.sobrantes]) m.set(x.diente, "error");
    return m;
  }, [c]);

  return (
    <div className="flex flex-col gap-4 text-left">
      <div className="rounded-xl border border-slate-200 p-4">
        <h3 className="text-sm font-heading font-semibold text-cyan-900 mb-2">Desglose de la nota</h3>
        <ul className="flex flex-col gap-1.5">
          {Object.entries(revision.pesos).map(([clave, peso]) => {
            const valor = revision.puntajes[clave];
            return (
              <li key={clave} className="text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>
                    {NOMBRES_COMPONENTE[clave] ?? clave} <span className="text-slate-400">({peso}%)</span>
                  </span>
                  <span className="font-semibold">{valor === null || valor === undefined ? "No aplica" : `${valor}/100`}</span>
                </div>
                {valor !== null && valor !== undefined && (
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mt-0.5">
                    <div
                      className={`h-full rounded-full ${valor >= 80 ? "bg-cyan-600" : valor >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${valor}%` }}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-slate-600 mt-3">
          Remisión elegida: <span className="font-semibold">{etiquetaRemision(revision.remisionObtenida)}</span>
          {revision.remisionObtenida !== revision.remisionEsperada && (
            <>
              {" "}
              · correcta: <span className="font-semibold text-cyan-700">{etiquetaRemision(revision.remisionEsperada)}</span>
            </>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-heading font-semibold text-cyan-900 mb-1">Tu odontograma</h3>
          <p className="text-[11px] text-slate-500 mb-2">
            Número en <span className="text-green-700 font-semibold">verde</span>: diente bien;{" "}
            <span className="text-amber-700 font-semibold">ámbar</span>: cara equivocada; <span className="text-red-600 font-semibold">rojo</span>: le falta o le sobra algo.
          </p>
          <Odontograma denticion={revision.denticion} marcas={revision.odontogramaObtenido} estados={estados} mostrarResumen={false} />
        </div>
        <div className="rounded-xl border border-cyan-200 bg-cyan-50/40 p-4">
          <h3 className="text-sm font-heading font-semibold text-cyan-900 mb-2">Odontograma correcto</h3>
          <Odontograma denticion={revision.denticion} marcas={revision.odontogramaEsperado} mostrarResumen={false} />
        </div>
      </div>

      {(c.faltantes.length > 0 || c.sobrantes.length > 0 || c.parciales.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <ListaMarcas titulo="Te faltó marcar" color="text-red-700" items={c.faltantes.map(describirMarca)} />
          <ListaMarcas titulo="Marcaste de más" color="text-red-700" items={c.sobrantes.map(describirMarca)} />
          <ListaMarcas
            titulo="Cara equivocada"
            color="text-amber-700"
            items={c.parciales.map((p) => `${describirMarca(p.esperada)} → marcaste ${describirMarca(p.obtenida)}`)}
          />
        </div>
      )}
    </div>
  );
}

function ListaMarcas({ titulo, color, items }: { titulo: string; color: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className={`font-semibold mb-1 ${color}`}>{titulo}</p>
      <ul className="flex flex-col gap-0.5 text-slate-700">
        {items.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  );
}
