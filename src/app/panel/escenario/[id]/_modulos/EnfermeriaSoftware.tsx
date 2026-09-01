"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type PacienteEnfermeria = {
  nombre: string;
  edad: number;
  alergias: string[];
  antecedentes: string | null;
  habitacion: string | null;
};

type Intento = {
  id: string;
  estado: "EN_PROGRESO" | "COMPLETADO" | "PERDIDO";
  modo: "FACIL" | "DIFICIL";
  vidas: number;
  puntajeFinal: number | null;
  escenario: {
    titulo: string;
    descripcion: string;
    enfermeria: { paciente: PacienteEnfermeria; contexto: string | null } | null;
  };
  intentoTurno: { id: string; indice: number; total: number; vidas: number; titulo: string } | null;
};

type DetallePaso = { descripcion: string; obligatorio: boolean; cumplido: boolean };
type Progreso = { completados: number; total: number };

const CORAZON_LLENO = "❤️";
const CORAZON_VACIO = "🖤";
const VIAS = ["Oral", "Intravenosa", "Intramuscular", "Subcutánea"];

/**
 * "Software simulado" del módulo Enfermería: historia clínica / registro de administración
 * (MAR) — verificar ficha, orden médica y alergias antes de registrar la administración de
 * un medicamento. Usa el mismo motor de checklist/vidas/calificación que Farmacia
 * (endpoints genéricos /api/intentos/[id]/acciones y /finalizar).
 */
