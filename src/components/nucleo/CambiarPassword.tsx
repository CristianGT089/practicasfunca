"use client";

import { useEffect, useRef, useState } from "react";

const LARGO_MINIMO = 6; // igual que LARGO_MINIMO_PASSWORD en lib/nucleo/passwords.ts

const claseInput =
  "w-full rounded-xl border border-blue-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500";

/**
 * Diálogo para que el propio usuario reemplace la contraseña generada por una que recuerde.
 * Pide la actual para que nadie la cambie con una sesión abierta ajena.
 */
export default function CambiarPassword({ onCerrar }: { onCerrar: () => void }) {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [listo, setListo] = useState(false);
  const primerCampo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    primerCampo.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onCerrar]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (nueva.length < LARGO_MINIMO) return setError(`La contraseña nueva debe tener al menos ${LARGO_MINIMO} caracteres`);
    if (nueva !== confirmacion) return setError("La confirmación no coincide con la contraseña nueva");
    setGuardando(true);
    const res = await fetch("/api/auth/cambiar-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actual, nueva }),
    });
    const data = await res.json().catch(() => ({}));
    setGuardando(false);
    if (!res.ok) return setError(data.error ?? "No se pudo cambiar la contraseña");
    setListo(true);
  }

  const tipo = mostrar ? "text" : "password";

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-blue-950/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div role="dialog" aria-modal="true" aria-labelledby="titulo-cambiar-password" className="tarjeta w-full max-w-sm p-5 text-left">
        <h2 id="titulo-cambiar-password" className="font-heading text-lg font-bold text-blue-900 mb-1">
          Cambiar contraseña
        </h2>
        {listo ? (
          <>
            <p className="text-sm text-emerald-700 mb-4">Listo. Desde ahora entras con tu nueva contraseña.</p>
            <button type="button" onClick={onCerrar} className="btn-primario">
              Cerrar
            </button>
          </>
        ) : (
          <form onSubmit={guardar} className="flex flex-col gap-3">
            <p className="text-sm text-slate-500">Elige una que puedas recordar, de al menos {LARGO_MINIMO} caracteres.</p>
            <label className="text-sm font-medium text-slate-700">
              Contraseña actual
              <input ref={primerCampo} type={tipo} value={actual} onChange={(e) => setActual(e.target.value)} autoComplete="current-password" className={`${claseInput} mt-1`} required />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Contraseña nueva
              <input type={tipo} value={nueva} onChange={(e) => setNueva(e.target.value)} autoComplete="new-password" className={`${claseInput} mt-1`} required />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Repite la contraseña nueva
              <input type={tipo} value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} autoComplete="new-password" className={`${claseInput} mt-1`} required />
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input type="checkbox" checked={mostrar} onChange={(e) => setMostrar(e.target.checked)} />
              Mostrar contraseñas
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex items-center gap-3 pt-1">
              <button type="submit" disabled={guardando} className="btn-primario disabled:opacity-60">
                {guardando ? "Guardando..." : "Guardar"}
              </button>
              <button type="button" onClick={onCerrar} className="text-sm text-slate-500 hover:underline">
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
