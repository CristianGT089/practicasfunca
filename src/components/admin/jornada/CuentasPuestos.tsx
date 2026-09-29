"use client";

import { useState } from "react";

export type CuentaPuesto = { nombre: string; usuario: string; password: string };

/**
 * Cuentas de los computadores de la jornada (una por ventanilla o unidad), creadas al
 * iniciarla. Las contraseñas no se guardan: se muestran al iniciar y, si se pierden, se
 * generan otras (los computadores que ya entraron siguen dentro).
 */
export default function CuentasPuestos({ simulacionId, iniciales }: { simulacionId: string; iniciales: CuentaPuesto[] | null }) {
  const [cuentas, setCuentas] = useState<CuentaPuesto[] | null>(iniciales);
  const [generando, setGenerando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  async function regenerar() {
    setConfirmando(false);
    setGenerando(true);
    const res = await fetch(`/api/simulaciones/${simulacionId}/credenciales`, { method: "POST" });
    setGenerando(false);
    if (res.ok) setCuentas((await res.json()).cuentas);
  }

  async function copiar() {
    if (!cuentas) return;
    const texto = cuentas.map((c) => `${c.nombre}: usuario ${c.usuario} · contraseña ${c.password}`).join("\n");
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
        <div className="flex gap-3 text-xs">
          {cuentas && (
            <button onClick={copiar} className="font-semibold text-blue-700 hover:underline">
              {copiado ? "Copiado" : "Copiar todas"}
            </button>
          )}
          {!confirmando ? (
            <button onClick={() => setConfirmando(true)} disabled={generando} className="text-slate-500 hover:underline disabled:opacity-40">
              {cuentas ? "Generar contraseñas nuevas" : "Ver contraseñas"}
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
                    <td className="py-1.5 font-mono font-semibold text-blue-900">{c.password}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <p className="mt-3 text-xs text-slate-500">
          Las contraseñas se mostraron al iniciar la jornada. Si las perdiste, genera unas nuevas.
        </p>
      )}
    </section>
  );
}
