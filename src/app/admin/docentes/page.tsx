"use client";

import { useCallback, useEffect, useState } from "react";

type Modulo = { id: string; nombre: string };
type Docente = {
  id: string;
  nombre: string;
  usuario: string;
  activo: boolean;
  matriculas: { modulo: Modulo }[];
  gruposComoDocente: { id: string; nombre: string }[];
};

const claseInput =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500";

/** Coordinación crea a los docentes y define qué módulos enseña cada uno. */
export default function DocentesPage() {
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [nombre, setNombre] = useState("");
  const [usuario, setUsuario] = useState("");
  const [moduloIds, setModuloIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [credenciales, setCredenciales] = useState<{ usuario: string; password: string } | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [modulosEdicion, setModulosEdicion] = useState<string[]>([]);

  const cargar = useCallback(async () => {
    const res = await fetch("/api/admin/docentes");
    const data = await res.json();
    setDocentes(data.docentes ?? []);
    setModulos(data.modulos ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const alternar = (lista: string[], id: string) => (lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id]);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/docentes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, usuario, moduloIds }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "No se pudo crear el docente");
      return;
    }
    setCredenciales({ usuario: data.docente.usuario, password: data.passwordTemporal });
    setNombre("");
    setUsuario("");
    setModuloIds([]);
    cargar();
  }

  async function actualizar(id: string, cambios: Record<string, unknown>) {
    const res = await fetch(`/api/admin/docentes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cambios),
    });
    const data = await res.json();
    if (data.passwordTemporal) {
      const d = docentes.find((x) => x.id === id);
      if (d) setCredenciales({ usuario: d.usuario, password: data.passwordTemporal });
    }
    setEditando(null);
    cargar();
  }

  const selectorModulos = (seleccion: string[], cambiar: (ids: string[]) => void) => (
    <div className="flex flex-wrap gap-2">
      {modulos.map((m) => (
        <label key={m.id} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700">
          <input type="checkbox" checked={seleccion.includes(m.id)} onChange={() => cambiar(alternar(seleccion, m.id))} />
          {m.nombre}
        </label>
      ))}
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-heading text-2xl font-bold text-blue-900 mb-2">Docentes</h1>
      <p className="text-sm text-slate-500 mb-6">
        Cada docente ve solo los módulos que enseña: sus casos, sus jornadas presenciales, sus grupos y sus estudiantes. Él mismo crea a sus
        estudiantes.
      </p>

      <form onSubmit={crear} className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm mb-6 flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-sm font-medium text-slate-700">
            Nombre completo
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={`${claseInput} mt-1`} required />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Usuario
            <input value={usuario} onChange={(e) => setUsuario(e.target.value)} className={`${claseInput} mt-1`} required />
          </label>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-700 mb-1">Módulos que enseña</p>
          {selectorModulos(moduloIds, setModuloIds)}
        </div>
        <button type="submit" className="self-start rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900">
          Crear docente
        </button>
      </form>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {credenciales && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 mb-6 text-sm text-emerald-800">
          <p className="font-medium">Credenciales generadas: cópialas ahora, no se vuelven a mostrar.</p>
          <p className="mt-1">
            Usuario: <span className="font-mono font-semibold">{credenciales.usuario}</span>
          </p>
          <p>
            Contraseña: <span className="font-mono font-semibold">{credenciales.password}</span>
          </p>
        </div>
      )}

      {cargando && <p className="text-slate-500 text-sm">Cargando...</p>}
      {!cargando && docentes.length === 0 && <p className="text-sm text-slate-500">Todavía no hay docentes.</p>}

      <div className="flex flex-col gap-2">
        {docentes.map((d) => (
          <div key={d.id} className="rounded-lg bg-white border border-slate-200 px-4 py-3 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-slate-800">
                  {d.nombre} <span className="font-mono text-xs text-slate-500">{d.usuario}</span>
                  {!d.activo && <span className="ml-2 text-xs text-slate-400">(inactivo)</span>}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Módulos: {d.matriculas.map((m) => m.modulo.nombre).join(", ") || "ninguno"}
                  {d.gruposComoDocente.length > 0 && <> · Grupos: {d.gruposComoDocente.map((g) => g.nombre).join(", ")}</>}
                </p>
              </div>
              <div className="flex gap-3 text-xs shrink-0">
                <button
                  onClick={() => {
                    setEditando(d.id);
                    setModulosEdicion(d.matriculas.map((m) => m.modulo.id));
                  }}
                  className="text-blue-700 hover:underline"
                >
                  Módulos
                </button>
                <button onClick={() => actualizar(d.id, { restablecerPassword: true })} className="text-blue-700 hover:underline">
                  Restablecer contraseña
                </button>
                <button onClick={() => actualizar(d.id, { activo: !d.activo })} className="text-slate-500 hover:underline">
                  {d.activo ? "Desactivar" : "Activar"}
                </button>
              </div>
            </div>
            {editando === d.id && (
              <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3">
                {selectorModulos(modulosEdicion, setModulosEdicion)}
                <div className="flex gap-2">
                  <button
                    onClick={() => actualizar(d.id, { moduloIds: modulosEdicion })}
                    className="rounded-lg bg-blue-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-900"
                  >
                    Guardar módulos
                  </button>
                  <button onClick={() => setEditando(null)} className="text-xs text-slate-500">
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
