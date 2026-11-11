"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Asignacion = {
  id: string;
  titulo: string;
  grupo: string | null;
  docente: string;
  activa: boolean;
  creadoEn: string;
  total: number;
  empezados: number;
  terminados: number;
  nuevos: number;
};
type Candidato = { id: string; nombre: string; usuario: string; vino: boolean };

/**
 * En «Clase en vivo»: habilitar la clase a tu ritmo para los estudiantes que faltaron y ver
 * cómo van. Se preseleccionan los del grupo que no entraron a la clase en vivo de esa lección.
 */
export default function SeccionARitmo({
  lecciones,
  grupos,
}: {
  lecciones: { slug: string; titulo: string }[];
  grupos: { id: string; nombre: string; estudiantes: number }[];
}) {
  const router = useRouter();
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [leccion, setLeccion] = useState(lecciones[0]?.slug ?? "");
  const [grupoId, setGrupoId] = useState(grupos[0]?.id ?? "");
  const [candidatos, setCandidatos] = useState<Candidato[] | null>(null);
  const [elegidos, setElegidos] = useState<Set<string>>(new Set());
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/clase/ritmo")
      .then((r) => r.json())
      .then((d) => setAsignaciones(d.asignaciones ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!abierto || !grupoId || !leccion) return;
    fetch(`/api/admin/clase/ritmo?grupoId=${encodeURIComponent(grupoId)}&leccion=${encodeURIComponent(leccion)}`)
      .then((r) => r.json())
      .then((d) => {
        const lista: Candidato[] = d.candidatos ?? [];
        setCandidatos(lista);
        setElegidos(new Set(lista.filter((c) => !c.vino).map((c) => c.id)));
      })
      .catch(() => setCandidatos([]));
  }, [abierto, grupoId, leccion]);

  function alternar(id: string) {
    setElegidos((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function habilitar() {
    setError(null);
    setEnviando(true);
    const r = await fetch("/api/admin/clase/ritmo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leccion, grupoId, estudianteIds: [...elegidos], mensaje }),
    });
    const d = await r.json().catch(() => ({}));
    setEnviando(false);
    if (!r.ok) return setError(d.error ?? "No se pudo habilitar");
    router.push(`/admin/clase/ritmo/${d.asignacion.id}`);
  }

  const activas = asignaciones.filter((a) => a.activa);
  const cerradas = asignaciones.filter((a) => !a.activa);

  return (
    <section className="tarjeta p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-bold text-blue-900">Clase a tu ritmo</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Para quienes no pudieron venir: hacen la clase solos desde su panel, con tus explicaciones en cada diapositiva y en orden. Cuando terminan, te
            llega su reporte aquí.
          </p>
        </div>
        {!abierto && grupos.length > 0 && (
          <button onClick={() => setAbierto(true)} className="btn-primario !py-2">
            Habilitar a estudiantes
          </button>
        )}
      </div>

      {abierto && (
        <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50/40 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">
              Lección
              <select value={leccion} onChange={(e) => setLeccion(e.target.value)} className="mt-1 block w-full rounded-xl border border-blue-200 bg-white px-3 py-2">
                {lecciones.map((l) => (
                  <option key={l.slug} value={l.slug}>
                    {l.titulo}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Grupo
              <select value={grupoId} onChange={(e) => setGrupoId(e.target.value)} className="mt-1 block w-full rounded-xl border border-blue-200 bg-white px-3 py-2">
                {grupos.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nombre} ({g.estudiantes})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-700">¿Quiénes la pueden hacer?</p>
              {candidatos && candidatos.length > 0 && (
                <span className="flex gap-2 text-xs">
                  <button onClick={() => setElegidos(new Set(candidatos.filter((c) => !c.vino).map((c) => c.id)))} className="font-semibold text-blue-700 hover:underline">
                    Los que faltaron
                  </button>
                  <span className="text-slate-300">·</span>
                  <button onClick={() => setElegidos(new Set(candidatos.map((c) => c.id)))} className="font-semibold text-blue-700 hover:underline">
                    Todos
                  </button>
                  <span className="text-slate-300">·</span>
                  <button onClick={() => setElegidos(new Set())} className="font-semibold text-blue-700 hover:underline">
                    Ninguno
                  </button>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">Ya vienen marcados los que no entraron a la clase en vivo de esta lección.</p>
            {candidatos === null && <p className="mt-2 text-sm text-slate-500">Cargando…</p>}
            {candidatos?.length === 0 && <p className="mt-2 text-sm text-amber-700">Este grupo no tiene estudiantes.</p>}
            <div className="mt-2 grid max-h-72 gap-1.5 overflow-y-auto sm:grid-cols-2">
              {candidatos?.map((c) => (
                <label key={c.id} className="flex cursor-pointer items-center gap-2.5 rounded-xl bg-white px-3 py-2 text-sm hover:bg-blue-50">
                  <input type="checkbox" checked={elegidos.has(c.id)} onChange={() => alternar(c.id)} className="h-4 w-4 accent-blue-800" />
                  <span className="min-w-0 flex-1 truncate font-semibold text-blue-950">{c.nombre}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${c.vino ? "bg-emerald-100 text-emerald-800" : "bg-gold-100 text-gold-700"}`}>
                    {c.vino ? "Vino" : "Faltó"}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <label className="mt-4 block text-sm font-semibold text-slate-700">
            Mensaje para ellos <span className="font-normal text-slate-500">(opcional; lo ven al empezar y en «Mensaje del profe»)</span>
            <textarea
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              rows={3}
              placeholder="Ej.: Tienes hasta el sábado a las 6 p. m. Para compartir tu carpeta de Drive usa mi correo: …"
              className="mt-1 block w-full rounded-xl border border-blue-200 bg-white px-3 py-2 font-normal"
            />
          </label>

          {error && <p className="mt-3 text-sm font-semibold text-rose-700">{error}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button onClick={habilitar} disabled={enviando || elegidos.size === 0} className="btn-cta !py-2">
              {enviando ? "Habilitando…" : `Habilitar a ${elegidos.size} estudiante${elegidos.size === 1 ? "" : "s"}`}
            </button>
            <Link href={`/panel/clase?leccion=${leccion}&modo=ritmo`} target="_blank" className="btn-suave !py-2">
              Ver cómo la ven
            </Link>
            <button onClick={() => setAbierto(false)} className="rounded-full px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {activas.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {activas.map((a) => (
            <FilaAsignacion key={a.id} a={a} />
          ))}
        </div>
      )}
      {cerradas.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-semibold text-slate-500">Cerradas ({cerradas.length})</summary>
          <div className="mt-2 flex flex-col gap-2">
            {cerradas.map((a) => (
              <FilaAsignacion key={a.id} a={a} />
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

function FilaAsignacion({ a }: { a: Asignacion }) {
  return (
    <Link href={`/admin/clase/ritmo/${a.id}`} className="tarjeta-sm flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-blue-50/50">
      <span className="text-2xl" aria-hidden>
        🧭
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-blue-950">
          {a.titulo}
          {!a.activa && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">Cerrada</span>}
        </p>
        <p className="text-xs text-slate-500">
          {a.grupo ?? "Sin grupo"} · {a.terminados} de {a.total} terminaron · {a.empezados - a.terminados} en curso · {a.docente}
        </p>
      </div>
      {a.nuevos > 0 && (
        <span className="rounded-full bg-gold-500 px-2.5 py-1 text-xs font-bold text-blue-900">
          {a.nuevos} reporte{a.nuevos === 1 ? "" : "s"} nuevo{a.nuevos === 1 ? "" : "s"}
        </span>
      )}
      <span className="btn-suave !py-1.5 text-sm">Ver reporte →</span>
    </Link>
  );
}
