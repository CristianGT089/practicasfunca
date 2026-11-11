"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SeccionARitmo from "@/components/clase/SeccionARitmo";

type Datos = {
  lecciones: { slug: string; titulo: string; descripcion: string; total: number }[];
  grupos: { id: string; nombre: string; estudiantes: number }[];
  activas: { id: string; leccion: string; titulo: string; grupo: string | null; docente: string; diapositiva: number; asistentes: number }[];
};

/** Inicio de la clase en vivo: elegir lección y grupo, o retomar una clase abierta. */
export default function ClaseAdmin() {
  const router = useRouter();
  const [datos, setDatos] = useState<Datos | null>(null);
  const [grupoId, setGrupoId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creando, setCreando] = useState<string | null>(null);

  function cargar() {
    fetch("/api/admin/clase")
      .then((r) => r.json())
      .then((d: Datos) => {
        setDatos(d);
        setGrupoId((g) => g || d.grupos[0]?.id || "");
      })
      .catch(() => setError("No se pudo cargar"));
  }
  useEffect(cargar, []);

  async function iniciar(leccion: string) {
    setError(null);
    setCreando(leccion);
    const r = await fetch("/api/admin/clase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leccion, grupoId }),
    });
    const d = await r.json();
    setCreando(null);
    if (!r.ok) return setError(d.error ?? "No se pudo iniciar");
    router.push(`/admin/clase/${d.sesion.id}`);
  }

  async function terminar(id: string) {
    if (!window.confirm("¿Terminar esta clase en vivo?")) return;
    await fetch(`/api/admin/clase/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cerrar: true }) });
    cargar();
  }

  return (
    <main className="px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div>
          <span className="eyebrow">Clase en vivo</span>
          <h1 className="titulo-pagina mt-2">Presenta tu clase</h1>
          <p className="mt-2 text-slate-600">
            Tú proyectas y cada estudiante la sigue en su computador desde su panel. Las actividades (atajos, mecanografía, carpetas…) se hacen ahí mismo y
            su progreso queda guardado aunque se desconecten.
          </p>
        </div>

        {datos && datos.activas.length > 0 && (
          <section className="tarjeta p-5">
            <h2 className="font-heading text-lg font-bold text-blue-900">Clases abiertas</h2>
            <div className="mt-3 flex flex-col gap-2">
              {datos.activas.map((a) => (
                <div key={a.id} className="tarjeta-sm flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500" />
                  <div className="flex-1">
                    <p className="font-semibold text-blue-950">{a.titulo}</p>
                    <p className="text-xs text-slate-500">
                      {a.grupo ?? "Todos los estudiantes"} · diapositiva {a.diapositiva + 1} · {a.asistentes} han entrado · {a.docente}
                    </p>
                  </div>
                  <button onClick={() => terminar(a.id)} className="rounded-full px-3 py-1.5 text-sm font-semibold text-rose-700 hover:bg-rose-50">
                    Terminar
                  </button>
                  <Link href={`/admin/clase/${a.id}`} className="btn-cta !py-2">
                    Presentar →
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {datos && (
          <section className="tarjeta p-5">
            <h2 className="font-heading text-lg font-bold text-blue-900">Iniciar una clase</h2>
            <label className="mt-3 block text-sm font-semibold text-slate-700">
              Grupo
              <select value={grupoId} onChange={(e) => setGrupoId(e.target.value)} className="mt-1 block w-full rounded-xl border border-blue-200 bg-white px-3 py-2 sm:w-80">
                {datos.grupos.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nombre} ({g.estudiantes} estudiantes)
                  </option>
                ))}
                <option value="">Todos los estudiantes (solo coordinación)</option>
              </select>
            </label>
            {datos.grupos.length === 0 && (
              <p className="mt-2 text-sm text-amber-700">
                Aún no tienes grupos. Créalo en <Link href="/admin/grupos" className="underline">Grupos</Link> y agrega a tus estudiantes en{" "}
                <Link href="/admin/estudiantes" className="underline">Estudiantes</Link>.
              </p>
            )}
            <div className="mt-4 flex flex-col gap-3">
              {datos.lecciones.map((l) => (
                <div key={l.slug} className="tarjeta-sm flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="flex-1">
                    <p className="font-semibold text-blue-950">{l.titulo}</p>
                    <p className="text-sm text-slate-600">{l.descripcion}</p>
                    <p className="text-xs text-slate-500">{l.total} diapositivas</p>
                  </div>
                  <Link href={`/panel/clase?leccion=${l.slug}`} target="_blank" className="btn-suave !py-2">
                    Vista del estudiante
                  </Link>
                  <button onClick={() => iniciar(l.slug)} disabled={creando !== null} className="btn-cta !py-2">
                    {creando === l.slug ? "Iniciando…" : "Iniciar en vivo"}
                  </button>
                </div>
              ))}
            </div>
            {error && <p className="mt-3 text-sm font-semibold text-rose-700">{error}</p>}
          </section>
        )}

        {datos && <SeccionARitmo lecciones={datos.lecciones} grupos={datos.grupos} />}
      </div>
    </main>
  );
}
