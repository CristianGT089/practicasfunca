"use client";

import { useCallback, useEffect, useState } from "react";
import { useSnapshotTurnero } from "./useSnapshotTurnero";

const CLAVE_LOCAL = "turnero-mi-espacio";

/**
 * Widget compacto para un puesto que opera su propio espacio del turnero desde OTRA
 * pantalla (ej. el computador de dispensación): "terminé con esta persona, dame la
 * siguiente" en un clic, sin depender de que alguien lo haga desde Control.
 *
 * Se elige una sola vez qué espacio es "este computador" (queda en localStorage, porque
 * es una propiedad del puesto físico, no de quién esté logueado). Si no hay ningún
 * turnero abierto ese día, el widget no se muestra — no estorba cuando no se usa.
 */
export default function PanelMiEspacio() {
  const [sesionId, setSesionId] = useState<string | null | undefined>(undefined);
  const [miEspacio, setMiEspacio] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const guardado = Number(localStorage.getItem(CLAVE_LOCAL));
    if (guardado > 0) setMiEspacio(guardado);
  }, []);

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

  function elegirEspacio(numero: number) {
    localStorage.setItem(CLAVE_LOCAL, String(numero));
    setMiEspacio(numero);
  }

  async function accion(resultado: "ATENDIDO" | "NO_SE_PRESENTO" | null) {
    if (!sesionId || miEspacio == null || enviando) return;
    setEnviando(true);
    await fetch(`/api/turnero/sesiones/${sesionId}/mi-espacio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ espacio: miEspacio, resultado }),
    });
    setEnviando(false);
  }

  if (!sesionId || !snapshot) return null; // sin turnero abierto hoy: no mostrar nada

  const espacio = snapshot.espacios.find((e) => e.numero === miEspacio);

  if (miEspacio == null || !espacio) {
    return (
      <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm mb-5">
        <p className="text-sm font-heading font-semibold text-blue-900 mb-1">
          Turnero: {snapshot.sesion.turnero.nombre}
        </p>
        <p className="text-xs text-slate-500 mb-3">¿Cuál espacio del turnero es este computador?</p>
        <div className="flex flex-wrap gap-2">
          {snapshot.espacios.map((e) => (
            <button
              key={e.numero}
              onClick={() => elegirEspacio(e.numero)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:border-blue-500 hover:text-blue-800"
            >
              {e.nombre ?? `Espacio ${e.numero}`}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm mb-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-heading font-semibold text-blue-900">
          Turnero — {espacio.nombre ?? `Espacio ${espacio.numero}`}
        </p>
        <div className="flex items-center gap-3">
          <span className={`text-xs ${conectado ? "text-green-600" : "text-amber-600"}`}>
            {conectado ? "● en vivo" : "○ reconectando"}
          </span>
          <button onClick={() => setMiEspacio(null)} className="text-xs text-slate-400 hover:text-slate-600">
            cambiar
          </button>
        </div>
      </div>

      {espacio.ticket ? (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <span className="font-heading text-2xl font-bold text-blue-900">{espacio.ticket.codigo}</span>
            <span className="ml-2 text-sm text-slate-500">{espacio.ticket.servicioNombre}</span>
            {espacio.ticket.prioritario && (
              <span className="ml-2 rounded bg-gold-100 px-1.5 py-0.5 text-[11px] font-semibold text-gold-700">
                {espacio.ticket.categoriaNombre ?? "Prioritario"}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => accion("ATENDIDO")}
              disabled={enviando}
              className="rounded-lg bg-blue-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-900 disabled:opacity-40"
            >
              Terminé — siguiente
            </button>
            <button
              onClick={() => accion("NO_SE_PRESENTO")}
              disabled={enviando}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              No se presentó
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-400">Sin turno asignado.</p>
          <button
            onClick={() => accion(null)}
            disabled={enviando || snapshot.enEspera.length === 0}
            className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-800 hover:bg-blue-100 disabled:opacity-40"
          >
            Llamar siguiente
          </button>
        </div>
      )}
    </div>
  );
}
