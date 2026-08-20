"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type Escenario = {
  id: string;
  titulo: string;
  descripcion: string;
  resultadoEsperado: "VENTA_CORRECTA" | "RECHAZO_CORRECTO";
  activo: boolean;
  paciente: { nombre: string } | null;
  pasos: { id: string }[];
  items: { medicamento: { nombre: string } }[];
  _count: { intentos: number };
};

export default function EscenariosPage() {
  const [escenarios, setEscenarios] = useState<Escenario[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    const res = await fetch("/api/admin/escenarios");
    const data = await res.json();
    setEscenarios(data.escenarios ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function alternarActivo(esc: Escenario) {
    await fetch(`/api/admin/escenarios/${esc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !esc.activo }),
    });
    cargar();
  }

  async function eliminar(esc: Escenario) {
    if (!confirm(`¿Eliminar "${esc.titulo}"?`)) return;
    const res = await fetch(`/api/admin/escenarios/${esc.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "No se pudo eliminar");
      return;
    }
    cargar();
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold text-blue-900">Escenarios</h1>
        <Link
          href="/admin/escenarios/nuevo"
          className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900"
        >
          Crear escenario
        </Link>
      </div>

      {cargando && <p className="text-slate-500 text-sm">Cargando...</p>}

      <div className="flex flex-col gap-4">
        {escenarios.map((esc) => (
          <div key={esc.id} className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-medium text-slate-800">{esc.titulo}</h2>
                <p className="text-sm text-slate-500 mt-1">{esc.descripcion}</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    {esc.pasos.length} paso(s)
                  </span>
                  <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    {esc.resultadoEsperado === "VENTA_CORRECTA" ? "Debe vender" : "Debe rechazar"}
                  </span>
                  {esc.paciente && (
                    <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                      Paciente: {esc.paciente.nombre}
                    </span>
                  )}
                  <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    {esc._count.intentos} intento(s) registrados
                  </span>
                  <span className={`text-[11px] px-2 py-0.5 rounded ${esc.activo ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                    {esc.activo ? "Activo" : "Inactivo"}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2 items-end shrink-0">
                <button onClick={() => alternarActivo(esc)} className="text-xs text-slate-500 hover:underline">
                  {esc.activo ? "Desactivar" : "Activar"}
                </button>
                <button onClick={() => eliminar(esc)} className="text-xs text-red-600 hover:underline">
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
