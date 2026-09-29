"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { historiaVacia, REMISIONES, type HistoriaOdontologica } from "@/lib/modulos/odontologia/historia";
import type { Denticion } from "@/lib/modulos/odontologia/odontograma";
import type { InformacionConsultorio } from "@/lib/modulos/odontologia/consultorio";
import {
  SeccionAlerta,
  SeccionAnamnesis,
  SeccionDiagnosticoPlan,
  SeccionEvolucion,
  SeccionExamenes,
  SeccionIdentificacion,
  SeccionOdontograma,
  SeccionPlacaHigiene,
  type PacienteOdontologia,
} from "@/components/modulos/odontologia/SeccionesHistoria";
import RevisionOdontograma, { type RevisionOdontologia } from "@/components/modulos/odontologia/RevisionOdontograma";

type Intento = {
  id: string;
  estado: "EN_PROGRESO" | "COMPLETADO" | "PERDIDO";
  modo: "FACIL" | "DIFICIL";
  vidas: number;
  puntajeFinal: number | null;
  escenario: {
    titulo: string;
    descripcion: string;
    odontologia: { paciente: PacienteOdontologia; denticion: Denticion } | null;
  };
  intentoTurno: { id: string; indice: number; total: number; vidas: number; titulo: string } | null;
};

type DetallePaso = { descripcion: string; obligatorio: boolean; cumplido: boolean };
type Progreso = { completados: number; total: number };
type Resultado = { puntajeFinal: number; detallePasos: DetallePaso[]; revision: RevisionOdontologia | null };

const CORAZON_LLENO = "❤️";
const CORAZON_VACIO = "🖤";

const PESTANAS = [
  { id: "paciente", etiqueta: "Paciente" },
  { id: "anamnesis", etiqueta: "Anamnesis" },
  { id: "examenes", etiqueta: "Exámenes" },
  { id: "odontograma", etiqueta: "Odontograma" },
  { id: "placa", etiqueta: "Placa e higiene" },
  { id: "diagnostico", etiqueta: "Diagnóstico y plan" },
  { id: "evolucion", etiqueta: "Evolución" },
] as const;
type Pestana = (typeof PESTANAS)[number]["id"];

/**
 * "Software simulado" del módulo Odontología: la historia clínica odontológica FUNCA con
 * su odontograma. A la izquierda, el consultorio (interrogar, examinar, revelador,
 * radiografía) va revelando la información del caso; a la derecha, el estudiante diligencia
 * la historia. Al cerrar la historia se elige la remisión y el motor califica.
 */
