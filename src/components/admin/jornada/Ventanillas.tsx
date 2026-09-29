"use client";

import { useState } from "react";
import type { Participante } from "./tipos";

/**
 * Quién está sentado en cada ventanilla. El docente lo cambia al rotar (desde el celular);
 * cada turno que se llame desde ahí queda a nombre de esa persona. Si se olvida de
 * cambiarlo, lo corrige al finalizar en la vista de confirmación.
 */
export default function Ventanillas({
  simulacionId,
  espacios,
  participantes,
  actuales,
  onCambio,
  etiqueta = "Ventanilla",
}: {
  simulacionId: string;
  espacios: { numero: number; nombre: string | null; ticketCodigo: string | null }[];
  participantes: Participante[];
  actuales: Record<number, string | null>;
  onCambio: (ventanillas: Record<number, string | null>) => void;
  /** "Ventanilla" (farmacia) o "Unidad" (odontología). */
  etiqueta?: string;
}) {
  const [guardando, setGuardando] = useState<number | null>(null);

  async function asignar(espacioNumero: number, participanteId: string) {
    setGuardando(espacioNumero);
    const res = await fetch(`/api/simulaciones/${simulacionId}/ventanillas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ espacioNumero, participanteId: participanteId || null }),
    });
    setGuardando(null);
    if (res.ok) onCambio((await res.json()).ventanillas);
  }

  const ocupados = new Set(Object.values(actuales).filter(Boolean));

  return (
    <section className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
      <h2 className="text-sm font-heading font-semibold text-blue-900">¿Quién está en cada {etiqueta.toLowerCase()}?</h2>
      <p className="text-xs text-slate-500 mb-3">
        Cámbialo cada vez que rotes. Lo que se atienda desde ahí queda a nombre de esa persona.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {espacios.map((e) => {
          const actual = actuales[e.numero] ?? "";
          return (
            <label key={e.numero} className="flex flex-col gap-1 rounded-lg border border-slate-200 p-3">
              <span className="flex items-center justify-between text-sm font-medium text-slate-800">
                {e.nombre ?? `${etiqueta} ${e.numero}`}
                {e.ticketCodigo && <span className="text-xs font-semibold text-blue-800">Atendiendo {e.ticketCodigo}</span>}
              </span>
              <select
                value={actual}
                disabled={guardando === e.numero}
                onChange={(ev) => asignar(e.numero, ev.target.value)}
                className={`rounded-lg border px-3 py-2.5 text-sm ${actual ? "border-blue-300 bg-blue-50 text-blue-900" : "border-amber-300 bg-amber-50 text-amber-800"}`}
              >
                <option value="">Nadie asignado</option>
                {participantes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                    {ocupados.has(p.id) && p.id !== actual ? ` (en otra ${etiqueta.toLowerCase()})` : ""}
                  </option>
                ))}
              </select>
            </label>
          );
        })}
      </div>
    </section>
  );
}