export default function EnfermeriaSoftware({ intentoId }: { intentoId: string }) {
  const router = useRouter();
  const [intento, setIntento] = useState<Intento | null>(null);
  const [fichaVista, setFichaVista] = useState(false);
  const [ordenVerificada, setOrdenVerificada] = useState(false);
  const [alergiaVerificada, setAlergiaVerificada] = useState(false);
  const [medicamento, setMedicamento] = useState("");
  const [dosis, setDosis] = useState("");
  const [via, setVia] = useState(VIAS[0]);
  const [alertaError, setAlertaError] = useState<string[] | null>(null);
  const [resultadoFinal, setResultadoFinal] = useState<{ puntajeFinal: number; detallePasos: DetallePaso[] } | null>(
    null
  );
  const [avanzando, setAvanzando] = useState(false);
  const [turnoTerminado, setTurnoTerminado] = useState<{ puntajeFinal: number } | null>(null);
  const [vidas, setVidas] = useState(3);
  const [progreso, setProgreso] = useState<Progreso>({ completados: 0, total: 0 });
  const [precision, setPrecision] = useState(100);
  const [perdido, setPerdido] = useState(false);

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
  }, [intentoId, router]);

  useEffect(() => {
    cargar();
  }, [cargar]);

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
      setAlertaError(data.error.peligros?.length ? data.error.peligros : ["Ese clic no era necesario para este caso."]);
      setTimeout(() => setAlertaError(null), 6000);
    }
    if (data.estado === "PERDIDO") setPerdido(true);
    return data;
  }

  async function verFicha() {
    setFichaVista(true);
    await registrarAccion("VER_FICHA_PACIENTE");
  }

  async function verificarOrden() {
    setOrdenVerificada(true);
    await registrarAccion("VERIFICAR_ORDEN_MEDICA");
  }

  async function verificarAlergia() {
    setAlergiaVerificada(true);
    await registrarAccion("VERIFICAR_ALERGIA");
  }

  async function registrarAdministracion() {
    const data = await registrarAccion("REGISTRAR_ADMINISTRACION", { medicamento, dosis, via });
    if (data.estado !== "PERDIDO") await finalizar("ADMINISTRAR_CORRECTO");
  }

  async function rechazarAdministracion() {
    const data = await registrarAccion("RECHAZAR_ADMINISTRACION", { medicamento, dosis, via });
    if (data.estado !== "PERDIDO") await finalizar("NO_ADMINISTRAR_CORRECTO");
  }

  async function escalarASupervisor() {
    const data = await registrarAccion("ESCALAR_A_SUPERVISOR");
    if (data.estado !== "PERDIDO") await finalizar("NO_ADMINISTRAR_CORRECTO");
  }

  async function finalizar(resultado: "ADMINISTRAR_CORRECTO" | "NO_ADMINISTRAR_CORRECTO") {
    const res = await fetch(`/api/intentos/${intentoId}/finalizar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resultado }),
    });
    const data = await res.json();
    setResultadoFinal({ puntajeFinal: data.intento.puntajeFinal, detallePasos: data.detallePasos });
  }

  async function avanzarTurno(intentoTurnoId: string) {
    setAvanzando(true);
    const res = await fetch(`/api/turnos/intento/${intentoTurnoId}/siguiente`, { method: "POST" });
    const data = await res.json();
    setAvanzando(false);
    if (data.terminado) {
      setTurnoTerminado({ puntajeFinal: data.puntajeFinal });
    } else if (data.intentoId) {
      router.push(`/panel/escenario/${data.intentoId}`);
    }
  }

  if (!intento) return <div className="p-8 text-slate-500 text-sm">Cargando...</div>;

  const enTurno = intento.intentoTurno;
  const paciente = intento.escenario.enfermeria?.paciente;

  if (turnoTerminado || perdido || intento.estado === "PERDIDO" || resultadoFinal || intento.estado === "COMPLETADO") {
    const terminado = turnoTerminado
      ? { titulo: "¡Turno completo!", puntaje: turnoTerminado.puntajeFinal, esVictoria: true }
      : perdido || intento.estado === "PERDIDO"
        ? { titulo: "Te quedaste sin corazones", puntaje: null, esVictoria: false }
        : { titulo: "Resultado", puntaje: resultadoFinal?.puntajeFinal ?? intento.puntajeFinal ?? 0, esVictoria: true };

    return (
      <div className="min-h-screen bg-[var(--background)]">
        <header className="px-6 py-4 bg-emerald-800">
          <div className="mx-auto max-w-2xl flex items-center gap-3">
            <Image src="/funca-logo.png" alt="FUNCA" width={100} height={50} className="h-8 w-auto bg-white rounded px-1.5 py-1" />
            <span className="font-heading text-sm font-semibold text-white">Enfermería</span>
          </div>
        </header>
        <div className="px-6 py-10">
          <div className="mx-auto max-w-2xl rounded-xl bg-white border border-slate-200 p-8 shadow-sm text-center">
            <h1 className="font-heading text-xl font-bold text-emerald-800 mb-2">{terminado.titulo}</h1>
            {terminado.puntaje !== null && (
              <p className="text-4xl font-heading font-extrabold mb-4 text-emerald-700">{terminado.puntaje}/100</p>
            )}
            {resultadoFinal && (
              <ul className="flex flex-col gap-2 mb-6 text-left">
                {resultadoFinal.detallePasos.map((p, i) => (
                  <li key={i} className={`text-sm flex gap-2 ${p.cumplido ? "text-emerald-700" : "text-red-600"}`}>
                    <span>{p.cumplido ? "✓" : "✗"}</span>
                    <span>{p.descripcion}</span>
                  </li>
                ))}
              </ul>
            )}
            {enTurno && terminado.esVictoria && !turnoTerminado ? (
              <button
                onClick={() => avanzarTurno(enTurno.id)}
                disabled={avanzando}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors disabled:opacity-50"
              >
                {avanzando ? "Cargando..." : "Siguiente caso"}
              </button>
            ) : (
              <button
                onClick={() => router.push("/panel")}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors"
              >
                Volver a mis casos
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="px-6 py-4 bg-emerald-800">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/funca-logo.png" alt="FUNCA" width={100} height={50} className="h-8 w-auto bg-white rounded px-1.5 py-1" />
            <span className="font-heading text-sm font-semibold text-white">Enfermería · Registro de administración</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-lg" title={`${vidas} de 3 corazones`}>
              {CORAZON_LLENO.repeat(vidas)}
              {CORAZON_VACIO.repeat(3 - vidas)}
            </span>
            <span className="text-xs text-white/90 bg-white/10 px-2 py-1 rounded">
              {intento.modo === "DIFICIL" ? "🔥 Difícil" : "🙂 Fácil"}
            </span>
            <button onClick={() => router.push("/panel")} className="text-sm text-white/80 hover:text-white transition-colors">
              Salir del caso
            </button>
          </div>
        </div>
      </header>

      {alertaError && (
        <div className="bg-red-600 text-white px-6 py-3 animate-pulse">
          <div className="mx-auto max-w-5xl text-sm">
            <p className="font-semibold mb-1">⚠️ Perdiste un corazón</p>
            <ul className="list-disc list-inside">
              {alertaError.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="px-6 py-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm mb-4 border-l-4 border-l-emerald-500">
            <h1 className="font-heading font-semibold text-emerald-900">{intento.escenario.titulo}</h1>
            <p className="text-sm text-slate-600 mt-1 whitespace-pre-line">{intento.escenario.descripcion}</p>
          </div>

          <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm mb-6">
            <div className="flex items-center justify-between mb-2 gap-4">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Progreso de este caso</span>
              <span className="text-xs font-semibold text-slate-500">Precisión: {precision}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-700 transition-all"
                style={{ width: `${progreso.total > 0 ? Math.round((progreso.completados / progreso.total) * 100) : 0}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-1 flex flex-col gap-4">
              <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
                <h2 className="text-sm font-heading font-semibold text-emerald-900 mb-2">Ficha del paciente</h2>
                {!fichaVista && (
                  <button
                    onClick={verFicha}
                    className="w-full rounded-lg bg-emerald-700 py-2 text-sm font-medium text-white hover:bg-emerald-800 transition-colors"
                  >
                    Consultar ficha
                  </button>
                )}
                {fichaVista && paciente && (
                  <div className="text-sm text-slate-700 flex flex-col gap-1 bg-slate-50 rounded-lg p-2">
                    <p><span className="font-medium">Nombre:</span> {paciente.nombre}</p>
                    <p><span className="font-medium">Habitación:</span> {paciente.habitacion ?? "—"}</p>
                    <p><span className="font-medium">Edad:</span> {paciente.edad}</p>
                    <p><span className="font-medium">Alergias:</span> {paciente.alergias.join(", ") || "Ninguna"}</p>
                    <p><span className="font-medium">Antecedentes:</span> {paciente.antecedentes ?? "Ninguno"}</p>
                  </div>
                )}
              </div>

              <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
                <h2 className="text-sm font-heading font-semibold text-emerald-900 mb-2">Orden médica</h2>
                {!ordenVerificada && (
                  <button
                    onClick={verificarOrden}
                    className="w-full rounded-lg border border-slate-300 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Verificar orden médica
                  </button>
                )}
                {ordenVerificada && (
                  <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-2">
                    Orden verificada en el sistema. Compárala con lo que vas a registrar antes de administrar.
                  </p>
                )}
              </div>

              <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
                <h2 className="text-sm font-heading font-semibold text-emerald-900 mb-2">Alergias</h2>
                {!alergiaVerificada && (
                  <button
                    onClick={verificarAlergia}
                    className="w-full rounded-lg border border-slate-300 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Verificar alergias registradas
                  </button>
                )}
                {alergiaVerificada && (
                  <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-2">
                    Alergias: {paciente?.alergias.join(", ") || "Ninguna registrada"}
                  </p>
                )}
              </div>
            </div>

            <div className="col-span-1">
              <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm flex flex-col gap-3">
                <h2 className="text-sm font-heading font-semibold text-emerald-900">Registrar administración</h2>
                <input
                  value={medicamento}
                  onChange={(e) => setMedicamento(e.target.value)}
                  placeholder="Medicamento a administrar"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <input
                  value={dosis}
                  onChange={(e) => setDosis(e.target.value)}
                  placeholder="Dosis (ej: 500mg)"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <select
                  value={via}
                  onChange={(e) => setVia(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  {VIAS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>

                <button
                  onClick={registrarAdministracion}
                  disabled={!medicamento || !dosis}
                  className="rounded-lg bg-emerald-700 py-2 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors disabled:opacity-50"
                >
                  Registrar administración
                </button>
                <button
                  onClick={rechazarAdministracion}
                  className="rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
                >
                  No administrar (rechazar)
                </button>
                <button
                  onClick={escalarASupervisor}
                  className="rounded-lg border border-gold-500 text-gold-700 py-2 text-sm font-semibold hover:bg-gold-50 transition-colors"
                >
                  Escalar al médico / supervisor
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