export default function OdontologiaSoftware({ intentoId }: { intentoId: string }) {
  const router = useRouter();
  const [intento, setIntento] = useState<Intento | null>(null);
  const [historia, setHistoria] = useState<HistoriaOdontologica>(historiaVacia);
  const [sinGuardar, setSinGuardar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [info, setInfo] = useState<InformacionConsultorio>({ anamnesis: null, examen: null, placa: null, radiografia: null });
  const [pestana, setPestana] = useState<Pestana>("paciente");
  const [tipoRx, setTipoRx] = useState<"PERIAPICAL" | "PANORAMICA">("PERIAPICAL");
  const [cerrando, setCerrando] = useState(false);
  const [alertaError, setAlertaError] = useState<string[] | null>(null);
  const [peligrosCierre, setPeligrosCierre] = useState<string[]>([]);
  const [resultadoFinal, setResultadoFinal] = useState<Resultado | null>(null);
  const [avanzando, setAvanzando] = useState(false);
  const [turnoTerminado, setTurnoTerminado] = useState<{ puntajeFinal: number } | null>(null);
  const [vidas, setVidas] = useState(3);
  const [progreso, setProgreso] = useState<Progreso>({ completados: 0, total: 0 });
  const [precision, setPrecision] = useState(100);
  const [perdido, setPerdido] = useState(false);

  const cargarConsultorio = useCallback(async () => {
    const res = await fetch(`/api/modulos/odontologia/intentos/${intentoId}/consultorio`);
    if (!res.ok) return null;
    const data = await res.json();
    setInfo(data.informacion);
    return data as { historia: HistoriaOdontologica | null };
  }, [intentoId]);

  const cargar = useCallback(async () => {
    const res = await fetch(`/api/intentos/${intentoId}`);
    if (res.status === 401) {
      router.push("/");
      return;
    }
    const data = await res.json();
    setIntento(data.intento);
    setVidas(data.intento.vidas);
    setProgreso(data.progreso ?? { completados: 0, total: 0 });
    setPrecision(data.precision ?? 100);
    if (data.intento.estado === "PERDIDO") setPerdido(true);
    if (data.intento.estado === "COMPLETADO" && data.detallePasos) {
      setResultadoFinal({
        puntajeFinal: data.intento.puntajeFinal ?? 0,
        detallePasos: data.detallePasos,
        revision: data.revisionOdontologia ?? null,
      });
    }
    if (data.intento.estado === "EN_PROGRESO") {
      const consultorio = await cargarConsultorio();
      if (consultorio?.historia) setHistoria(consultorio.historia);
    }
  }, [intentoId, router, cargarConsultorio]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Avisar antes de salir con cambios sin guardar.
  useEffect(() => {
    if (!sinGuardar) return;
    const aviso = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [sinGuardar]);

  async function registrarAccion(tipo: string, payload?: Record<string, unknown>) {
    const res = await fetch(`/api/intentos/${intentoId}/acciones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo, payload }),
    });
    const data = await res.json();
    if (typeof data.vidas === "number") setVidas(data.vidas);
    if (data.progreso) setProgreso(data.progreso);
    if (typeof data.precision === "number") setPrecision(data.precision);
    if (data.error) {
      setAlertaError(data.error.peligros?.length ? data.error.peligros : ["Ese procedimiento no era necesario para este caso."]);
      setTimeout(() => setAlertaError(null), 7000);
    }
    if (data.estado === "PERDIDO") setPerdido(true);
    return data;
  }

  async function revelar(tipo: string, payload?: Record<string, unknown>) {
    await registrarAccion(tipo, payload);
    await cargarConsultorio();
  }

  function cambiar(cambio: Partial<HistoriaOdontologica>) {
    setHistoria((h) => ({ ...h, ...cambio }));
    setSinGuardar(true);
  }

  async function guardar() {
    setGuardando(true);
    await registrarAccion("GUARDAR_HISTORIA", { historia });
    setGuardando(false);
    setSinGuardar(false);
  }

  async function cerrarHistoria(remision: string) {
    setCerrando(false);
    const data = await registrarAccion("CERRAR_HISTORIA", { historia, remision });
    setSinGuardar(false);
    if (data.error?.peligros?.length) setPeligrosCierre(data.error.peligros);
    if (data.estado === "PERDIDO") return;
    const res = await fetch(`/api/intentos/${intentoId}/finalizar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resultado: remision }),
    });
    const fin = await res.json();
    setResultadoFinal({
      puntajeFinal: fin.intento.puntajeFinal,
      detallePasos: fin.detallePasos,
      revision: fin.revisionOdontologia ?? null,
    });
  }

  async function avanzarTurno(intentoTurnoId: string) {
    setAvanzando(true);
    const res = await fetch(`/api/turnos/intento/${intentoTurnoId}/siguiente`, { method: "POST" });
    const data = await res.json();
    setAvanzando(false);
    if (data.terminado) setTurnoTerminado({ puntajeFinal: data.puntajeFinal });
    else if (data.intentoId) router.push(`/panel/escenario/${data.intentoId}`);
  }

  if (!intento) return <div className="p-8 text-slate-500 text-sm">Cargando...</div>;

  const enTurno = intento.intentoTurno;
  const odonto = intento.escenario.odontologia;

  const encabezado = (subtitulo: string, ancho: string) => (
    <header className="px-6 py-4 bg-cyan-700">
      <div className={`mx-auto ${ancho} flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <Image src="/funca-logo.png" alt="FUNCA" width={100} height={50} className="h-8 w-auto bg-white rounded px-1.5 py-1" />
          <span className="font-heading text-sm font-semibold text-white">{subtitulo}</span>
        </div>
        {intento.estado === "EN_PROGRESO" && !resultadoFinal && !perdido && (
          <div className="flex items-center gap-4">
            <span className="text-lg" title={`${vidas} de 3 corazones`}>
              {CORAZON_LLENO.repeat(vidas)}
              {CORAZON_VACIO.repeat(Math.max(0, 3 - vidas))}
            </span>
            <span className="text-xs text-white/90 bg-white/10 px-2 py-1 rounded">{intento.modo === "DIFICIL" ? "🔥 Difícil" : "🙂 Fácil"}</span>
            <button onClick={() => router.push("/panel")} className="text-sm text-white/80 hover:text-white transition-colors">
              Salir del caso
            </button>
          </div>
        )}
      </div>
    </header>
  );

  // ---------- Pantalla de resultado ----------
  if (turnoTerminado || perdido || intento.estado === "PERDIDO" || resultadoFinal || intento.estado === "COMPLETADO") {
    const terminado = turnoTerminado
      ? { titulo: "¡Turno completo!", puntaje: turnoTerminado.puntajeFinal, esVictoria: true }
      : perdido || intento.estado === "PERDIDO"
        ? { titulo: "Te quedaste sin corazones", puntaje: null, esVictoria: false }
        : { titulo: "Resultado de la historia clínica", puntaje: resultadoFinal?.puntajeFinal ?? intento.puntajeFinal ?? 0, esVictoria: true };
    const lineasProceso = resultadoFinal?.detallePasos.filter((p) => !p.descripcion.startsWith("Odontograma:")) ?? [];

    return (
      <div className="min-h-screen bg-[var(--background)]">
        {encabezado("Odontología", "max-w-6xl")}
        <div className="px-6 py-8">
          <div className="mx-auto max-w-6xl flex flex-col gap-4">
            <div className="rounded-xl bg-white border border-slate-200 p-6 shadow-sm text-center">
              <h1 className="font-heading text-xl font-bold text-cyan-800 mb-2">{terminado.titulo}</h1>
              {terminado.puntaje !== null && <p className="text-4xl font-heading font-extrabold mb-2 text-cyan-700">{terminado.puntaje}/100</p>}
              {(peligrosCierre.length > 0 || (terminado.puntaje === null && alertaError)) && (
                <div className="mx-auto max-w-2xl rounded-lg bg-red-50 border border-red-200 p-3 text-left text-sm text-red-700 mb-3">
                  <p className="font-semibold mb-1">⚠️ Perdiste un corazón al cerrar la historia</p>
                  <ul className="list-disc list-inside">
                    {(peligrosCierre.length ? peligrosCierre : (alertaError ?? [])).map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}
              {enTurno && terminado.esVictoria && !turnoTerminado ? (
                <button
                  onClick={() => avanzarTurno(enTurno.id)}
                  disabled={avanzando}
                  className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800 transition-colors disabled:opacity-50"
                >
                  {avanzando ? "Cargando..." : "Siguiente caso"}
                </button>
              ) : (
                <button
                  onClick={() => router.push("/panel")}
                  className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800 transition-colors"
                >
                  Volver a mis casos
                </button>
              )}
            </div>

            {resultadoFinal?.revision && (
              <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
                <RevisionOdontograma revision={resultadoFinal.revision} />
              </div>
            )}

            {lineasProceso.length > 0 && (
              <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
                <h3 className="text-sm font-heading font-semibold text-cyan-900 mb-2">Resto de la historia</h3>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                  {lineasProceso.map((p, i) => (
                    <li key={i} className={`text-sm flex gap-2 ${p.cumplido ? "text-cyan-700" : "text-red-600"}`}>
                      <span>{p.cumplido ? "✓" : "✗"}</span>
                      <span>{p.descripcion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!odonto) return <div className="p-8 text-slate-500 text-sm">Este escenario no tiene datos de odontología.</div>;

  const botonConsultorio = (hecho: boolean) =>
    `w-full rounded-lg py-2 text-sm font-medium transition-colors ${
      hecho ? "border border-cyan-200 bg-cyan-50 text-cyan-800" : "bg-cyan-700 text-white hover:bg-cyan-800"
    }`;

  // ---------- Pantalla de trabajo ----------
  return (
    <div className="min-h-screen bg-[var(--background)]">
      {encabezado("Odontología · Historia clínica odontológica", "max-w-[1400px]")}

      {alertaError && (
        <div className="bg-red-600 text-white px-6 py-3 animate-pulse">
          <div className="mx-auto max-w-[1400px] text-sm">
            <p className="font-semibold mb-1">⚠️ Perdiste un corazón</p>
            <ul className="list-disc list-inside">
              {alertaError.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="px-4 lg:px-6 py-6">
        <div className="mx-auto max-w-[1400px]">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-4 mb-4">
            <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm border-l-4 border-l-cyan-500">
              <h1 className="font-heading font-semibold text-cyan-900">{intento.escenario.titulo}</h1>
              <p className="text-sm text-slate-600 mt-1 whitespace-pre-line">{intento.escenario.descripcion}</p>
            </div>
            <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2 gap-4">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Progreso</span>
                <span className="text-xs font-semibold text-slate-500">Precisión: {precision}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-cyan-700 transition-all"
                  style={{ width: `${progreso.total > 0 ? Math.round((progreso.completados / progreso.total) * 100) : 0}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 items-start">
            {/* Consultorio: lo que el estudiante va descubriendo */}
            <aside className="flex flex-col gap-3 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
              <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm flex flex-col gap-2">
                <h2 className="text-sm font-heading font-semibold text-cyan-900">Consultorio</h2>
                <button onClick={() => revelar("INTERROGAR_PACIENTE")} disabled={Boolean(info.anamnesis)} className={botonConsultorio(Boolean(info.anamnesis))}>
                  {info.anamnesis ? "✓ Paciente interrogado" : "Interrogar al paciente"}
                </button>
                <button onClick={() => revelar("EXAMINAR_PACIENTE")} disabled={Boolean(info.examen)} className={botonConsultorio(Boolean(info.examen))}>
                  {info.examen ? "✓ Examen clínico realizado" : "Examen clínico"}
                </button>
                <button
                  onClick={() => revelar("APLICAR_REVELADOR_PLACA")}
                  disabled={Boolean(info.placa)}
                  className={botonConsultorio(Boolean(info.placa))}
                >
                  {info.placa ? "✓ Revelador aplicado" : "Aplicar revelador de placa"}
                </button>
                <div className="flex gap-2">
                  <select
                    value={tipoRx}
                    onChange={(e) => setTipoRx(e.target.value as "PERIAPICAL" | "PANORAMICA")}
                    className="rounded-lg border border-slate-300 px-2 text-sm"
                  >
                    <option value="PERIAPICAL">Periapical</option>
                    <option value="PANORAMICA">Panorámica</option>
                  </select>
                  <button
                    onClick={() => revelar("SOLICITAR_RADIOGRAFIA", { tipo: tipoRx })}
                    className="flex-1 rounded-lg border border-cyan-600 py-2 text-sm font-medium text-cyan-700 hover:bg-cyan-50 transition-colors"
                  >
                    Tomar radiografía
                  </button>
                </div>
                {intento.modo === "DIFICIL" && (
                  <p className="text-[11px] text-slate-500">En modo difícil, una radiografía innecesaria cuesta un corazón.</p>
                )}
              </div>

              {info.anamnesis && (
                <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm text-sm text-slate-700">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Lo que cuenta el paciente</h3>
                  <p className="italic text-cyan-900 mb-2">“{info.anamnesis.motivoConsulta}”</p>
                  <p className="whitespace-pre-line">{info.anamnesis.relato}</p>
                </div>
              )}
              {info.examen && (
                <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm text-sm text-slate-700">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Examen clínico</h3>
                  {info.examen.relato && <p className="whitespace-pre-line mb-2">{info.examen.relato}</p>}
                  {info.examen.hallazgosDentales.length > 0 ? (
                    <ul className="list-disc pl-4 flex flex-col gap-1">
                      {info.examen.hallazgosDentales.map((l) => (
                        <li key={l}>{l}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-500">Sin hallazgos dentales al examen clínico.</p>
                  )}
                </div>
              )}
              {info.placa && (
                <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm text-sm text-slate-700">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Revelador de placa</h3>
                  {info.placa.tenidas.length ? (
                    <>
                      <p className="mb-1">Superficies teñidas:</p>
                      <ul className="list-disc pl-4">
                        {info.placa.tenidas.map((t) => (
                          <li key={t}>{t}</li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p>El revelador no tiñó ninguna superficie.</p>
                  )}
                </div>
              )}
              {info.radiografia && (
                <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm text-sm text-slate-700">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    Radiografía ({info.radiografia.tipos.map((t) => t.toLowerCase()).join(", ")})
                  </h3>
                  {info.radiografia.relato && <p className="whitespace-pre-line mb-2">{info.radiografia.relato}</p>}
                  {info.radiografia.hallazgos.length > 0 ? (
                    <ul className="list-disc pl-4 flex flex-col gap-1">
                      {info.radiografia.hallazgos.map((l) => (
                        <li key={l}>{l}</li>
                      ))}
                    </ul>
                  ) : (
                    !info.radiografia.relato && <p className="text-slate-500">Sin hallazgos radiográficos relevantes.</p>
                  )}
                </div>
              )}
            </aside>

            {/* Historia clínica */}
            <main className="min-w-0 flex flex-col gap-4">
              <div className="rounded-xl bg-white border border-slate-200 p-2 shadow-sm flex flex-wrap items-center gap-1 sticky top-0 z-10">
                {PESTANAS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPestana(p.id)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      pestana === p.id ? "bg-cyan-700 text-white" : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {p.etiqueta}
                  </button>
                ))}
                <div className="ml-auto flex items-center gap-2">
                  {sinGuardar && <span className="text-xs text-amber-700">Cambios sin guardar</span>}
                  <button
                    onClick={guardar}
                    disabled={guardando || !sinGuardar}
                    className="rounded-lg border border-cyan-600 px-3 py-1.5 text-sm font-semibold text-cyan-700 hover:bg-cyan-50 disabled:opacity-50"
                  >
                    {guardando ? "Guardando..." : "Guardar"}
                  </button>
                  <button onClick={() => setCerrando(true)} className="rounded-lg bg-cyan-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-cyan-800">
                    Cerrar historia
                  </button>
                </div>
              </div>

              {pestana === "paciente" && (
                <>
                  <SeccionIdentificacion paciente={odonto.paciente} />
                  <SeccionAlerta h={historia} set={cambiar} />
                </>
              )}
              {pestana === "anamnesis" && <SeccionAnamnesis h={historia} set={cambiar} />}
              {pestana === "examenes" && <SeccionExamenes h={historia} set={cambiar} />}
              {pestana === "odontograma" && <SeccionOdontograma h={historia} set={cambiar} denticion={odonto.denticion} />}
              {pestana === "placa" && <SeccionPlacaHigiene h={historia} set={cambiar} denticion={odonto.denticion} />}
              {pestana === "diagnostico" && <SeccionDiagnosticoPlan h={historia} set={cambiar} />}
              {pestana === "evolucion" && <SeccionEvolucion h={historia} set={cambiar} />}
            </main>
          </div>
        </div>
      </div>

      {cerrando && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4" onClick={() => setCerrando(false)}>
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-heading font-semibold text-cyan-900 mb-1">Cerrar y firmar la historia</h2>
            <p className="text-sm text-slate-600 mb-4">Se guarda la historia tal como está y se califica. ¿Cuál es la conducta con este paciente?</p>
            <div className="flex flex-col gap-2">
              {REMISIONES.map((r) => (
                <button
                  key={r.codigo}
                  onClick={() => cerrarHistoria(r.codigo)}
                  className="rounded-lg border border-cyan-600 px-3 py-2 text-left text-sm font-medium text-cyan-800 hover:bg-cyan-50"
                >
                  {r.etiqueta}
                </button>
              ))}
            </div>
            <button onClick={() => setCerrando(false)} className="mt-4 text-sm text-slate-500 hover:text-slate-700">
              Seguir diligenciando
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
