"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSesionGestor } from "@/components/admin/useSesionGestor";
import EditorGuion from "@/components/admin/EditorGuion";

type Escenario = {
  id: string;
  titulo: string;
  descripcion: string;
  resultadoEsperado: string;
  activo: boolean;
  modulo: { slug: string; nombre: string };
  farmacia: { paciente: { nombre: string } | null; items: { medicamento: { nombre: string } }[] } | null;
  pasos: { id: string }[];
  _count: { intentos: number };
  personaje: string | null;
  guion: unknown;
};

export default function EscenariosPage() {
  const sesion = useSesionGestor();
  const [editandoGuion, setEditandoGuion] = useState<string | null>(null);
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
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="titulo-pagina">Práctica virtual</h1>
          <p className="text-sm text-slate-500">Los casos que cada estudiante resuelve solo en el computador; ve su nota al terminar.</p>
        </div>
        {/* El formulario genérico de escenarios es el de Farmacia; los demás módulos tienen su editor en su menú. */}
        {(sesion?.rol === "ADMIN" || sesion?.slugs.includes("farmacia")) && (
          <Link
            href="/admin/escenarios/nuevo"
            className="shrink-0 rounded-full font-heading bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900"
          >
            Crear caso de Farmacia
          </Link>
        )}
      </div>

      {cargando && <p className="text-slate-500 text-sm">Cargando...</p>}

      <div className="flex flex-col gap-4">
        {escenarios.map((esc) => (
          <div key={esc.id} className="tarjeta p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-medium text-slate-800">{esc.titulo}</h2>
                <p className="text-sm text-slate-500 mt-1">{esc.descripcion}</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    {esc.pasos.length} paso(s)
                  </span>
                  <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    {esc.modulo.nombre}
                  </span>
                  <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    {esc.resultadoEsperado}
                  </span>
                  {esc.farmacia?.paciente && (
                    <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                      Paciente: {esc.farmacia.paciente.nombre}
                    </span>
                  )}
                  <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    {esc._count.intentos} intento(s) registrados
                  </span>
                  {esc.personaje && (
                    <span className="text-[11px] bg-gold-100 text-gold-700 px-2 py-0.5 rounded">Con persona animada</span>
                  )}
                  <span className={`text-[11px] px-2 py-0.5 rounded ${esc.activo ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                    {esc.activo ? "Activo" : "Inactivo"}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2 items-end shrink-0">
                {/* La escena existe por ahora en Farmacia; los demás módulos la tendrán después. */}
                {esc.modulo.slug === "farmacia" && (
                  <button
                    onClick={() => setEditandoGuion(editandoGuion === esc.id ? null : esc.id)}
                    className="text-xs text-blue-700 hover:underline"
                  >
                    Persona y diálogo
                  </button>
                )}
                <button onClick={() => alternarActivo(esc)} className="text-xs text-slate-500 hover:underline">
                  {esc.activo ? "Desactivar" : "Activar"}
                </button>
                <button onClick={() => eliminar(esc)} className="text-xs text-red-600 hover:underline">
                  Eliminar
                </button>
              </div>
            </div>
            {editandoGuion === esc.id && (
              <EditorGuion
                escenarioId={esc.id}
                personajeInicial={esc.personaje}
                guionInicial={esc.guion}
                onGuardado={() => {
                  setEditandoGuion(null);
                  cargar();
                }}
                onCancelar={() => setEditandoGuion(null)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
