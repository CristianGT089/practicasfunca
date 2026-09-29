"use client";

import { useState } from "react";

export type CuentaPuesto = { nombre: string; usuario: string; password: string | null };

/**
 * Cuentas de los computadores de la jornada (una por ventanilla o unidad), creadas al
 * iniciarla. Se muestran al iniciar; después se pueden volver a ver confirmando la
 * contraseña del docente, o generar otras (los computadores que ya entraron siguen dentro).
 */
export default function CuentasPuestos({ simulacionId, iniciales }: { simulacionId: string; iniciales: CuentaPuesto[] | null }) {
  const [cuentas, setCuentas] = useState<CuentaPuesto[] | null>(iniciales);
  const [generando, setGenerando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [pidiendoClave, setPidiendoClave] = useState(false);
  const [clave, setClave] = useState("");
  const [errorClave, setErrorClave] = useState<string | null>(null);

  async function verConClave(e: React.FormEvent) {
    e.preventDefault();
    setErrorClave(null);
    const res = await fetch(`/api/simulaciones/${simulacionId}/credenciales/ver`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: clave }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErrorClave(data.error ?? "No se pudieron mostrar");
      return;
    }
    setCuentas(data.cuentas);
    setPidiendoClave(false);
    setClave("");
  }

  async function regenerar() {
    setConfirmando(false);
    setGenerando(true);
    const res = await fetch(`/api/simulaciones/${simulacionId}/credenciales`, { method: "POST" });
    setGenerando(false);
    if (res.ok) setCuentas((await res.json()).cuentas);
  }

  async function copiar() {
    if (!cuentas) return;
    const texto = cuentas.map((c) => `${c.nombre}: usuario ${c.usuario} · contraseña ${c.password ?? "(generar nueva)"}`).join("\n");
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* sin portapapeles: la tabla sigue visible para copiar a mano */
    }
  }

  return (
    <section className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-heading font-semibold text-blue-900">Cuentas de los computadores</h2>
          <p className="text-xs text-slate-500">
            Una por espacio. Cada una entra directo a su pantalla y ya sabe qué espacio es. Se borran al cerrar la jornada.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          {cuentas ? (
            <>
              <button onClick={copiar} className="font-semibold text-blue-700 hover:underline">
                {copiado ? "Copiado" : "Copiar todas"}
              </button>
              <button onClick={() => setCuentas(null)} className="text-slate-500 hover:underline">
                Ocultar
              </button>
            </>
          ) : (
            <button onClick={() => setPidiendoClave(true)} className="font-semibold text-blue-700 hover:underline">
              Ver contraseñas
            </button>
          )}
          {!confirmando ? (
            <button onClick={() => setConfirmando(true)} disabled={generando} className="text-slate-500 hover:underline disabled:opacity-40">
              Generar contraseñas nuevas
            </button>
          ) : (
            <span className="flex items-center gap-2">
              <span className="text-slate-600">Se generan nuevas; los que ya entraron siguen dentro.</span>
              <button onClick={regenerar} className="font-semibold text-blue-700 hover:underline">
                Continuar
              </button>
              <button onClick={() => setConfirmando(false)} className="text-slate-500">
                Cancelar
              </button>
            </span>
          )}
        </div>
      </div>

      {cuentas ? (
        cuentas.length === 0 ? (
          <p className="mt-3 text-xs text-slate-500">Esta jornada no tiene cuentas de computador.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[360px] text-sm">
              <thead className="text-left text-xs text-slate-500">
                <tr>
                  <th className="py-1 pr-3 font-medium">Espacio</th>
                  <th className="py-1 pr-3 font-medium">Usuario</th>
                  <th className="py-1 font-medium">Contraseña</th>
                </tr>
              </thead>
              <tbody>
                {cuentas.map((c) => (
                  <tr key={c.usuario} className="border-t border-slate-100">
                    <td className="py-1.5 pr-3 text-slate-800">{c.nombre}</td>
                    <td className="py-1.5 pr-3 font-mono font-semibold text-blue-900">{c.usuario}</td>
                    <td className="py-1.5 font-mono font-semibold text-blue-900">
                      {c.password ?? <span className="font-sans text-xs font-normal text-slate-500">No disponible: genera contraseñas nuevas</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : pidiendoClave ? (
        <form onSubmit={verConClave} className="mt-3 flex flex-wrap items-center gap-2">
          <label htmlFor="clave-docente" className="text-xs text-slate-600">
            Para verlas, escribe tu contraseña:
          </label>
          <input
            id="clave-docente"
            type="password"
            autoComplete="current-password"
            autoFocus
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            className="min-w-44 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button type="submit" disabled={!clave} className="rounded-lg bg-blue-800 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-900 disabled:opacity-40">
            Mostrar
          </button>
          <button type="button" onClick={() => setPidiendoClave(false)} className="text-xs text-slate-500">
            Cancelar
          </button>
          {errorClave && <p className="basis-full text-xs text-red-600">{errorClave}</p>}
        </form>
      ) : (
        <p className="mt-3 text-xs text-slate-500">
          Para volver a ver el usuario y la contraseña de cada computador, pulsa &ldquo;Ver contraseñas&rdquo; y confirma con tu contraseña.
        </p>
      )}
    </section>
  );
}
