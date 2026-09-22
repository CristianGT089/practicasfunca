"use client";

import { useCallback, useEffect, useState } from "react";
import { useSnapshotTurnero } from "@/components/turnero/useSnapshotTurnero";

export default function TurneroRegistroPage() {
  const [sesionId, setSesionId] = useState<string | null | undefined>(undefined);

  const buscarSesion = useCallback(async () => {
    const res = await fetch("/api/turnero/sesion-activa");
    const data = await res.json();
    setSesionId(data.sesionId ?? null);
  }, []);

  useEffect(() => {
    buscarSesion();
  }, [buscarSesion]);

  const { snapshot, finalizada } = useSnapshotTurnero(sesionId ?? null);

  useEffect(() => {
    if (finalizada) buscarSesion();
  }, [finalizada, buscarSesion]);

  if (sesionId === undefined) return <Centro>Cargando...</Centro>;
  if (!sesionId || !snapshot)
    return <Centro>No hay un turnero abierto. Pídele al administrador que lo abra desde Control.</Centro>;

  return <Kiosco sesionId={sesionId} snapshot={snapshot} />;
}

function Centro({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8 text-center text-slate-500">{children}</div>
  );
}

function Kiosco({
  sesionId,
  snapshot,
}: {
  sesionId: string;
  snapshot: NonNullable<ReturnType<typeof useSnapshotTurnero>["snapshot"]>;
}) {
  const { servicios, categorias } = snapshot.sesion.turnero;
  const esSimulacion = Boolean(snapshot.sesion.simulacionId);
  const [prioritario, setPrioritario] = useState(false);
  const [categoria, setCategoria] = useState<string | null>(null);
  const [cedula, setCedula] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [emitido, setEmitido] = useState<{ codigo: string; prioritario: boolean; pacienteNombre: string | null } | null>(
    null
  );
  const [enviando, setEnviando] = useState(false);

  async function emitir(servicioCodigo: string) {
    if (enviando) return;
    setError(null);
    // El zod del endpoint rechaza la cédula vacía como "dato inválido" (formato), no como
    // el caso de negocio "falta la cédula" — validamos acá antes para mostrar el mensaje
    // correcto sin ni siquiera llamar a la API.
    if (esSimulacion && !cedula.trim()) {
      setError("Esta simulación requiere la cédula del paciente para sacar turno.");
      return;
    }
    setEnviando(true);
    const res = await fetch(`/api/turnero/sesiones/${sesionId}/tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        servicioCodigo,
        prioritario,
        categoria: prioritario ? categoria : null,
        cedula: esSimulacion ? cedula.trim() : null,
      }),
    });
    const data = await res.json();
    setEnviando(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo sacar el turno");
      return;
    }
    setEmitido({ codigo: data.codigo, prioritario: data.prioritario, pacienteNombre: data.pacienteNombre });
    setPrioritario(false);
    setCategoria(null);
    setCedula("");
    setTimeout(() => setEmitido(null), 6000);
  }

  if (emitido) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-lg text-slate-500">Su turno es</p>
        <p className="font-heading text-7xl font-extrabold text-blue-900">{emitido.codigo}</p>
        {emitido.pacienteNombre && <p className="text-sm text-slate-500">{emitido.pacienteNombre}</p>}
        {emitido.prioritario && (
          <p className="rounded-full bg-gold-100 px-4 py-1 text-sm font-semibold text-gold-700">
            Atención prioritaria
          </p>
        )}
        <p className="text-sm text-slate-400">Espere a que lo llamen en el tablero.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl py-6">
      <h1 className="font-heading text-2xl font-bold text-blue-900 text-center mb-1">Solicitar turno</h1>
      <p className="text-sm text-slate-500 text-center mb-6">Seleccione el servicio que necesita</p>

      {esSimulacion && (
        <div className="mb-5">
          <input
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
            placeholder="Cédula del paciente"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-center text-lg"
          />
          <p className="text-xs text-slate-400 text-center mt-1">
            Esta simulación pide la cédula para verificar la historia clínica.
          </p>
        </div>
      )}
      {error && <p className="text-sm text-red-600 text-center mb-4">{error}</p>}

      <label className="flex items-center justify-center gap-2 mb-3 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={prioritario}
          onChange={(e) => {
            setPrioritario(e.target.checked);
            if (!e.target.checked) setCategoria(null);
          }}
          className="h-4 w-4"
        />
        Atención prioritaria
      </label>

      {prioritario && (
        <div className="flex flex-wrap justify-center gap-2 mb-5">
          {categorias.map((c) => (
            <button
              key={c.codigo}
              onClick={() => setCategoria(c.codigo)}
              className={`rounded-full px-3 py-1.5 text-sm border transition-colors ${
                categoria === c.codigo
                  ? "border-gold-600 bg-gold-50 text-gold-700 font-medium"
                  : "border-slate-300 text-slate-600 hover:border-gold-400"
              }`}
            >
              {c.nombre}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-3">
        {servicios.map((s) => (
          <button
            key={s.codigo}
            onClick={() => emitir(s.codigo)}
            disabled={enviando || (prioritario && !categoria) || (esSimulacion && !cedula.trim())}
            className="rounded-xl bg-blue-800 px-6 py-5 text-lg font-heading font-semibold text-white hover:bg-blue-900 disabled:opacity-40"
          >
            {s.nombre}
          </button>
        ))}
      </div>
      {prioritario && !categoria && (
        <p className="text-xs text-amber-600 text-center mt-3">Elija la categoría de prioridad.</p>
      )}
    </div>
  );
}
