"use client";

import { useCallback, useEffect, useState } from "react";
import { avanceEstudiante, type LineaGuion } from "@/lib/modulos/odontologia/dictado";
import type { Denticion, Marca } from "@/lib/modulos/odontologia/odontograma";
import Odontograma from "@/components/modulos/odontologia/Odontograma";

type Estado = {
  secciones: "ODONTOGRAMA" | "COMPLETA";
  pausado: boolean;
  paciente: { nombres: string; primerApellido: string; segundoApellido: string | null; tipoDocumento: string; documento: string; sexo: string; fechaNacimiento: string };
  denticion: Denticion;
  esperado: { odontograma: Marca[] };
  guion: LineaGuion[];
  estudiantes: { participanteId: string; nombre: string; conectado: boolean; ultimoCambio: string | null; marcas: Marca[] }[];
};

const edad = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / (365.25 * 24 * 3600 * 1000));

function hace(iso: string | null) {
  if (!iso) return "—";
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  return s < 60 ? `hace ${s} s` : `hace ${Math.round(s / 60)} min`;
}

/**
 * Lo que tiene el docente mientras dicta: el guion para leer (marca cada línea al dictarla),
 * cómo va cada estudiante con lo ya dictado, pausar y terminar. Antes de iniciar sirve de
 * vista previa del caso. Las líneas marcadas se recuerdan en este navegador.
 */
