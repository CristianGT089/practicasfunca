"use client";

import { useEffect, useState, useCallback } from "react";

type Estudiante = { id: string; nombre: string; usuario: string };
type Modulo = { id: string; slug: string; nombre: string };
type Matricula = { id: string; usuarioId: string; moduloId: string };

export default function MatriculasPage() {
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [matriculas, setMatriculas] = useState<Matricula[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    const res = await fetch("/api/admin/matriculas");
    const data = await res.json();
    setEstudiantes(data.estudiantes ?? []);
    setModulos(data.modulos ?? []);
    setMatriculas(data.matriculas ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function alternar(usuarioId: string, moduloId: string, matriculado: boolean) {
    if (matriculado) {
      await fetch(`/api/admin/matriculas?usuarioId=${usuarioId}&moduloId=${moduloId}`, { method: "DELETE" });
    } else {
      await fetch("/api/admin/matriculas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuarioId, moduloId }),
      });
    }
    cargar();
  }

  if (cargando) return <p className="text-slate-500 text-sm">Cargando...</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-heading text-2xl font-bold text-blue-900 mb-6">Matrículas</h1>
      <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left px-4 py-3 font-medium text-slate-600">Estudiante</th>
              {modulos.map((m) => (
                <th key={m.id} className="text-center px-4 py-3 font-medium text-slate-600">
                  {m.nombre}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {estudiantes.map((e) => (
              <tr key={e.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 text-slate-800">
                  {e.nombre} <span className="text-xs text-slate-400">({e.usuario})</span>
                </td>
                {modulos.map((m) => {
                  const matriculado = matriculas.some((mt) => mt.usuarioId === e.id && mt.moduloId === m.id);
                  return (
                    <td key={m.id} className="text-center px-4 py-3">
                      <input
                        type="checkbox"
                        checked={matriculado}
                        onChange={() => alternar(e.id, m.id, matriculado)}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
