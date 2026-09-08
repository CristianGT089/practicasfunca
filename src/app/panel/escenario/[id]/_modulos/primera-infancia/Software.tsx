"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { calcularEdadMeses, calcularEdadCorregidaMeses, esPrematuro } from "@/lib/modulos/primera-infancia/edad";

type RegistroCrecimiento = { id: string; fecha: string; pesoKg: number; tallaCm: number };
type Nino = {
  nombre: string;
  fechaNacimiento: string;
  semanasGestacionNacimiento: number | null;
  cuidadorNombre: string | null;
  antecedentes: string | null;
  esquemaVacunacionAlDia: boolean;
  vacunasPendientes: string[];
  registrosCrecimiento: RegistroCrecimiento[];
};
type HitoEsperado = { dominio: string; hito: string };

type Intento = {
  id: string;
  estado: "EN_PROGRESO" | "COMPLETADO" | "PERDIDO";
  modo: "FACIL" | "DIFICIL";
  vidas: number;
  puntajeFinal: number | null;
  escenario: {
    titulo: string;
    descripcion: string;
    infancia: { nino: Nino; contexto: string | null; hitosEsperados: HitoEsperado[] | null } | null;
  };
  intentoTurno: { id: string; indice: number; total: number; vidas: number; titulo: string } | null;
};

type DetallePaso = { descripcion: string; obligatorio: boolean; cumplido: boolean };
type Progreso = { completados: number; total: number };

const CORAZON_LLENO = "❤️";
const CORAZON_VACIO = "🖤";

const MOTIVOS_ALARMA = [
  { id: "sin_palabras_18m", etiqueta: "18 meses sin palabras con intención comunicativa" },
  { id: "no_camina_18m", etiqueta: "18 meses y no camina solo" },
  { id: "sin_contacto_visual", etiqueta: "Sin contacto visual sostenido" },
  { id: "sin_juego_simbolico", etiqueta: "Sin juego simbólico ni señalar para pedir" },
  { id: "curva_peso_descendente", etiqueta: "Curva de peso/talla descendente" },
  { id: "higiene_deficiente", etiqueta: "Higiene deficiente y persistente" },
  { id: "hematomas_no_justificados", etiqueta: "Hematomas sin explicación coherente" },
  { id: "miedo_excesivo_adulto", etiqueta: "Miedo excesivo ante el adulto responsable" },
  { id: "cuidador_ansioso_sin_hallazgos", etiqueta: "Cuidador ansioso, sin hallazgos objetivos en la valoración" },
];

/**
 * "Software simulado" del módulo Primera Infancia: ficha de valoración del desarrollo
 * (hitos por dominio, curva de crecimiento, esquema de vacunación, señales de alarma) en
 * vez del punto de venta de Farmacia. Usa el mismo motor de checklist/vidas/calificación
 * (endpoints genéricos /api/intentos/[id]/acciones y /finalizar).
 */
