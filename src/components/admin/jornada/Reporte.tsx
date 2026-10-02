"use client";

import { useEffect, useState } from "react";
import { definicionSituacion } from "@/lib/simulacion/situaciones";
import { ETIQUETA_ERROR, type ClaveCriterio } from "@/lib/simulacion/evaluacion";
import { hora, type Reporte as ReporteDatos } from "./tipos";
import RevisionOdontograma, { type RevisionOdontologia } from "@/components/modulos/odontologia/RevisionOdontograma";
import Odontograma from "@/components/modulos/odontologia/Odontograma";
import { nombreDiente } from "@/lib/modulos/odontologia/odontograma";

const colorPuntaje = (p: number | null) =>
  p === null ? "text-slate-400" : p >= 80 ? "text-emerald-700" : p >= 50 ? "text-amber-700" : "text-red-600";

function csv(filas: (string | number | null)[][]) {
  return filas.map((f) => f.map((c) => `"${String(c ?? "").replaceAll('"', '""')}"`).join(";")).join("\n");
}

function descargar(nombre: string, contenido: string) {
  const blob = new Blob(["﻿" + contenido], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Reporte de una jornada calificada. "Repaso en clase" muestra caso por caso qué traía el
 * paciente, qué se hizo y por qué estuvo bien o mal; sin nombres por defecto, para
 * proyectarlo. "Notas" es para el docente.
 */
export default function Reporte({ simulacionId }: { simulacionId: string }) {
  const [datos, setDatos] = useState<ReporteDatos | null>(null);
  const [vista, setVista] = useState<"repaso" | "notas">("repaso");
  const [conNombres, setConNombres] = useState(false);
  const [odontogramaAbierto, setOdontogramaAbierto] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/simulaciones/${simulacionId}/reporte`)
      .then((r) => r.json())
      .then(setDatos);
  }, [simulacionId]);

  if (!datos) return <p className="text-sm text-slate-500">Cargando reporte...</p>;

  const calificadas = datos.atenciones.filter((a) => a.puntaje !== null);
  const promedio = calificadas.length
    ? Math.round(calificadas.reduce((s, a) => s + (a.puntaje ?? 0), 0) / calificadas.length)
    : null;
  const sinVerificacion = datos.simulacion.tipo === "FARMACIA";
  const esOdonto = datos.simulacion.tipo === "ODONTOLOGIA";
  const dictado = datos.dictado ?? null;

  function exportar() {
    if (!datos) return;
    const filas: (string | number | null)[][] = [["Turno", "Ventanilla", "Paciente", "Situaciones", "Atendió", "Puntaje", "Criterios fallidos"]];
    for (const a of datos.atenciones) {
      filas.push([
        a.ticketCodigo,
        a.espacioNumero,
        a.pacienteNombre,
        a.situaciones.map((c) => definicionSituacion(c)?.nombre ?? c).join(", "),
        a.participante?.nombre ?? "",
        a.puntaje,
        a.criterios
          .filter((c) => !c.cumplido)
          .map((c) => `${c.descripcion} (${c.detalle ?? ""})`)
          .join(" | "),
      ]);
    }
    filas.push([]);
    filas.push(["Estudiante", "Atenciones", "Promedio"]);
    for (const e of datos.porEstudiante) filas.push([e.nombre + (e.invitado ? " (invitado)" : ""), e.atenciones, e.promedio]);
    descargar(`jornada-${datos.simulacion.nombre.replace(/\W+/g, "-").toLowerCase()}.csv`, csv(filas));
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          ["Atenciones", String(datos.atenciones.length)],
          ["Promedio del grupo", promedio === null ? "—" : `${promedio}%`],
          ["Participantes", String(datos.porEstudiante.length)],
          dictado
            ? ["Dientes del caso", String(dictado.mapa.length)]
            : esOdonto
            ? ["Historias cerradas", String(datos.atenciones.filter((a) => a.cerrada).length)]
            : ["Situaciones", datos.simulacion.situaciones.length ? String(datos.simulacion.situaciones.length) : "Al azar"],
        ].map(([k, v]) => (
          <div key={k} className="tarjeta-sm p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">{k}</p>
            <p className="font-heading text-xl font-bold text-blue-900">{v}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(["repaso", "notas"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setVista(v)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${vista === v ? "bg-blue-800 text-white" : "bg-white border border-slate-200 text-slate-600"}`}
          >
            {v === "repaso" ? "Repaso en clase" : "Notas por estudiante"}
          </button>
        ))}
        {vista === "repaso" && (
          <label className="ml-auto flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={conNombres} onChange={(e) => setConNombres(e.target.checked)} />
            {dictado ? "Mostrar nombres" : "Mostrar quién atendió"}
          </label>
        )}
        <button onClick={exportar} className={`${vista === "notas" ? "ml-auto" : ""} text-sm text-blue-700 hover:underline`}>
          Descargar (Excel/CSV)
        </button>
      </div>

      {sinVerificacion && (
        <p className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900">
          Jornada de mostrador: se califica lo que se vendió a cada paciente. No venderle un medicamento cuenta como rechazarlo.
        </p>
      )}

      {vista === "repaso" ? (
        <>
          {dictado && <MapaDictado dictado={dictado} />}

          {datos.erroresComunes.length > 0 && (
            <div className="tarjeta-sm p-4">
              <h3 className="text-sm font-heading font-semibold text-blue-900">Errores más comunes</h3>
              <p className="text-xs text-slate-500 mb-2">En cuántos casos apareció cada uno.</p>
              <ul className="flex flex-col gap-1 text-sm">
                {datos.erroresComunes.map((e) => (
                  <li key={e.clave} className="flex justify-between gap-3">
                    <span className="text-slate-700">{ETIQUETA_ERROR[e.clave as ClaveCriterio] ?? e.clave}</span>
                    <span className="font-semibold text-red-600 tabular-nums">{e.veces}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {datos.atenciones.map((a, i) => (
              <article key={a.id} className="tarjeta-sm p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-heading font-semibold text-blue-900">
                      {dictado ? (conNombres ? a.participante?.nombre ?? `Estudiante ${i + 1}` : `Estudiante ${i + 1}`) : `Caso ${i + 1}`}
                      {a.ticketCodigo && <span className="ml-2 text-sm font-medium text-slate-500">{a.ticketCodigo}</span>}
                    </h3>
                    {!dictado && (
                    <p className="text-xs text-slate-500">
                      {a.pacienteNombre} · {a.espacioNumero ? `${esOdonto ? "unidad" : "ventanilla"} ${a.espacioNumero}` : "sin turno"} ·{" "}
                      {hora(a.llamadoEn)}
                      {esOdonto && !a.cerrada && " · no cerró la historia"}
                      {conNombres && <> · atendió <b className="text-slate-700">{a.participante?.nombre ?? "sin confirmar"}</b></>}
                    </p>
                    )}
                  </div>
                  {a.puntaje !== null && <p className={`font-heading text-2xl font-bold ${colorPuntaje(a.puntaje)}`}>{a.puntaje}%</p>}
                </div>

                {esOdonto ? null : a.situaciones.length === 0 ? (
                  <p className="mt-2 text-xs text-slate-500">Caso normal: sin ninguna situación especial.</p>
                ) : (
                  <ul className="mt-2 flex flex-col gap-1">
                    {a.situaciones.map((c) => {
                      const def = definicionSituacion(c);
                      return (
                        <li key={c} className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-900">
                          <b>{def?.nombre ?? c}.</b> {def?.queHacer}
                        </li>
                      );
                    })}
                  </ul>
                )}

                {esOdonto && Boolean(a.detalle?.revisionOdontologia) && (
                  <div className="mt-3">
                    <button
                      onClick={() => setOdontogramaAbierto(odontogramaAbierto === a.id ? null : a.id)}
                      className="rounded-lg border border-cyan-600 px-3 py-1.5 text-xs font-semibold text-cyan-800 hover:bg-cyan-50"
                    >
                      {odontogramaAbierto === a.id ? "Ocultar odontograma" : "Ver odontograma: el del estudiante y el correcto"}
                    </button>
                    {odontogramaAbierto === a.id && (
                      <div className="mt-3">
                        <RevisionOdontograma revision={a.detalle!.revisionOdontologia as RevisionOdontologia} />
                      </div>
                    )}
                  </div>
                )}

                {a.comentario && (
                  <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    <b className="text-slate-800">Comentario del docente:</b> {a.comentario}
                  </p>
                )}

                {a.criterios.length > 0 && (
                  <ul className="mt-3 flex flex-col gap-1 text-sm">
                    {a.criterios.map((c, j) => (
                      <li key={j} className="flex gap-2">
                        <span className={c.cumplido ? "text-emerald-700" : "text-red-600"} aria-label={c.cumplido ? "Bien" : "Mal"}>
                          {c.cumplido ? "✓" : "✗"}
                        </span>
                        <span className="text-slate-700">
                          {c.descripcion}
                          {c.detalle && <span className="text-slate-500"> — {c.detalle}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
            {datos.atenciones.length === 0 && <p className="text-sm text-slate-500">No hubo atenciones en esta jornada.</p>}
          </div>
        </>
      ) : (
        <div className="tarjeta-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[420px]">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-2 font-medium">Estudiante</th>
                <th className="px-4 py-2 font-medium">Atenciones</th>
                <th className="px-4 py-2 font-medium">Promedio</th>
              </tr>
            </thead>
            <tbody>
              {datos.porEstudiante.map((e) => (
                <tr key={e.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 text-slate-800">
                    {e.nombre}
                    {e.invitado && <span className="ml-2 text-[10px] uppercase tracking-wide text-amber-700">invitado</span>}
                  </td>
                  <td className="px-4 py-2 tabular-nums">{e.atenciones}</td>
                  <td className={`px-4 py-2 font-semibold tabular-nums ${colorPuntaje(e.promedio)}`}>
                    {e.promedio === null ? "Sin atenciones" : `${e.promedio}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/**
 * Dictado: el odontograma del caso con cada diente coloreado según cuántos estudiantes lo
 * registraron exacto. Lo rojo es lo que hay que repasar en clase.
 */
function MapaDictado({ dictado }: { dictado: NonNullable<ReporteDatos["dictado"]> }) {
  const estados = new Map(
    dictado.mapa.map((c) => [c.diente, c.porcentaje >= 80 ? ("ok" as const) : c.porcentaje >= 50 ? ("parcial" as const) : ("error" as const)])
  );
  const total = dictado.mapa[0]?.total ?? 0;
  return (
    <div className="tarjeta-sm p-4">
      <h3 className="text-sm font-heading font-semibold text-blue-900">Mapa por diente</h3>
      <p className="text-xs text-slate-500 mb-3">
        El caso dictado. Número en <span className="font-semibold text-green-700">verde</span>: 80 % o más del grupo lo registró exacto;{" "}
        <span className="font-semibold text-amber-700">ámbar</span>: entre 50 y 79 %; <span className="font-semibold text-red-600">rojo</span>: menos de la
        mitad. {total} historia(s) calificada(s).
      </p>
      <Odontograma denticion={dictado.denticion} marcas={dictado.odontogramaEsperado} estados={estados} mostrarResumen={false} />
      <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
        {dictado.mapa.map((c) => (
          <li key={c.diente} className="flex items-center justify-between gap-3">
            <span className="text-slate-700">
              <b>{c.diente}</b> <span className="text-xs text-slate-500">{nombreDiente(c.diente)}</span>
            </span>
            <span className={`tabular-nums font-semibold ${colorPuntaje(c.porcentaje)}`}>
              {c.porcentaje}% <span className="text-xs font-normal text-slate-500">({c.bien}/{c.total})</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
