"use client";

import { useCallback, useEffect, useState } from "react";
import PuestosTemporales from "@/components/admin/PuestosTemporales";
import Ventanillas from "./Ventanillas";
import { hora, type AtencionReporte, type Participante } from "./tipos";

/**
 * Jornada de Odontología en curso: quién está en cada unidad, qué historias se están
 * escribiendo (se actualiza sola) y las cuentas de los computadores de las unidades.
 * Pensado para manejarlo desde el celular mientras se recorre la sala.
 */
export default function ControlOdontologia({
  simulacionId,
  sesionTurneroId,
  unidades,
  participantes,
  ventanillas,
  onVentanillas,
}: {
  simulacionId: string;
  sesionTurneroId: string | null;
  unidades: number;
  participantes: Participante[];
  ventanillas: Record<number, string | null>;
  onVentanillas: (v: Record<number, string | null>) => void;
}) {
  const [atenciones, setAtenciones] = useState<(AtencionReporte & { cerrada: boolean })[]>([]);

  const cargar = useCallback(async () => {
    const res = await fetch(`/api/simulaciones/${simulacionId}/reporte`);
    if (res.ok) setAtenciones((await res.json()).atenciones);
  }, [simulacionId]);

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 5000);
    return () => clearInterval(t);
  }, [cargar]);

  const nombre = (id: string | null) => participantes.find((p) => p.id === id)?.nombre ?? "Nadie asignado";
  const abiertas = atenciones.filter((a) => !a.cerrada);
  const cerradas = atenciones.filter((a) => a.cerrada);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <a href="/panel/odontologia" target="_blank" className="text-blue-700 hover:underline">
          Abrir el consultorio (vista del estudiante) ↗
        </a>
        <span className="text-xs text-slate-500">
          {abiertas.length} historia(s) en curso · {cerradas.length} cerrada(s)
        </span>
      </div>

      <Ventanillas
        simulacionId={simulacionId}
        espacios={Array.from({ length: unidades }, (_, i) => ({
          numero: i + 1,
          nombre: `Unidad ${i + 1}`,
          ticketCodigo: abiertas.find((a) => a.espacioNumero === i + 1)?.pacienteNombre ?? null,
        }))}
        participantes={participantes}
        actuales={ventanillas}
        onCambio={onVentanillas}
        etiqueta="Unidad"
      />

      <section className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
        <h2 className="text-sm font-heading font-semibold text-blue-900 mb-2">Historias de la jornada</h2>
        {atenciones.length === 0 ? (
          <p className="text-xs text-slate-500">Todavía nadie ha abierto una historia. Se ven aquí apenas un estudiante busca a su paciente.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-slate-100">
            {atenciones.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span>
                  <b className="text-slate-800">{a.pacienteNombre}</b>
                  <span className="text-slate-500"> · Unidad {a.espacioNumero} · {nombre(a.participante?.id ?? null)}</span>
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${a.cerrada ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>
                  {a.cerrada ? "Cerrada" : `Escribiendo desde ${hora(a.llamadoEn)}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {sesionTurneroId && (
        <PuestosTemporales
          sesionTurneroId={sesionTurneroId}
          titulo="Agregar más computadores"
          descripcion="Las cuentas de las unidades ya se crearon al iniciar. Usa esto solo si necesitas otro computador; se borran al cerrar la jornada."
          colapsable
          modoInicial="generico"
          prefijoInicial="Unidad"
          rutaInicial="/panel/odontologia"
          onCreados={() => {}}
        />
      )}
    </div>
  );
}