export default function PrimeraInfanciaSoftware({ intentoId }: { intentoId: string }) {
  const router = useRouter();
  const [intento, setIntento] = useState<Intento | null>(null);
  const [fichaVista, setFichaVista] = useState(false);
  const [edadCorregidaCalculada, setEdadCorregidaCalculada] = useState(false);
  const [vacunacionVerificada, setVacunacionVerificada] = useState(false);
  const [hitosValorados, setHitosValorados] = useState<Record<string, boolean>>({});
  const [pesoHoy, setPesoHoy] = useState("");
  const [tallaHoy, setTallaHoy] = useState("");
  const [pesoRegistrado, setPesoRegistrado] = useState(false);
  const [motivosSeleccionados, setMotivosSeleccionados] = useState<string[]>([]);
  const [alarmaRegistrada, setAlarmaRegistrada] = useState(false);
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
    await registrarAccion("VER_FICHA_NINO");
  }

  async function calcularEdadCorregida() {
    setEdadCorregidaCalculada(true);
    await registrarAccion("CALCULAR_EDAD_CORREGIDA");
  }

  async function verificarVacunacion() {
    setVacunacionVerificada(true);
    await registrarAccion("VERIFICAR_ESQUEMA_VACUNACION");
  }

  async function valorarHito(hito: HitoEsperado, presente: boolean) {
    const key = `${hito.dominio}::${hito.hito}`;
    setHitosValorados((prev) => ({ ...prev, [key]: presente }));
    await registrarAccion("VALORAR_HITO", { dominio: hito.dominio, hito: hito.hito, presente });
  }

  async function registrarPesoTalla() {
    setPesoRegistrado(true);
    await registrarAccion("REGISTRAR_PESO_TALLA", { pesoKg: Number(pesoHoy), tallaCm: Number(tallaHoy) });
  }

  function alternarMotivo(id: string) {
    setMotivosSeleccionados((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  }

  async function registrarAlarma() {
    setAlarmaRegistrada(true);
    await registrarAccion("DETECTAR_SEÑAL_ALARMA", { motivos: motivosSeleccionados });
  }

  async function registrarSeguimiento() {
    const data = await registrarAccion("REGISTRAR_SEGUIMIENTO");
    if (data.estado !== "PERDIDO") await finalizar("SEGUIMIENTO_NORMAL");
  }

  async function derivarAEspecialista() {
    const data = await registrarAccion("DERIVAR_A_ESPECIALISTA");
    if (data.estado !== "PERDIDO") await finalizar("DERIVAR_ESPECIALISTA");
  }

  async function activarRutaProteccion() {
    const data = await registrarAccion("ACTIVAR_RUTA_PROTECCION");
    if (data.estado !== "PERDIDO") await finalizar("ACTIVAR_RUTA_PROTECCION");
  }

  async function finalizar(resultado: "SEGUIMIENTO_NORMAL" | "DERIVAR_ESPECIALISTA" | "ACTIVAR_RUTA_PROTECCION") {
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

  const nino = intento?.escenario.infancia?.nino;
  const prematuro = useMemo(() => (nino ? esPrematuro(nino.semanasGestacionNacimiento) : false), [nino]);
  const edadMeses = useMemo(() => (nino ? calcularEdadMeses(new Date(nino.fechaNacimiento)) : 0), [nino]);
  const edadCorregidaMeses = useMemo(
    () => (nino ? calcularEdadCorregidaMeses(new Date(nino.fechaNacimiento), nino.semanasGestacionNacimiento) : 0),
    [nino]
  );

  if (!intento) return <div className="p-8 text-slate-500 text-sm">Cargando...</div>;

  const enTurno = intento.intentoTurno;
  const hitos = intento.escenario.infancia?.hitosEsperados ?? [];

  if (turnoTerminado || perdido || intento.estado === "PERDIDO" || resultadoFinal || intento.estado === "COMPLETADO") {
    const terminado = turnoTerminado
      ? { titulo: "¡Turno completo!", puntaje: turnoTerminado.puntajeFinal, esVictoria: true }
      : perdido || intento.estado === "PERDIDO"
        ? { titulo: "Te quedaste sin corazones", puntaje: null, esVictoria: false }
        : { titulo: "Resultado", puntaje: resultadoFinal?.puntajeFinal ?? intento.puntajeFinal ?? 0, esVictoria: true };

    return (
      <div className="min-h-screen bg-[var(--background)]">
        <header className="px-6 py-4 bg-amber-700">
          <div className="mx-auto max-w-2xl flex items-center gap-3">
            <Image src="/funca-logo.png" alt="FUNCA" width={100} height={50} className="h-8 w-auto bg-white rounded px-1.5 py-1" />
            <span className="font-heading text-sm font-semibold text-white">Primera Infancia</span>
          </div>
        </header>
        <div className="px-6 py-10">
          <div className="mx-auto max-w-2xl rounded-xl bg-white border border-slate-200 p-8 shadow-sm text-center">
            <h1 className="font-heading text-xl font-bold text-amber-800 mb-2">{terminado.titulo}</h1>
            {terminado.puntaje !== null && (
              <p className="text-4xl font-heading font-extrabold mb-4 text-amber-700">{terminado.puntaje}/100</p>
            )}
            {resultadoFinal && (
              <ul className="flex flex-col gap-2 mb-6 text-left">
                {resultadoFinal.detallePasos.map((p, i) => (
                  <li key={i} className={`text-sm flex gap-2 ${p.cumplido ? "text-amber-700" : "text-red-600"}`}>
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
                className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 transition-colors disabled:opacity-50"
              >
                {avanzando ? "Cargando..." : "Siguiente caso"}
              </button>
            ) : (
              <button
                onClick={() => router.push("/panel")}
                className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 transition-colors"
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
      <header className="px-6 py-4 bg-amber-700">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/funca-logo.png" alt="FUNCA" width={100} height={50} className="h-8 w-auto bg-white rounded px-1.5 py-1" />
            <span className="font-heading text-sm font-semibold text-white">Primera Infancia · Ficha de valoración</span>
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
          <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm mb-4 border-l-4 border-l-amber-500">
            <h1 className="font-heading font-semibold text-amber-900">{intento.escenario.titulo}</h1>
            <p className="text-sm text-slate-600 mt-1 whitespace-pre-line">{intento.escenario.descripcion}</p>
          </div>

          <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm mb-6">
            <div className="flex items-center justify-between mb-2 gap-4">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Progreso de este caso</span>
              <span className="text-xs font-semibold text-slate-500">Precisión: {precision}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-700 transition-all"
                style={{ width: `${progreso.total > 0 ? Math.round((progreso.completados / progreso.total) * 100) : 0}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-1 flex flex-col gap-4">
              <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
                <h2 className="text-sm font-heading font-semibold text-amber-900 mb-2">Ficha del niño/a</h2>
                {!fichaVista && (
                  <button
                    onClick={verFicha}
                    className="w-full rounded-lg bg-amber-700 py-2 text-sm font-medium text-white hover:bg-amber-800 transition-colors"
                  >
                    Consultar ficha
                  </button>
                )}
                {fichaVista && nino && (
                  <div className="text-sm text-slate-700 flex flex-col gap-1 bg-slate-50 rounded-lg p-2">
                    <p><span className="font-medium">Nombre:</span> {nino.nombre}</p>
                    <p><span className="font-medium">Edad cronológica:</span> {edadMeses} meses</p>
                    {prematuro && (
                      <p className="text-amber-700">
                        <span className="font-medium">Nació prematuro:</span> {nino.semanasGestacionNacimiento} semanas
                        de gestación
                      </p>
                    )}
                    <p><span className="font-medium">Cuidador:</span> {nino.cuidadorNombre ?? "—"}</p>
                    <p><span className="font-medium">Antecedentes:</span> {nino.antecedentes ?? "Ninguno"}</p>
                  </div>
                )}
              </div>

              {prematuro && (
                <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
                  <h2 className="text-sm font-heading font-semibold text-amber-900 mb-2">Edad corregida</h2>
                  {!edadCorregidaCalculada && (
                    <button
                      onClick={calcularEdadCorregida}
                      className="w-full rounded-lg border border-slate-300 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Calcular edad corregida
                    </button>
                  )}
                  {edadCorregidaCalculada && (
                    <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-2">
                      Edad corregida: <span className="font-semibold">{edadCorregidaMeses} meses</span> (usa esta edad,
                      no la cronológica, para valorar los hitos).
                    </p>
                  )}
                </div>
              )}

              <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
                <h2 className="text-sm font-heading font-semibold text-amber-900 mb-2">Peso y talla</h2>
                {nino && nino.registrosCrecimiento.length > 0 && (
                  <ul className="text-xs text-slate-600 mb-2 flex flex-col gap-0.5">
                    {nino.registrosCrecimiento.map((r) => (
                      <li key={r.id}>
                        {new Date(r.fecha).toLocaleDateString()}: {r.pesoKg} kg · {r.tallaCm} cm
                      </li>
                    ))}
                  </ul>
                )}
                {!pesoRegistrado ? (
                  <div className="flex gap-2">
                    <input
                      value={pesoHoy}
                      onChange={(e) => setPesoHoy(e.target.value)}
                      placeholder="Peso hoy (kg)"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                    <input
                      value={tallaHoy}
                      onChange={(e) => setTallaHoy(e.target.value)}
                      placeholder="Talla hoy (cm)"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                    <button
                      onClick={registrarPesoTalla}
                      disabled={!pesoHoy || !tallaHoy}
                      className="shrink-0 rounded-lg bg-amber-700 px-3 py-2 text-sm font-medium text-white hover:bg-amber-800 transition-colors disabled:opacity-50"
                    >
                      Registrar
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-slate-600">Registro de hoy guardado. Compara con la tendencia anterior.</p>
                )}
              </div>

              <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
                <h2 className="text-sm font-heading font-semibold text-amber-900 mb-2">Esquema de vacunación</h2>
                {!vacunacionVerificada ? (
                  <button
                    onClick={verificarVacunacion}
                    className="w-full rounded-lg border border-slate-300 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Verificar esquema de vacunación
                  </button>
                ) : nino ? (
                  <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-2">
                    {nino.esquemaVacunacionAlDia
                      ? "Al día."
                      : `Pendientes: ${nino.vacunasPendientes.join(", ") || "sin especificar"}.`}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="col-span-1 flex flex-col gap-4">
              <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
                <h2 className="text-sm font-heading font-semibold text-amber-900 mb-2">Hitos de desarrollo a valorar</h2>
                <div className="flex flex-col gap-2">
                  {hitos.map((h) => {
                    const key = `${h.dominio}::${h.hito}`;
                    const valorado = key in hitosValorados;
                    return (
                      <div key={key} className="flex items-center justify-between gap-2 bg-slate-50 rounded-lg p-2">
                        <div className="text-xs">
                          <p className="font-medium text-slate-700">{h.hito}</p>
                          <p className="text-slate-500">{h.dominio}</p>
                        </div>
                        {valorado ? (
                          <span className={`text-xs font-semibold ${hitosValorados[key] ? "text-amber-700" : "text-red-600"}`}>
                            {hitosValorados[key] ? "Presente" : "Ausente"}
                          </span>
                        ) : (
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={() => valorarHito(h, true)}
                              className="rounded-md border border-amber-300 px-2 py-1 text-xs text-amber-700 hover:bg-amber-50"
                            >
                              Presente
                            </button>
                            <button
                              onClick={() => valorarHito(h, false)}
                              className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                            >
                              Ausente
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
                <h2 className="text-sm font-heading font-semibold text-amber-900 mb-2">Señales de alarma</h2>
                <div className="flex flex-col gap-1 mb-2">
                  {MOTIVOS_ALARMA.map((m) => (
                    <label key={m.id} className="flex items-center gap-2 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={motivosSeleccionados.includes(m.id)}
                        onChange={() => alternarMotivo(m.id)}
                      />
                      {m.etiqueta}
                    </label>
                  ))}
                </div>
                <button
                  onClick={registrarAlarma}
                  disabled={motivosSeleccionados.length === 0 || alarmaRegistrada}
                  className="w-full rounded-lg border border-slate-300 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  {alarmaRegistrada ? "Señales registradas" : "Registrar señales seleccionadas"}
                </button>
              </div>

              <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm flex flex-col gap-2">
                <h2 className="text-sm font-heading font-semibold text-amber-900">Decisión final</h2>
                <button
                  onClick={registrarSeguimiento}
                  className="rounded-lg bg-amber-700 py-2 text-sm font-semibold text-white hover:bg-amber-800 transition-colors"
                >
                  Seguimiento normal (no requiere derivación)
                </button>
                <button
                  onClick={derivarAEspecialista}
                  className="rounded-lg border border-amber-600 text-amber-700 py-2 text-sm font-semibold hover:bg-amber-50 transition-colors"
                >
                  Derivar a especialista
                </button>
                <button
                  onClick={activarRutaProteccion}
                  className="rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
                >
                  Activar ruta de protección
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
