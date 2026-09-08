"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSnapshotTurnero } from "@/components/turnero/useSnapshotTurnero";

type Plantilla = {
  id: string;
  nombre: string;
  numeroEspacios: number;
  reglaPrioridad: "ESTRICTA" | "INTERCALADA";
  activo: boolean;
  sesionActiva: string | null;
};

export default function TurneroControlPage() {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    const res = await fetch("/api/turnero/plantillas");
    const data = await res.json();
    setPlantillas(data.plantillas ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const sesionId = plantillas.find((p) => p.sesionActiva)?.sesionActiva ?? null;

  async function abrirSesion(turneroId: string) {
    await fetch("/api/turnero/sesiones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ turneroId }),
    });
    cargar();
  }

  if (cargando) return <p className="text-slate-500 text-sm">Cargando...</p>;

  if (sesionId) return <ControlSesion sesionId={sesionId} onCerrada={cargar} />;

  return (
    <div className="mx-auto max-w-2xl">
      <Encabezado />
      {plantillas.filter((p) => p.activo).length === 0 ? (
        <p className="text-sm text-slate-500">
          No hay turneros configurados.{" "}
          <Link href="/admin/turnero/plantillas" className="text-blue-700 hover:underline">
            Crear uno
          </Link>
          .
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {plantillas
            .filter((p) => p.activo)
            .map((p) => (
              <div
                key={p.id}
                className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">{p.nombre}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {p.numeroEspacios} espacios · prioridad {p.reglaPrioridad.toLowerCase()}
                  </p>
                </div>
                <button
                  onClick={() => abrirSesion(p.id)}
                  className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900"
                >
                  Abrir turnero
                </button>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function Encabezado() {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="font-heading text-2xl font-bold text-blue-900">Turnero</h1>
      <Link href="/admin/turnero/plantillas" className="text-sm text-slate-500 hover:text-blue-800">
        Configuración
      </Link>
    </div>
  );
}

function ControlSesion({ sesionId, onCerrada }: { sesionId: string; onCerrada: () => void }) {
  const { snapshot, conectado, finalizada } = useSnapshotTurnero(sesionId);

  useEffect(() => {
    if (finalizada) onCerrada();
  }, [finalizada, onCerrada]);

  async function api(url: string, body: unknown, method = "POST") {
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  if (!snapshot) return <p className="text-slate-500 text-sm">Conectando al turnero...</p>;

  const { sesion, espacios, enEspera, contadores } = snapshot;
  const colaVacia = enEspera.length === 0;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-heading text-2xl font-bold text-blue-900">{sesion.turnero.nombre}</h1>
        <span className={`text-xs ${conectado ? "text-green-600" : "text-amber-600"}`}>
          {conectado ? "● en vivo" : "○ reconectando"}
        </span>
      </div>
      <div className="flex items-center gap-4 mb-6 text-sm">
        <a href="/admin/turnero/registro" target="_blank" className="text-blue-700 hover:underline">
          Abrir pantalla de registro ↗
        </a>
        <a href="/admin/turnero/tablero" target="_blank" className="text-blue-700 hover:underline">
          Abrir tablero ↗
        </a>
        <button
          onClick={() => api(`/api/turnero/sesiones/${sesionId}`, { cerrar: true }, "PATCH")}
          className="ml-auto text-slate-500 hover:text-red-600"
        >
          Cerrar turnero
        </button>
      </div>

      <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm mb-5 flex items-center gap-6 text-sm">
        <span className="text-slate-500">
          En espera <b className="text-slate-800">{contadores.enEspera}</b>
        </span>
        <span className="text-slate-500">
          Atendidos <b className="text-slate-800">{contadores.atendidos}</b>
        </span>
        <span className="text-slate-500">
          No se presentó <b className="text-slate-800">{contadores.noShow}</b>
        </span>
        <span className="ml-auto flex items-center gap-2 text-slate-500">
          Espacios
          <button
            onClick={() =>
              api(`/api/turnero/sesiones/${sesionId}`, { numeroEspacios: sesion.numeroEspacios - 1 }, "PATCH")
            }
            disabled={sesion.numeroEspacios <= 1}
            className="h-6 w-6 rounded border border-slate-300 disabled:opacity-30"
          >
            −
          </button>
          <b className="text-slate-800">{sesion.numeroEspacios}</b>
          <button
            onClick={() =>
              api(`/api/turnero/sesiones/${sesionId}`, { numeroEspacios: sesion.numeroEspacios + 1 }, "PATCH")
            }
            disabled={sesion.numeroEspacios >= 20}
            className="h-6 w-6 rounded border border-slate-300 disabled:opacity-30"
          >
            +
          </button>
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 mb-6">
        {espacios.map((e) => (
          <div key={e.numero} className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-heading font-semibold text-blue-900">
                {e.nombre ?? `Espacio ${e.numero}`}
              </span>
              <span className="text-[11px] uppercase tracking-wide text-slate-400">{e.estado}</span>
            </div>

            {e.ticket ? (
              <div>
                <p className="text-2xl font-bold text-blue-900">
                  {e.ticket.codigo}
                  {e.ticket.prioritario && (
                    <span className="ml-2 align-middle rounded bg-gold-100 px-1.5 py-0.5 text-[11px] font-semibold text-gold-700">
                      {e.ticket.categoriaNombre ?? "Prioritario"}
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500 mb-3">{e.ticket.servicioNombre}</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => api(`/api/turnero/tickets/${e.ticket!.id}`, { resultado: "ATENDIDO" }, "PATCH")}
                    className="rounded-lg bg-blue-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-900"
                  >
                    Atendido
                  </button>
                  <button
                    onClick={() =>
                      api(`/api/turnero/tickets/${e.ticket!.id}`, { resultado: "NO_SE_PRESENTO" }, "PATCH")
                    }
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    No se presentó
                  </button>
                  <button
                    onClick={() => api(`/api/turnero/tickets/${e.ticket!.id}`, { rellamar: true }, "PATCH")}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Rellamar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => api(`/api/turnero/sesiones/${sesionId}/llamar`, { espacio: e.numero })}
                disabled={colaVacia}
                className="w-full rounded-lg bg-blue-50 py-2 text-sm font-medium text-blue-800 hover:bg-blue-100 disabled:opacity-40"
              >
                Llamar siguiente
              </button>
            )}
          </div>
        ))}
      </div>

      <h2 className="text-sm font-heading font-semibold text-blue-900 mb-2">En espera ({enEspera.length})</h2>
      <div className="flex flex-col gap-1.5">
        {enEspera.map((t) => (
          <div
            key={t.id}
            className="rounded-lg bg-white border border-slate-200 px-3 py-2 text-sm flex items-center gap-3"
          >
            <span className="font-bold text-blue-900 w-14">{t.codigo}</span>
            <span className="text-slate-500 flex-1">{t.servicioNombre}</span>
            {t.prioritario && (
              <span className="rounded bg-gold-100 px-1.5 py-0.5 text-[11px] font-semibold text-gold-700">
                {t.categoriaNombre ?? "Prioritario"}
              </span>
            )}
          </div>
        ))}
        {colaVacia && <p className="text-xs text-slate-400">La cola está vacía.</p>}
      </div>
    </div>
  );
}
