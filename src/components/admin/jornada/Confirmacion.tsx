"use client";

import { useCallback, useEffect, useState } from "react";
import { definicionSituacion } from "@/lib/simulacion/situaciones";
import { hora, type AtencionReporte, type Participante } from "./tipos";
import RevisionRubrica from "./RevisionRubrica";
import { normalizarRubrica, puntajeRubrica } from "@/lib/modulos/odontologia/rubrica";

/**
 * Después de finalizar: "A este paciente lo atendió…". Viene precargado con quien estaba en
 * la ventanilla cuando se llamó el turno; el docente corrige lo que haga falta y califica.
 */
export default function Confirmacion({
  simulacionId,
  participantes,
  onCalificar,
  conRubrica = false,
}: {
  simulacionId: string;
  participantes: Participante[];
  onCalificar: () => Promise<void>;
  /** Pacientes reales: el docente califica cada historia con la rúbrica antes de cerrar. */
  conRubrica?: boolean;
}) {
  const [atenciones, setAtenciones] = useState<AtencionReporte[] | null>(null);
  const [revisando, setRevisando] = useState<string | null>(null);
  const [notas, setNotas] = useState<Record<string, number | null>>({});
  const [calificando, setCalificando] = useState(false);

  const cargar = useCallback(async () => {
    const res = await fetch(`/api/simulaciones/${simulacionId}/reporte`);
    if (res.ok) setAtenciones((await res.json()).atenciones);
  }, [simulacionId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function cambiar(atencionId: string, participanteId: string) {
    setAtenciones((lista) =>
      (lista ?? []).map((a) =>
        a.id === atencionId
          ? { ...a, participante: participantes.find((p) => p.id === participanteId) ?? null }
          : a
      )
    );
    await fetch(`/api/simulaciones/${simulacionId}/atenciones/${atencionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participanteId: participanteId || null }),
    });
  }

  async function calificar() {
    setCalificando(true);
    await onCalificar();
    setCalificando(false);
  }

  if (!atenciones) return <p className="text-sm text-slate-500">Cargando atenciones...</p>;
  const sinAsignar = atenciones.filter((a) => !a.participante).length;
  const notaDe = (a: AtencionReporte) => (a.id in notas ? notas[a.id] : puntajeRubrica(normalizarRubrica(a.rubrica)));
  const sinCalificar = conRubrica ? atenciones.filter((a) => notaDe(a) === null).length : 0;

  return (
    <section className="flex flex-col gap-3">
      <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-900">
        <p className="font-semibold">Confirma quién atendió a cada paciente</p>
        <p className="text-xs mt-1">
          Viene con quien estaba en ese puesto en ese momento. Si se te olvidó rotar a alguien, corrígelo aquí.
          {conRubrica
            ? " Luego revisa y califica cada historia con la rúbrica. Al cerrar se borran las historias y los datos de los compañeros; queda la nota y tu comentario."
            : " Al calificar se genera el reporte y se borran los pacientes de práctica."}
        </p>
      </div>

      {atenciones.length === 0 ? (
        <p className="text-sm text-slate-500">No se atendió ningún paciente en esta jornada.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {atenciones.map((a) => (
            <div key={a.id} className="rounded-lg bg-white border border-slate-200 p-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">
                  {a.ticketCodigo && <span className="font-heading font-bold text-blue-900 mr-2">{a.ticketCodigo}</span>}
                  {a.pacienteNombre}
                </p>
                <p className="text-xs text-slate-500">
                  {a.espacioNumero ? `Puesto ${a.espacioNumero}` : "Sin turno"} · {hora(a.llamadoEn)}
                  {a.cerrada === false && " · historia sin cerrar"}
                  {a.situaciones.length > 0 && ` · ${a.situaciones.map((c) => definicionSituacion(c)?.nombre ?? c).join(", ")}`}
                </p>
              </div>
              <select
                value={a.participante?.id ?? ""}
                onChange={(e) => cambiar(a.id, e.target.value)}
                aria-label={`Quién atendió a ${a.pacienteNombre}`}
                className={`rounded-lg border px-3 py-2.5 text-sm sm:w-64 ${a.participante ? "border-slate-300" : "border-amber-400 bg-amber-50"}`}
              >
                <option value="">¿Quién lo atendió?</option>
                {participantes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
              </div>
              {conRubrica && (
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setRevisando(revisando === a.id ? null : a.id)}
                    className="rounded-lg border border-blue-700 px-3 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-50"
                  >
                    {revisando === a.id ? "Cerrar revisión" : "Revisar y calificar"}
                  </button>
                  <span className={`text-xs font-semibold ${notaDe(a) === null ? "text-amber-700" : "text-emerald-700"}`}>
                    {notaDe(a) === null ? "Sin calificar" : `Nota: ${notaDe(a)}%`}
                  </span>
                </div>
              )}
              {conRubrica && revisando === a.id && (
                <RevisionRubrica
                  simulacionId={simulacionId}
                  atencionId={a.id}
                  onGuardado={(nota) => setNotas((n) => ({ ...n, [a.id]: nota }))}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={calificar}
          disabled={calificando}
          className="rounded-full font-heading bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-40"
        >
          {calificando ? "Calificando..." : "Calificar y generar reporte"}
        </button>
        {sinCalificar > 0 && (
          <p className="text-xs text-amber-700">{sinCalificar} historia(s) sin calificar: quedarán sin nota.</p>
        )}
        {sinAsignar > 0 && (
          <p className="text-xs text-amber-700">
            {sinAsignar} atención(es) sin estudiante: se califican igual, pero no cuentan en la nota de nadie.
          </p>
        )}
      </div>
    </section>
  );
}
