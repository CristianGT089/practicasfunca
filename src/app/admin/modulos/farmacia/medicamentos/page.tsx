"use client";

import { useEffect, useState, useCallback } from "react";

type Medicamento = {
  id: string;
  nombre: string;
  principioActivo: string;
  presentacion: string;
  requiereReceta: boolean;
  esControlado: boolean;
  stock: number;
  precio: number;
  tags: string[];
};

const VACIO = {
  nombre: "",
  principioActivo: "",
  presentacion: "",
  requiereReceta: false,
  esControlado: false,
  stock: "0",
  precio: "0",
  tags: "",
};

export default function MedicamentosPage() {
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState(VACIO);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const res = await fetch("/api/modulos/farmacia/admin/medicamentos");
    const data = await res.json();
    setMedicamentos(data.medicamentos ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/modulos/farmacia/admin/medicamentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "No se pudo crear el medicamento");
      return;
    }
    setForm(VACIO);
    cargar();
  }

  async function eliminar(id: string) {
    const res = await fetch(`/api/modulos/farmacia/admin/medicamentos/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "No se pudo eliminar");
      return;
    }
    cargar();
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-heading text-2xl font-bold text-blue-900 mb-6">Medicamentos</h1>

      <form onSubmit={crear} className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm mb-6">
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nombre comercial</label>
            <input
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Principio activo</label>
            <input
              value={form.principioActivo}
              onChange={(e) => setForm({ ...form, principioActivo: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Presentación</label>
            <input
              value={form.presentacion}
              onChange={(e) => setForm({ ...form, presentacion: e.target.value })}
              placeholder="Ej: Tableta 500mg"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Stock</label>
            <input
              type="number"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Precio</label>
            <input
              type="number"
              value={form.precio}
              onChange={(e) => setForm({ ...form, precio: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Tags (separados por coma, para cruces de alergia)
            </label>
            <input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="ej: penicilina, antibiotico"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="flex items-center gap-6 mb-4">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.requiereReceta}
              onChange={(e) => setForm({ ...form, requiereReceta: e.target.checked })}
            />
            Requiere receta
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.esControlado}
              onChange={(e) => setForm({ ...form, esControlado: e.target.checked })}
            />
            Es controlado
          </label>
        </div>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <button type="submit" className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900">
          Agregar medicamento
        </button>
      </form>

      {cargando && <p className="text-slate-500 text-sm">Cargando...</p>}

      <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium">Presentación</th>
              <th className="px-4 py-2 font-medium">Stock</th>
              <th className="px-4 py-2 font-medium">Precio</th>
              <th className="px-4 py-2 font-medium">Etiquetas</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {medicamentos.map((m) => (
              <tr key={m.id} className="border-t border-slate-100">
                <td className="px-4 py-2 text-slate-800">
                  {m.nombre}
                  <div className="flex gap-1 mt-1">
                    {m.requiereReceta && (
                      <span className="text-[10px] bg-gold-100 text-gold-700 px-1.5 py-0.5 rounded">Receta</span>
                    )}
                    {m.esControlado && (
                      <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Controlado</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2 text-slate-600">{m.presentacion}</td>
                <td className="px-4 py-2 text-slate-600">{m.stock}</td>
                <td className="px-4 py-2 text-slate-600">${m.precio}</td>
                <td className="px-4 py-2 text-slate-500 text-xs">{m.tags.join(", ")}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => eliminar(m.id)} className="text-xs text-red-600 hover:underline">
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
