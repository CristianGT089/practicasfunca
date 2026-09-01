"use client";

import { useEffect, useState, useCallback } from "react";

type Modulo = {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string | null;
  colorTema: string | null;
  activo: boolean;
  _count: { escenarios: number; matriculas: number };
};

export default function ModulosPage() {
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [slug, setSlug] = useState("");
  const [nombre, setNombre] = useState("");

  const cargar = useCallback(async () => {
    const res = await fetch("/api/admin/modulos");
    const data = await res.json();
    setModulos(data.modulos ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function crear() {
    if (!slug.trim() || !nombre.trim()) return;
    await fetch("/api/admin/modulos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, nombre }),
    });
    setSlug("");
    setNombre("");
    cargar();
  }

  async function alternarActivo(m: Modulo) {
    await fetch(`/api/admin/modulos/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !m.activo }),
    });
    cargar();
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-heading text-2xl font-bold text-blue-900 mb-6">Módulos</h1>

      <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm mb-6">
        <h2 className="text-sm font-heading font-semibold text-blue-900 mb-3">Nuevo módulo</h2>
        <div className="flex gap-2">
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="slug (ej: primera_infancia)"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre (ej: Primera Infancia)"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button onClick={crear} className="rounded-lg bg-blue-800 px-4 text-sm font-medium text-white hover:bg-blue-900">
            Crear
          </button>
        </div>
      </div>

      {cargando && <p className="text-slate-500 text-sm">Cargando...</p>}

      <div className="flex flex-col gap-3">
        {modulos.map((m) => (
          <div key={m.id} className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-800">
                {m.nombre} <span className="text-xs text-slate-400">({m.slug})</span>
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {m._count.escenarios} escenario(s) · {m._count.matriculas} matrícula(s)
              </p>
            </div>
            <button onClick={() => alternarActivo(m)} className="text-xs text-slate-500 hover:underline shrink-0">
              {m.activo ? "Desactivar" : "Activar"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
