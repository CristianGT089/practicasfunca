"use client";

import { useContext, useState } from "react";
import { ContextoRecorrido, useProgresos } from "./progreso";

/**
 * Última diapositiva de la clase a tu ritmo: el estudiante ve qué hizo y qué le quedó pendiente
 * (con un botón para volver a cada cosa) y envía el reporte al profe.
 */
export default function Terminar({ titulo, proxima }: { titulo: string; proxima?: string }) {
  const ctx = useContext(ContextoRecorrido);
  const { progresos } = useProgresos();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(false);

  // Vista previa del docente o repaso: no hay recorrido que enviar.
  if (!ctx)
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <h2 className="font-heading text-4xl font-extrabold text-blue-900 sm:text-5xl">{titulo}</h2>
        {proxima && <p className="mt-6 text-2xl text-blue-700">{proxima}</p>}
      </div>
    );

  const { leccion, terminadoEn, terminar, ir } = ctx;
  const actividades = leccion.diapositivas.flatMap((d, i) => (d.tipo === "actividad" ? [{ id: d.id, titulo: d.titulo, i }] : []));
  const preguntas = leccion.diapositivas.flatMap((d, i) => (d.tipo === "pregunta" ? [{ id: d.id, i }] : []));
  const pendientes = actividades.filter((a) => !progresos[a.id]?.completado);
  const sinResponder = preguntas.filter((p) => !progresos[p.id]);
  const hechas = actividades.length - pendientes.length;

  async function enviar() {
    setEnviando(true);
    setError(false);
    const ok = await terminar();
    setEnviando(false);
    if (!ok) setError(true);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="text-center">
        <div className="text-6xl" aria-hidden>
          {terminadoEn ? "📨" : "🏁"}
        </div>
        <h2 className="mt-3 font-heading text-3xl font-extrabold tracking-tight text-blue-900 sm:text-5xl">{titulo}</h2>
        <p className="mt-3 text-lg text-slate-700">
          Completaste {hechas} de {actividades.length} actividades y respondiste {preguntas.length - sinResponder.length} de {preguntas.length} preguntas.
        </p>
      </div>

      {pendientes.length > 0 && (
        <div className="mt-6 rounded-3xl border-2 border-gold-500/50 bg-gold-50 p-4 sm:p-5">
          <p className="font-heading font-bold text-blue-900">Te quedó pendiente</p>
          <p className="text-sm text-slate-600">Puedes volver y terminarlo ahora, o enviar así: me llega marcado como pendiente.</p>
          <ul className="mt-3 flex flex-col gap-2">
            {pendientes.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white px-4 py-2.5 sm:gap-3">
                <span className="min-w-0 font-semibold text-blue-950">{a.titulo}</span>
                <button onClick={() => ir(a.i)} className="btn-suave shrink-0 !py-1.5 text-sm pointer-coarse:min-h-10">
                  Ir a la actividad
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {pendientes.length === 0 && (
        <p className="mt-6 rounded-3xl bg-emerald-50 px-5 py-4 text-center font-semibold text-emerald-800">🎉 Hiciste todas las actividades. ¡Muy bien!</p>
      )}

      <div className="mt-8 flex flex-col items-center gap-3 text-center">
        {terminadoEn ? (
          <>
            <p className="rounded-3xl bg-emerald-100 px-4 py-2 font-semibold text-emerald-800 sm:rounded-full">
              ✓ Le enviaste tu reporte al profe el{" "}
              {new Date(terminadoEn).toLocaleString("es-CO", { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" })}
            </p>
            {pendientes.length > 0 && (
              <button onClick={enviar} disabled={enviando} className="btn-secundario max-w-full whitespace-normal">
                {enviando ? "Enviando…" : "Ya completé lo pendiente: enviar de nuevo"}
              </button>
            )}
          </>
        ) : (
          <button onClick={enviar} disabled={enviando} className="btn-cta w-full !px-6 !py-3 text-lg sm:w-auto sm:!px-8">
            {enviando ? "Enviando…" : "Terminar y enviar al profe"}
          </button>
        )}
        {error && <p className="text-sm font-semibold text-rose-700">No se pudo enviar. Revisa tu conexión e inténtalo otra vez.</p>}
        {proxima && <p className="mt-4 text-xl text-blue-700">{proxima}</p>}
      </div>
    </div>
  );
}
