"use client";

import { DISPOSITIVOS } from "@/lib/clase/dispositivo";
import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Reporte } from "@/lib/clase/ritmo";

type Estudiante = {
  id: string;
  estudiante: { id: string; nombre: string; usuario: string };
  diapositiva: number;
  maxima: number;
  total: number;
  iniciadoEn: string | null;
  terminadoEn: string | null;
  ultimaVez: string;
  revisado: boolean;
  dispositivo: string | null;
  reporte: Reporte;
};
type Datos = {
  asignacion: { id: string; leccion: string; titulo: string; grupo: { id: string; nombre: string } | null; mensaje: string | null; activa: boolean; creadoEn: string };
  estudiantes: Estudiante[];
  disponibles: { id: string; nombre: string; vino: boolean }[];
};

const fecha = (iso: string) => new Date(iso).toLocaleString("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** Reporte de la clase a tu ritmo: quién terminó, qué hizo, qué le faltó y cómo le fue en las preguntas. */
export default function ReporteARitmo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [agregando, setAgregando] = useState<Set<string>>(new Set());
  const [mensaje, setMensaje] = useState<string | null>(null);
  // Los que terminaron y no habías visto: se resaltan en esta visita.
  const [nuevos, setNuevos] = useState<Set<string>>(new Set());

  const cargar = useCallback(
    () =>
      fetch(`/api/admin/clase/ritmo/${id}`)
        .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
        .then(({ ok, d }) => {
          if (!ok) return setError(d.error ?? "No se pudo cargar");
          setDatos(d);
          return d as Datos;
        })
        .catch(() => setError("Sin conexión")),
    [id]
  );

  useEffect(() => {
    cargar().then((d) => {
      if (!d) return;
      const sinVer = d.estudiantes.filter((e) => e.terminadoEn && !e.revisado).map((e) => e.id);
      if (sinVer.length === 0) return;
      setNuevos(new Set(sinVer));
      patch({ revisar: true });
    });
    // Se refresca cada 30 s por si alguien termina mientras miras.
    const t = setInterval(cargar, 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargar]);

  async function patch(cuerpo: Record<string, unknown>) {
    await fetch(`/api/admin/clase/ritmo/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
  }

  async function agregar() {
    await patch({ agregar: [...agregando] });
    setAgregando(new Set());
    cargar();
  }
  async function quitar(e: Estudiante) {
    if (!window.confirm(`¿Quitarle la clase a tu ritmo a ${e.estudiante.nombre}? Ya no le aparecerá en su panel (lo que hizo se conserva).`)) return;
    await patch({ quitar: [e.estudiante.id] });
    cargar();
  }
  async function guardarMensaje() {
    if (mensaje === null) return;
    await patch({ mensaje });
    setMensaje(null);
    cargar();
  }
  async function alternarActiva() {
    if (!datos) return;
    const cerrar = datos.asignacion.activa;
    if (cerrar && !window.confirm("¿Cerrarla? Ya no les aparecerá a los estudiantes. El reporte se conserva y la puedes reabrir.")) return;
    await patch({ activa: !cerrar });
    cargar();
  }

  if (error)
    return (
      <main className="px-4 py-8">
        <p className="text-center font-semibold text-blue-900">{error}</p>
      </main>
    );
  if (!datos) return <main className="px-4 py-8 text-center text-sm text-slate-500">Cargando…</main>;

  const { asignacion: a, estudiantes, disponibles } = datos;
  const terminaron = estudiantes.filter((e) => e.terminadoEn).length;
  const enCurso = estudiantes.filter((e) => e.iniciadoEn && !e.terminadoEn).length;
  const sinEmpezar = estudiantes.length - terminaron - enCurso;

  return (
    <main className="px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div>
          <Link href="/admin/clase" className="text-sm font-semibold text-blue-700 hover:underline print:hidden">
            ← Clase en vivo
          </Link>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="eyebrow">Clase a tu ritmo · Reporte</span>
              <h1 className="titulo-pagina mt-2">{a.titulo}</h1>
              <p className="mt-1 text-slate-600">
                {a.grupo?.nombre ?? "Sin grupo"} · habilitada el {fecha(a.creadoEn)}
                {!a.activa && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">Cerrada</span>}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 print:hidden">
              <Link href={`/panel/clase?leccion=${a.leccion}&modo=ritmo`} target="_blank" className="btn-suave !py-2">
                Ver cómo la ven
              </Link>
              <button onClick={() => window.print()} className="btn-suave !py-2">
                Imprimir
              </button>
              <button onClick={alternarActiva} className={a.activa ? "rounded-full px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50" : "btn-primario !py-2"}>
                {a.activa ? "Cerrar" : "Reabrir"}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Cifra valor={terminaron} texto="terminaron" color="text-emerald-700" />
          <Cifra valor={enCurso} texto="en curso" color="text-gold-700" />
          <Cifra valor={sinEmpezar} texto="sin empezar" color="text-slate-500" />
        </div>

        <section className="tarjeta overflow-hidden">
          <div className="hidden grid-cols-[1fr_190px_110px_110px_130px] gap-3 border-b border-blue-100 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 md:grid">
            <span>Estudiante</span>
            <span>Estado</span>
            <span>Actividades</span>
            <span>Preguntas</span>
            <span>Mecanografía</span>
          </div>
          {estudiantes.length === 0 && <p className="p-4 text-sm text-slate-500">Nadie habilitado todavía.</p>}
          {estudiantes.map((e) => {
            const r = e.reporte;
            const completas = r.actividades.filter((x) => x.estado === "completa").length;
            const abiertoAqui = abierto === e.id;
            return (
              <div key={e.id} className={`border-b border-blue-50 ${nuevos.has(e.id) ? "bg-gold-50/60" : ""}`}>
                <button
                  onClick={() => setAbierto(abiertoAqui ? null : e.id)}
                  className="grid w-full gap-1 px-4 py-3 text-left hover:bg-blue-50/50 md:grid-cols-[1fr_190px_110px_110px_130px] md:items-center md:gap-3"
                  aria-expanded={abiertoAqui}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-blue-950">
                      {abiertoAqui ? "▾" : "▸"} {e.estudiante.nombre}
                      {nuevos.has(e.id) && <span className="ml-2 rounded-full bg-gold-500 px-2 py-0.5 text-[10px] font-bold text-blue-900">NUEVO</span>}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {e.estudiante.usuario}
                      {e.dispositivo && ` · ${DISPOSITIVOS.find((d) => d.id === e.dispositivo)?.icono ?? ""} desde ${DISPOSITIVOS.find((d) => d.id === e.dispositivo)?.nombre.toLowerCase() ?? e.dispositivo}`}
                    </span>
                  </span>
                  <span className="text-sm">
                    {e.terminadoEn ? (
                      <span className="font-semibold text-emerald-700">✓ Terminó {fecha(e.terminadoEn)}</span>
                    ) : e.iniciadoEn ? (
                      <span className="text-gold-700">
                        Va en {e.maxima + 1} de {e.total} <span className="block text-xs text-slate-500">última vez {fecha(e.ultimaVez)}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400">No ha empezado</span>
                    )}
                  </span>
                  <span className="text-sm text-slate-700">
                    <span className="md:hidden">Actividades: </span>
                    {completas} de {r.actividades.length}
                  </span>
                  <span className="text-sm text-slate-700">
                    <span className="md:hidden">Preguntas: </span>
                    {r.respondidas ? `${r.aciertos} de ${r.calificables} bien` : "—"}
                  </span>
                  <span className="text-sm text-slate-700">
                    <span className="md:hidden">Mecanografía: </span>
                    {r.mecanografia ? `${r.mecanografia.mejorPpm} ppm · ${r.mecanografia.precision}%` : "—"}
                  </span>
                </button>

                {abiertoAqui && (
                  <div className="grid gap-4 bg-blue-50/40 px-4 pb-4 pt-1 md:grid-cols-2">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Actividades</p>
                      <ul className="mt-2 flex flex-col gap-2">
                        {r.actividades.map((x) => (
                          <li key={x.id} className="rounded-xl bg-white px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                  x.estado === "completa" ? "bg-emerald-100 text-emerald-800" : x.estado === "empezada" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {x.estado === "completa" ? "✓ Completa" : x.estado === "empezada" ? "Empezada" : "Pendiente"}
                              </span>
                              <span className="text-sm font-semibold text-blue-950">{x.titulo}</span>
                            </div>
                            {x.estado !== "pendiente" && <p className="mt-1 text-xs text-slate-600">{x.detalle}</p>}
                            {x.estado === "empezada" && x.faltantes.length > 0 && (
                              <p className="mt-1 text-xs text-amber-800">Le faltó: {x.faltantes.join(" · ")}</p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Preguntas rápidas (no tienen nota)</p>
                      <ul className="mt-2 flex flex-col gap-1.5">
                        {r.preguntas.map((p) => (
                          <li key={p.id} className="rounded-xl bg-white px-3 py-2 text-sm">
                            <span className="mr-1">{p.respuesta === null ? "○" : p.acerto === null ? "💬" : p.acerto ? "✅" : "❌"}</span>
                            <span className="text-blue-950">{p.pregunta}</span>
                            {p.respuesta !== null && (
                              <span className="block text-xs text-slate-600">
                                Respondió: {p.respuesta}
                                {p.acerto === false && p.correcta && <span className="text-emerald-700"> · correcta: {p.correcta}</span>}
                              </span>
                            )}
                            {p.respuesta === null && <span className="block text-xs text-slate-400">Sin responder</span>}
                          </li>
                        ))}
                      </ul>
                      <button onClick={() => quitar(e)} className="mt-4 text-xs font-semibold text-rose-700 hover:underline print:hidden">
                        Quitarle la clase a {e.estudiante.nombre.split(" ")[0]}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </section>

        <div className="grid gap-4 md:grid-cols-2 print:hidden">
          <section className="tarjeta p-5">
            <h2 className="font-heading font-bold text-blue-900">Agregar estudiantes</h2>
            <p className="text-sm text-slate-600">Del grupo {a.grupo?.nombre ?? ""}, los que aún no la tienen.</p>
            {disponibles.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Todos los del grupo ya la tienen.</p>
            ) : (
              <>
                <div className="mt-3 flex max-h-56 flex-col gap-1 overflow-y-auto">
                  {disponibles.map((c) => (
                    <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-blue-50">
                      <input
                        type="checkbox"
                        checked={agregando.has(c.id)}
                        onChange={() =>
                          setAgregando((s) => {
                            const n = new Set(s);
                            if (n.has(c.id)) n.delete(c.id);
                            else n.add(c.id);
                            return n;
                          })
                        }
                        className="h-4 w-4 accent-blue-800"
                      />
                      <span className="flex-1 text-blue-950">{c.nombre}</span>
                      <span className={`text-[11px] font-semibold ${c.vino ? "text-emerald-700" : "text-gold-700"}`}>{c.vino ? "Vino" : "Faltó"}</span>
                    </label>
                  ))}
                </div>
                <button onClick={agregar} disabled={agregando.size === 0} className="btn-primario mt-3 !py-2">
                  Agregar {agregando.size || ""}
                </button>
              </>
            )}
          </section>
          <section className="tarjeta p-5">
            <h2 className="font-heading font-bold text-blue-900">Mensaje para ellos</h2>
            <p className="text-sm text-slate-600">Lo ven al empezar y en «Mensaje del profe». Pon aquí la fecha límite y tu correo para compartir en Drive.</p>
            <textarea
              value={mensaje ?? a.mensaje ?? ""}
              onChange={(e) => setMensaje(e.target.value)}
              rows={4}
              className="mt-3 block w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm"
              placeholder="Ej.: Tienes hasta el sábado. Mi correo es …"
            />
            <button onClick={guardarMensaje} disabled={mensaje === null} className="btn-primario mt-3 !py-2">
              Guardar mensaje
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}

function Cifra({ valor, texto, color }: { valor: number; texto: string; color: string }) {
  return (
    <div className="tarjeta-sm px-4 py-3 text-center">
      <p className={`font-heading text-3xl font-extrabold ${color}`}>{valor}</p>
      <p className="text-sm text-slate-600">{texto}</p>
    </div>
  );
}
