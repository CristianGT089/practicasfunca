"use client";

import { useEffect, useState, useCallback } from "react";

type Medicamento = {
  id: string;
  nombre: string;
  principioActivo: string;
  presentacion: string;
  laboratorio: string | null;
  formaFarmaceutica: string | null;
  concentracion: string | null;
  registroInvima: string | null;
  numeroLote: string | null;
  loteVencimiento: string | null;
  stock: number;
};

const VACIO = {
  nombre: "",
  principioActivo: "",
  presentacion: "",
  laboratorio: "",
  formaFarmaceutica: "",
  concentracion: "",
  registroInvima: "",
  numeroLote: "",
  loteVencimiento: "",
  stock: "0",
};

export default function CatalogoRealAdminPage() {
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState(VACIO);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    const res = await fetch("/api/modulos/farmacia/admin/catalogo");
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
    setGuardando(true);
    try {
      const res = await fetch("/api/modulos/farmacia/admin/catalogo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        // 409 = ya existe (mismo principio activo + presentación + lote)
        setError(data.error ?? "No se pudo agregar el medicamento");
        return;
      }
      setForm(VACIO);
      cargar();
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(id: string) {
    const res = await fetch(`/api/modulos/farmacia/admin/catalogo/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "No se pudo eliminar");
      return;
    }
    cargar();
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-heading text-2xl font-bold text-blue-900 mb-1">Catálogo real de medicamentos</h1>
      <p className="text-sm text-slate-500 mb-6">
        Este catálogo alimenta la consulta libre del estudiante en /panel/catalogo (sin calificación). No se puede
        repetir un medicamento con el mismo principio activo, presentación y número de lote.
      </p>

      <form onSubmit={crear} className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm mb-6">
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Principio activo *</label>
            <input
              value={form.principioActivo}
              onChange={(e) => setForm({ ...form, principioActivo: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nombre comercial</label>
            <input
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Si se deja vacío, se usa el principio activo"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Presentación *</label>
            <input
              value={form.presentacion}
              onChange={(e) => setForm({ ...form, presentacion: e.target.value })}
              placeholder="Ej: TABLETAS 500MG"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Laboratorio</label>
            <input
              value={form.laboratorio}
              onChange={(e) => setForm({ ...form, laboratorio: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Forma farmacéutica</label>
            <input
              value={form.formaFarmaceutica}
              onChange={(e) => setForm({ ...form, formaFarmaceutica: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Concentración</label>
            <input
              value={form.concentracion}
              onChange={(e) => setForm({ ...form, concentracion: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Registro INVIMA</label>
            <input
              value={form.registroInvima}
              onChange={(e) => setForm({ ...form, registroInvima: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">N° de lote</label>
            <input
              value={form.numeroLote}
              onChange={(e) => setForm({ ...form, numeroLote: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de vencimiento</label>
            <input
              type="date"
              value={form.loteVencimiento}
              onChange={(e) => setForm({ ...form, loteVencimiento: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Existencias</label>
            <input
              type="number"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <button
          type="submit"
          disabled={guardando}
          className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-60"
        >
          {guardando ? "Guardando..." : "Agregar al catálogo"}
        </button>
      </form>

      {cargando && <p className="text-slate-500 text-sm">Cargando...</p>}

      <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Principio activo</th>
              <th className="px-4 py-2 font-medium">Presentación</th>
              <th className="px-4 py-2 font-medium">Laboratorio</th>
              <th className="px-4 py-2 font-medium">Lote</th>
              <th className="px-4 py-2 font-medium">Existencias</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {medicamentos.map((m) => (
              <tr key={m.id} className="border-t border-slate-100">
                <td className="px-4 py-2 text-slate-800">{m.principioActivo}</td>
                <td className="px-4 py-2 text-slate-600">{m.presentacion}</td>
                <td className="px-4 py-2 text-slate-600">{m.laboratorio ?? "N/A"}</td>
                <td className="px-4 py-2 text-slate-600">{m.numeroLote ?? "N/A"}</td>
                <td className="px-4 py-2 text-slate-600">{m.stock}</td>
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
