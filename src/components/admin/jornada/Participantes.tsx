"use client";

import { useState } from "react";
import type { Participante } from "./tipos";

/**
 * Quiénes participan en la jornada. Los estudiantes del grupo entran solos al crearla; aquí
 * se suman invitados (solo con el nombre) en cualquier momento, incluso con la jornada en
 * curso.
 */
export default function Participantes({
  simulacionId,
  participantes,
  onCambio,
  editable,
}: {
  simulacionId: string;
  participantes: Participante[];
  onCambio: () => void;
  editable: boolean;
}) {
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    setEnviando(true);
    setError(null);
    const res = await fetch(`/api/simulaciones/${simulacionId}/participantes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nombre.trim() }),
    });
    setEnviando(false);
    if (!res.ok) {
      setError((await res.json()).error ?? "No se pudo agregar");
      return;
    }
    setNombre("");
    onCambio();
  }

  return (
    <section className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
      <h2 className="text-sm font-heading font-semibold text-blue-900 mb-2">Participantes ({participantes.length})</h2>
      {participantes.length === 0 ? (
        <p className="text-xs text-slate-500 mb-3">Aún no hay participantes. Agrega a quienes van a atender.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {participantes.map((p) => (
            <span key={p.id} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
              {p.nombre}
              {p.invitado && <span className="ml-1 text-[10px] uppercase tracking-wide text-amber-700">invitado</span>}
            </span>
          ))}
        </div>
      )}
      {editable && (
        <form onSubmit={agregar} className="flex flex-wrap gap-2">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre de un invitado"
            aria-label="Nombre del invitado"
            className="flex-1 min-w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={enviando || !nombre.trim()}
            className="rounded-lg border border-blue-700 px-3 py-2 text-sm font-medium text-blue-800 hover:bg-blue-50 disabled:opacity-40"
          >
            Agregar invitado
          </button>
          {error && <p className="basis-full text-xs text-red-600">{error}</p>}
        </form>
      )}
    </section>
  );
}