export default function ControlDictado({
  simulacionId,
  enCurso,
  onTerminado,
}: {
  simulacionId: string;
  enCurso: boolean;
  onTerminado: () => void;
}) {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [dictadas, setDictadas] = useState<Set<string>>(new Set());
  const [verRespuesta, setVerRespuesta] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clave = `dictado-lineas-${simulacionId}`;

  const cargar = useCallback(async () => {
    const res = await fetch(`/api/simulaciones/${simulacionId}/dictado`);
    if (res.ok) setEstado(await res.json());
  }, [simulacionId]);

  useEffect(() => {
    try {
      const guardadas = JSON.parse(localStorage.getItem(clave) ?? "[]");
      if (Array.isArray(guardadas)) setDictadas(new Set(guardadas));
    } catch {
      // sin almacenamiento: se empieza sin líneas marcadas
    }
  }, [clave]);

  useEffect(() => {
    cargar();
    if (!enCurso) return;
    const t = setInterval(cargar, 4000);
    return () => clearInterval(t);
  }, [cargar, enCurso]);

  function alternar(id: string) {
    setDictadas((antes) => {
      const nuevo = new Set(antes);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      try {
        localStorage.setItem(clave, JSON.stringify([...nuevo]));
      } catch {
        // no pasa nada si no se puede recordar
      }
      return nuevo;
    });
  }

  async function pausar(pausado: boolean) {
    setTrabajando(true);
    await fetch(`/api/simulaciones/${simulacionId}/dictado`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pausado }),
    });
    setTrabajando(false);
    cargar();
  }

  async function terminar() {
    setTrabajando(true);
    setError(null);
    const res = await fetch(`/api/simulaciones/${simulacionId}/dictado/terminar`, { method: "POST" });
    setTrabajando(false);
    setConfirmando(false);
    if (!res.ok) {
      setError((await res.json()).error ?? "No se pudo terminar el dictado");
      return;
    }
    try {
      localStorage.removeItem(clave);
    } catch {
      // nada
    }
    onTerminado();
  }

  if (!estado) return <p className="text-sm text-slate-500">Cargando el dictado...</p>;

  const p = estado.paciente;
  const siguiente = estado.guion.find((l) => !dictadas.has(l.id));
  const conectados = estado.estudiantes.filter((e) => e.conectado).length;

  return (
    <section className="flex flex-col gap-4">
      {enCurso && (
        <div className="flex flex-wrap items-center gap-3 tarjeta-sm p-3">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${estado.pausado ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-700"}`}>
            {estado.pausado ? "En pausa" : "Dictando"}
          </span>
          <span className="text-sm text-slate-600">
            {conectados} de {estado.estudiantes.length} estudiantes conectados · {dictadas.size} de {estado.guion.length} líneas dictadas
          </span>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => pausar(!estado.pausado)}
              disabled={trabajando}
              className="rounded-lg border border-amber-500 px-3 py-1.5 text-sm font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-40"
            >
              {estado.pausado ? "Reanudar" : "Pausar"}
            </button>
            <button
              onClick={() => setConfirmando(true)}
              disabled={trabajando}
              className="rounded-lg bg-blue-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-40"
            >
              Terminar dictado
            </button>
          </div>
        </div>
      )}

      {confirmando && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
          <p className="font-semibold">¿Terminar el dictado?</p>
          <p className="text-xs mt-1">Las historias se entregan como estén en este momento y se califica a cada estudiante. Queda el reporte con el mapa por diente.</p>
          <div className="flex gap-2 mt-3">
            <button onClick={terminar} disabled={trabajando} className="rounded-full font-heading bg-blue-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-900 disabled:opacity-40">
              {trabajando ? "Calificando..." : "Sí, terminar y calificar"}
            </button>
            <button onClick={() => setConfirmando(false)} className="rounded-xl border border-blue-200 px-3 py-1.5 text-xs text-slate-600">
              Seguir dictando
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="tarjeta-sm p-4">
          <h2 className="font-heading font-semibold text-blue-900">Guion para leer</h2>
          <p className="text-xs text-slate-500 mb-3">
            {enCurso ? "Marca cada línea cuando la dictes: así ves quién va al día." : "Vista previa: así se verá mientras dictas."}{" "}
            {estado.secciones === "COMPLETA" ? "Historia completa." : "Solo odontograma."}
          </p>
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 mb-3">
            <b>Paciente:</b> {p.nombres} {p.primerApellido} {p.segundoApellido ?? ""} · {p.tipoDocumento} {p.documento} · {edad(p.fechaNacimiento)} años ·{" "}
            {p.sexo === "F" ? "femenino" : "masculino"}
            <span className="block text-xs text-slate-500">Los estudiantes ya lo tienen cargado: no hace falta dictarlo.</span>
          </div>
          <ol className="flex flex-col gap-1.5">
            {estado.guion.map((l, i) => {
              const hecha = dictadas.has(l.id);
              const esSiguiente = enCurso && siguiente?.id === l.id;
              const nuevaSeccion = i === 0 || estado.guion[i - 1].seccion !== l.seccion;
              return (
                <li key={l.id}>
                  {nuevaSeccion && <p className="mt-2 mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{l.seccion}</p>}
                  <label
                    className={`flex gap-3 rounded-lg border px-3 py-2 ${
                      esSiguiente ? "border-blue-600 bg-blue-50" : hecha ? "border-slate-200 bg-slate-50 text-slate-400" : "border-slate-200"
                    } ${enCurso ? "cursor-pointer" : ""}`}
                  >
                    {enCurso && <input type="checkbox" checked={hecha} onChange={() => alternar(l.id)} className="mt-1" />}
                    <span className={`text-base ${hecha ? "line-through" : "text-slate-800"}`}>{l.texto}</span>
                  </label>
                </li>
              );
            })}
          </ol>
          <button onClick={() => setVerRespuesta((v) => !v)} className="mt-3 text-xs font-semibold text-blue-700 hover:underline">
            {verRespuesta ? "Ocultar el odontograma del caso" : "Ver el odontograma del caso (no lo proyectes)"}
          </button>
          {verRespuesta && (
            <div className="mt-2">
              <Odontograma denticion={estado.denticion} marcas={estado.esperado.odontograma} mostrarResumen={false} />
            </div>
          )}
        </div>

        {enCurso && (
          <aside className="tarjeta-sm p-4 self-start">
            <h2 className="font-heading font-semibold text-blue-900">Cómo va cada uno</h2>
            <p className="text-xs text-slate-500 mb-2">Marcas correctas de lo ya dictado. Se actualiza solo.</p>
            <ul className="flex flex-col gap-2">
              {estado.estudiantes.map((e) => {
                const a = avanceEstudiante(estado.guion, dictadas, e.marcas);
                const pct = a.esperadas ? Math.round((a.bien / a.esperadas) * 100) : null;
                return (
                  <li key={e.participanteId} className="text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className={e.conectado ? "text-slate-800" : "text-slate-400"}>{e.nombre}</span>
                      <span className="text-xs tabular-nums text-slate-600">{e.conectado ? (a.esperadas ? `${a.bien}/${a.esperadas}` : "—") : "no ha entrado"}</span>
                    </div>
                    {e.conectado && (
                      <>
                        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mt-0.5">
                          <div
                            className={`h-full rounded-full ${pct === null ? "" : pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                            style={{ width: `${pct ?? 0}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-slate-400">último cambio {hace(e.ultimoCambio)}</p>
                      </>
                    )}
                  </li>
                );
              })}
              {estado.estudiantes.length === 0 && <li className="text-xs text-slate-500">Nadie ha entrado todavía.</li>}
            </ul>
          </aside>
        )}
      </div>
    </section>
  );
}
