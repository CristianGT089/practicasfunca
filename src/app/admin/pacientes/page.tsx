"use client";

import { useEffect, useState, useCallback } from "react";

type Paciente = {
  id: string;
  nombre: string;
  cedula: string;
  edad: number;
  alergias: string[];
  antecedentes: string | null;
};

const VACIO = { nombre: "", cedula: "", edad: "", alergias: "", antecedentes: "" };

export default function PacientesPage() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState(VACIO);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const res = await fetch("/api/admin/pacientes");
    const data = await res.json();
    setPacientes(data.pacientes ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/pacientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "No se pudo crear el paciente");
      return;
    }
    setForm(VACIO);
    cargar();
  }

  async function eliminar(id: string) {
    const res = await fetch(`/api/admin/pacientes/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "No se pudo eliminar");
      return;
    }
    cargar();
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-heading text-2xl font-bold text-blue-900 mb-6">Pacientes</h1>

      <form onSubmit={crear} className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm mb-6">
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nombre</label>
            <input
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Cédula</label>
            <input
              value={form.cedula}
              onChange={(e) => setForm({ ...form, cedula: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Edad</label>
            <input
              type="number"
              value={form.edad}
              onChange={(e) => setForm({ ...form, edad: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Alergias (separadas por coma, deben coincidir con las tags de medicamentos)
            </label>
            <input
              value={form.alergias}
              onChange={(e) => setForm({ ...form, alergias: e.target.value })}
              placeholder="ej: penicilina"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Antecedentes</label>
            <input
              value={form.antecedentes}
              onChange={(e) => setForm({ ...form, antecedentes: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <button type="submit" className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900">
          Agregar paciente
        </button>
      </form>

      {cargando && <p className="text-slate-500 text-sm">Cargando...</p>}

      <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium">Cédula</th>
              <th className="px-4 py-2 font-medium">Edad</th>
              <th className="px-4 py-2 font-medium">Alergias</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {pacientes.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-4 py-2 text-slate-800">{p.nombre}</td>
                <td className="px-4 py-2 text-slate-600 font-mono">{p.cedula}</td>
                <td className="px-4 py-2 text-slate-600">{p.edad}</td>
                <td className="px-4 py-2 text-slate-500 text-xs">{p.alergias.join(", ") || "—"}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => eliminar(p.id)} className="text-xs text-red-600 hover:underline">
                    Eliminar
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
