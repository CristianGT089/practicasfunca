"use client";

import { useEffect, useState } from "react";
import { generarInformePDF } from "@/lib/informePdf";

type Intento = {
  id: string;
  escenarioId: string;
  escenario: { titulo: string };
  puntajeFinal: number | null;
  puntajeProceso: number | null;
  puntajeResultado: number | null;
  finalizadoEn: string | null;
};

type UsuarioConIntentos = {
  id: string;
  nombre: string;
  usuario: string;
  intentos: Intento[];
};

export default function CalificacionesPage() {
  const [usuarios, setUsuarios] = useState<UsuarioConIntentos[]>([]);
  const [totalEscenarios, setTotalEscenarios] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [generandoId, setGenerandoId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/calificaciones")
      .then((res) => res.json())
      .then((data) => {
        setUsuarios(data.usuarios ?? []);
        setTotalEscenarios(data.totalEscenarios ?? 0);
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  async function descargarInforme(u: UsuarioConIntentos) {
    setGenerandoId(u.id);
    try {
      const masRecientePorEscenario = new Map<string, Intento>();
      for (const i of u.intentos) {
        if (!masRecientePorEscenario.has(i.escenarioId)) masRecientePorEscenario.set(i.escenarioId, i);
      }
      const intentosUnicos = Array.from(masRecientePorEscenario.values());
      const completados = intentosUnicos.length;
      const promedio =
        intentosUnicos.length > 0
          ? Math.round(intentosUnicos.reduce((sum, i) => sum + (i.puntajeFinal ?? 0), 0) / intentosUnicos.length)
          : null;

      await generarInformePDF({
        nombre: u.nombre,
        usuario: u.usuario,
        completados,
        totalEscenarios,
        promedio,
        intentos: intentosUnicos.map((i) => ({
          escenarioTitulo: i.escenario.titulo,
          puntajeFinal: i.puntajeFinal,
          puntajeProceso: i.puntajeProceso,
          puntajeResultado: i.puntajeResultado,
          finalizadoEn: i.finalizadoEn,
        })),
      });
    } finally {
      setGenerandoId(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-heading text-2xl font-bold text-blue-900 mb-1">Calificaciones</h1>
      <p className="text-sm text-slate-500 mb-8">
        Progreso sobre los {totalEscenarios} casos de esta primera etapa.
      </p>

      {cargando && <p className="text-slate-500 text-sm">Cargando...</p>}

      <div className="flex flex-col gap-4">
        {usuarios.map((u) => {
          const completados = new Set(u.intentos.map((i) => i.escenarioId)).size;
          const porcentaje = totalEscenarios > 0 ? Math.round((completados / totalEscenarios) * 100) : 0;
          const promedio =
            u.intentos.length > 0
              ? Math.round(u.intentos.reduce((sum, i) => sum + (i.puntajeFinal ?? 0), 0) / u.intentos.length)
              : null;

          return (
            <div key={u.id} className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4 mb-3">
                <h2 className="font-heading font-semibold text-blue-900">
                  {u.nombre} <span className="text-slate-400 text-sm font-body font-normal">({u.usuario})</span>
                </h2>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span className="text-sm font-semibold text-blue-900">
                      {completados}/{totalEscenarios} casos · {porcentaje}%
                    </span>
                    {promedio !== null && (
                      <span className="block text-xs text-slate-500">Promedio: {promedio}/100</span>
                    )}
                  </div>
                  <button
                    onClick={() => descargarInforme(u)}
                    disabled={generandoId === u.id}
                    className="text-xs rounded-lg border border-blue-800 text-blue-800 px-3 py-1.5 font-medium hover:bg-blue-50 transition-colors disabled:opacity-50"
                  >
                    {generandoId === u.id ? "Generando..." : "Generar PDF"}
                  </button>
                </div>
              </div>

              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden mb-3">
                <div
                  className="h-full rounded-full bg-gold-500 transition-all"
                  style={{ width: `${porcentaje}%` }}
                />
              </div>

              {u.intentos.length === 0 && (
                <p className="text-sm text-slate-400">Sin intentos completados aún.</p>
              )}
              {u.intentos.length > 0 && (
                <table className="w-full text-sm">
                  <tbody>
                    {u.intentos.map((i) => (
                      <tr key={i.id} className="border-t border-slate-100">
                        <td className="py-2 text-slate-700">{i.escenario.titulo}</td>
                        <td className="py-2 text-slate-500">Proceso: {i.puntajeProceso}</td>
                        <td className="py-2 text-slate-500">Resultado: {i.puntajeResultado}</td>
                        <td className="py-2 font-semibold text-blue-900">Final: {i.puntajeFinal}/100</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
