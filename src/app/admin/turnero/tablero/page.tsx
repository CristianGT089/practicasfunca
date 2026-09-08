"use client";

import { useCallback, useEffect, useState } from "react";
import { useSnapshotTurnero } from "@/components/turnero/useSnapshotTurnero";

export default function TurneroTableroPage() {
  const [sesionId, setSesionId] = useState<string | null | undefined>(undefined);

  const buscarSesion = useCallback(async () => {
    const res = await fetch("/api/turnero/sesion-activa");
    const data = await res.json();
    setSesionId(data.sesionId ?? null);
  }, []);

  useEffect(() => {
    buscarSesion();
  }, [buscarSesion]);

  const { snapshot, conectado, finalizada } = useSnapshotTurnero(sesionId ?? null);

  useEffect(() => {
    if (finalizada) buscarSesion();
  }, [finalizada, buscarSesion]);

  if (!sesionId || !snapshot) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-slate-400 text-xl">
        {sesionId === undefined ? "Cargando..." : "Esperando a que se abra el turnero..."}
      </div>
    );
  }

  const { espacios, enEspera, llamados } = snapshot;
  const ultimoLlamado = llamados[0] ?? null;

  return (
    <div className="mx-auto max-w-6xl py-4">
      <div className="flex items-baseline justify-between mb-4">
        <h1 className="font-heading text-3xl font-extrabold text-blue-900">{snapshot.sesion.turnero.nombre}</h1>
        <span className={`text-sm ${conectado ? "text-green-600" : "text-amber-600"}`}>
          {conectado ? "● en vivo" : "○ reconectando"}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="grid gap-4 sm:grid-cols-2">
          {espacios.map((e) => {
            const activo = e.ticket && e.ticket.id === ultimoLlamado?.id;
            return (
              <div
                key={e.numero}
                className={`rounded-2xl border p-6 shadow-sm transition-all ${
                  e.ticket
                    ? activo
                      ? "border-gold-500 bg-gold-50 ring-4 ring-gold-200"
                      : "border-blue-200 bg-white"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <p className="text-sm font-heading font-semibold uppercase tracking-wide text-slate-400">
                  {e.nombre ?? `Espacio ${e.numero}`}
                </p>
                {e.ticket ? (
                  <>
                    <p className="font-heading text-6xl font-extrabold text-blue-900 mt-1">{e.ticket.codigo}</p>
                    <p className="text-base text-slate-500 mt-1">{e.ticket.servicioNombre}</p>
                    {e.ticket.prioritario && (
                      <span className="mt-2 inline-block rounded-full bg-gold-100 px-3 py-1 text-sm font-semibold text-gold-700">
                        {e.ticket.categoriaNombre ?? "Prioritario"}
                      </span>
                    )}
                  </>
                ) : (
                  <p className="font-heading text-3xl font-bold text-slate-300 mt-3">Libre</p>
                )}
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-heading text-lg font-bold text-blue-900 mb-3">En espera</h2>
          {enEspera.length === 0 && <p className="text-sm text-slate-400">Sin turnos en espera.</p>}
          <div className="flex flex-col gap-2">
            {enEspera.slice(0, 12).map((t) => (
              <div key={t.id} className="flex items-center gap-3">
                <span className="font-heading text-2xl font-bold text-blue-900 w-20">{t.codigo}</span>
                <span className="text-sm text-slate-500 flex-1 truncate">{t.servicioNombre}</span>
                {t.prioritario && (
                  <span className="rounded bg-gold-100 px-1.5 py-0.5 text-[11px] font-semibold text-gold-700">
                    Prior.
                  </span>
                )}
              </div>
            ))}
          </div>

          {llamados.length > 0 && (
            <>
              <h2 className="font-heading text-sm font-semibold text-slate-400 mt-5 mb-2">Últimos llamados</h2>
              <div className="flex flex-wrap gap-2">
                {llamados.slice(0, 6).map((t) => (
                  <span key={t.id + (t.llamadoEn ?? "")} className="rounded-lg bg-slate-100 px-2 py-1 text-sm text-slate-600">
                    {t.codigo}
                    {t.espacioNumero ? ` → ${t.espacioNumero}` : ""}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
