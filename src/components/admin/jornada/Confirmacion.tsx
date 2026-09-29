"use client";

import { useCallback, useEffect, useState } from "react";
import { definicionSituacion } from "@/lib/simulacion/situaciones";
import { hora, type AtencionReporte, type Participante } from "./tipos";

/**
 * Después de finalizar: "A este paciente lo atendió…". Viene precargado con quien estaba en
 * la ventanilla cuando se llamó el turno; el docente corrige lo que haga falta y califica.
 */
export default function Confirmacion({
  simulacionId,
  participantes,
  onCalificar,
}: {
  simulacionId: string;
  participantes: Participante[];
  onCalificar: () => Promise<void>;
}) {
  const [atenciones, setAtenciones] = useState<AtencionReporte[] | null>(null);
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

  return (
    <section className="flex flex-col gap-3">
      <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-900">
        <p className="font-semibold">Confirma quién atendió a cada paciente</p>
        <p className="text-xs mt-1">
          Viene con quien estaba en la ventanilla cuando se llamó el turno. Si se te olvidó rotar a alguien, corrígelo aquí. Al calificar se
          genera el reporte y se borran los pacientes de práctica.
        </p>
      </div>

      {atenciones.length === 0 ? (
        <p className="text-sm text-slate-500">No se atendió ningún paciente en esta jornada.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {atenciones.map((a) => (
            <div key={a.id} className="rounded-lg bg-white border border-slate-200 p-3 flex flex-col sm:flex-row sm:items-center gap-2">
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
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={calificar}
          disabled={calificando}
          className="rounded-lg bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-40"
        >
          {calificando ? "Calificando..." : "Calificar y generar reporte"}
        </button>
        {sinAsignar > 0 && (
          <p className="text-xs text-amber-700">
            {sinAsignar} atención(es) sin estudiante: se califican igual, pero no cuentan en la nota de nadie.
          </p>
        )}
      </div>
    </section>
  );
}
