"use client";

import { useEffect, useState, useCallback } from "react";
import { RUTAS_DIRECTAS } from "@/lib/nucleo/rutasDirectas";
import PuestosTemporales from "@/components/admin/PuestosTemporales";

type Estudiante = {
  id: string;
  nombre: string;
  usuario: string;
  activo: boolean;
  temporal: boolean;
  rutaDirecta: string | null;
  creadoEn: string;
};

function etiquetaRuta(ruta: string): string {
  return RUTAS_DIRECTAS.find((r) => r.valor === ruta)?.etiqueta ?? ruta;
}

export default function EstudiantesPage() {
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [cargando, setCargando] = useState(true);
  const [nombre, setNombre] = useState("");
  const [usuario, setUsuario] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [credenciales, setCredenciales] = useState<{ usuario: string; password: string } | null>(null);

  const cargar = useCallback(async () => {
    const res = await fetch("/api/admin/estudiantes");
    const data = await res.json();
    setEstudiantes(data.estudiantes ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/estudiantes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, usuario }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "No se pudo crear el estudiante");
      return;
    }
    setCredenciales({ usuario: data.estudiante.usuario, password: data.passwordTemporal });
    setNombre("");
    setUsuario("");
    cargar();
  }

  async function alternarActivo(est: Estudiante) {
    await fetch(`/api/admin/estudiantes/${est.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !est.activo }),
    });
    cargar();
  }

  async function resetPassword(est: Estudiante) {
    const res = await fetch(`/api/admin/estudiantes/${est.id}/reset-password`, { method: "POST" });
    const data = await res.json();
    setCredenciales({ usuario: est.usuario, password: data.passwordTemporal });
  }

  const totalTemporales = estudiantes.filter((e) => e.temporal).length;

  async function eliminarTemporales() {
    if (!confirm(`¿Eliminar las ${totalTemporales} cuentas temporales? Se borra su progreso y no se puede deshacer.`))
      return;
    await fetch("/api/admin/estudiantes/temporales", { method: "DELETE" });
    cargar();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-heading text-2xl font-bold text-blue-900 mb-6">Estudiantes</h1>

      <form onSubmit={crear} className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm mb-6 flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-1">Nombre completo</label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
            required
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-1">Usuario</label>
          <input
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
            required
          />
        </div>
        <button type="submit" className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900">
          Crear
        </button>
      </form>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {credenciales && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 mb-6 text-sm text-emerald-800">
          <p className="font-medium">Credenciales generadas — cópialas ahora, no se muestran de nuevo:</p>
          <p className="mt-1">Usuario: <span className="font-mono font-semibold">{credenciales.usuario}</span></p>
          <p>Contraseña: <span className="font-mono font-semibold">{credenciales.password}</span></p>
        </div>
      )}

      <PuestosTemporales onCreados={cargar} />
      <p className="text-xs text-slate-400 -mt-4 mb-6">
        Para una sala con turnero, mejor créalos desde <a href="/admin/turnero" className="underline">Control del turnero</a> —
        se borran solos cuando lo cierras.
      </p>

      {cargando && <p className="text-slate-500 text-sm">Cargando...</p>}

      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-heading font-semibold text-blue-900">Todos</h2>
        {totalTemporales > 0 && (
          <button onClick={eliminarTemporales} className="text-xs text-red-600 hover:underline">
            Eliminar {totalTemporales} cuenta(s) temporal(es)
          </button>
        )}
      </div>

      <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium">Usuario</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {estudiantes.map((est) => (
              <tr key={est.id} className="border-t border-slate-100">
                <td className="px-4 py-2 text-slate-800">
                  {est.nombre}
                  {est.temporal && (
                    <span className="ml-2 text-[10px] uppercase tracking-wide text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                      temporal
                    </span>
                  )}
                  {est.rutaDirecta && (
                    <span className="ml-2 text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                      → {etiquetaRuta(est.rutaDirecta)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-slate-600 font-mono">{est.usuario}</td>
                <td className="px-4 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${est.activo ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                    {est.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right flex gap-3 justify-end">
                  <button onClick={() => resetPassword(est)} className="text-xs text-blue-800 hover:underline">
                    Restablecer contraseña
                  </button>
                  <button onClick={() => alternarActivo(est)} className="text-xs text-slate-500 hover:underline">
                    {est.activo ? "Desactivar" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
