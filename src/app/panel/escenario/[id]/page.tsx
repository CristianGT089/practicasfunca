"use client";

import { useEffect, useState, useCallback, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import CedulaCard, { DatosCedula } from "@/components/CedulaCard";
import RecetaFisicaCard, { DatosRecetaFisica } from "@/components/RecetaFisicaCard";

type EstadoRecetaOnline = "VIGENTE" | "VENCIDA" | "AGOTADA";
type ResultadoRecetaOnline = {
  medicamentoId: string;
  medico: string;
  cantidadAutorizada: number;
  cantidadRedimida: number;
  fechaVigencia: string;
  estado: EstadoRecetaOnline;
};

type FichaPaciente = {
  nombre: string;
  cedula: string;
  edad: number;
  alergias: string[];
  antecedentes: string | null;
};

const MOTIVOS_RECHAZO: { codigo: string; etiqueta: string }[] = [
  { codigo: "sin_receta", etiqueta: "No presentó receta médica válida (ni física ni en línea)" },
  { codigo: "identidad_no_validada", etiqueta: "No se pudo validar su identidad" },
  { codigo: "alergia", etiqueta: "Es alérgico/a al medicamento" },
  { codigo: "sin_stock", etiqueta: "No hay stock disponible" },
  { codigo: "lote_vencido", etiqueta: "El lote está vencido" },
  { codigo: "controlado_no_registrado", etiqueta: "Es controlado y no se registró antes de venderlo" },
  { codigo: "receta_agotada", etiqueta: "Ya se redimió toda la cantidad autorizada en la receta" },
  { codigo: "receta_vencida", etiqueta: "La receta ya venció por fecha" },
];

type Medicamento = {
  id: string;
  nombre: string;
  principioActivo: string;
  presentacion: string;
  requiereReceta: boolean;
  esControlado: boolean;
  stock: number;
  precio: number;
  tags: string[];
  loteVencimiento: string | null;
};

type Intento = {
  id: string;
  estado: "EN_PROGRESO" | "COMPLETADO" | "PERDIDO";
  modo: "FACIL" | "DIFICIL";
  vidas: number;
  puntajeFinal: number | null;
  puntajeProceso: number | null;
  puntajeResultado: number | null;
  escenario: {
    titulo: string;
    descripcion: string;
    recetaPresentada: boolean;
    notaRecetaFisica: string | null;
    mostrarIdentidad: boolean;
    recetaFisicaPacienteNombre: string | null;
    recetaFisicaMedicamento: string | null;
    recetaFisicaPosologia: string | null;
    recetaFisicaCantidad: string | null;
    recetaFisicaCantidadTachada: string | null;
    recetaFisicaMedico: string | null;
    recetaFisicaRegistroMedico: string | null;
    recetaFisicaFechaEmision: string | null;
    recetaFisicaDiasVigencia: number | null;
    recetaFisicaControlado: boolean;
  };
  intentoTurno: { id: string; indice: number; total: number; vidas: number; titulo: string } | null;
};

type DetallePaso = { descripcion: string; obligatorio: boolean; cumplido: boolean };
type Progreso = { completados: number; total: number };

const CORAZON_LLENO = "❤️";
const CORAZON_VACIO = "🖤";

export default function EscenarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: intentoId } = usePromise(params);
  const router = useRouter();
  const [intento, setIntento] = useState<Intento | null>(null);
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [carrito, setCarrito] = useState<Medicamento[]>([]);
  const [recetaVerificada, setRecetaVerificada] = useState(false);
  const [controladosRegistrados, setControladosRegistrados] = useState<string[]>([]);
  const [cedula, setCedula] = useState<{ entregada: boolean; datos: DatosCedula | null } | null>(null);
  const [ficha, setFicha] = useState<{ encontrado: boolean; paciente: FichaPaciente | null } | null>(null);
  const [recetaOnline, setRecetaOnline] = useState<ResultadoRecetaOnline[] | null>(null);
  const [avisoCedula, setAvisoCedula] = useState<string | null>(null);
  const [mostrarMotivos, setMostrarMotivos] = useState(false);
  const [motivosSeleccionados, setMotivosSeleccionados] = useState<string[]>([]);
  const [resultadoFinal, setResultadoFinal] = useState<{ puntajeFinal: number; detallePasos: DetallePaso[] } | null>(
    null
  );
  const [avanzando, setAvanzando] = useState(false);
  const [turnoTerminado, setTurnoTerminado] = useState<{ puntajeFinal: number } | null>(null);

  const [vidas, setVidas] = useState(3);
  const [progreso, setProgreso] = useState<Progreso>({ completados: 0, total: 0 });
  const [precision, setPrecision] = useState(100);
  const [alertaError, setAlertaError] = useState<string[] | null>(null);
  const [perdido, setPerdido] = useState(false);

  const cargar = useCallback(async () => {
    const res = await fetch(`/api/intentos/${intentoId}`);
    if (res.status === 401) {
      router.push("/");
      return;
    }
    const data = await res.json();
    setIntento(data.intento);
    setMedicamentos(data.medicamentos ?? []);
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

  async function buscar(nombre: string) {
    setBusqueda(nombre);
    if (nombre.length >= 2) {
      const encontrado = medicamentos.find((m) => m.nombre.toLowerCase().includes(nombre.toLowerCase()));
      if (encontrado) await registrarAccion("BUSCAR_MEDICAMENTO", { medicamentoId: encontrado.id });
    }
  }

  async function verificarReceta() {
    setRecetaVerificada(true);
    await registrarAccion("VERIFICAR_RECETA");
  }

  async function solicitarCedula() {
    const res = await fetch(`/api/intentos/${intentoId}/solicitar-cedula`, { method: "POST" });
    const data = await res.json();
    if (typeof data.vidas === "number") setVidas(data.vidas);
    if (data.progreso) setProgreso(data.progreso);
    if (typeof data.precision === "number") setPrecision(data.precision);
    if (data.estado === "PERDIDO") setPerdido(true);
    setCedula({ entregada: data.entregada, datos: data.datos });
  }

  async function buscarFichaPaciente() {
    if (!cedula?.datos?.cedula) return;
    const res = await fetch(`/api/intentos/${intentoId}/buscar-paciente`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cedula: cedula.datos.cedula }),
    });
    const data = await res.json();
    if (data.error) {
      setAvisoCedula(data.error);
      setTimeout(() => setAvisoCedula(null), 6000);
      return;
    }
    if (typeof data.vidas === "number") setVidas(data.vidas);
    if (data.progreso) setProgreso(data.progreso);
    if (typeof data.precision === "number") setPrecision(data.precision);
    if (data.estado === "PERDIDO") setPerdido(true);
    setFicha({ encontrado: data.encontrado, paciente: data.paciente });
  }

  async function buscarRecetaOnline() {
    const res = await fetch(`/api/intentos/${intentoId}/receta-online`, { method: "POST" });
    const data = await res.json();
    if (data.error) {
      setAvisoCedula(data.error);
      setTimeout(() => setAvisoCedula(null), 6000);
      return;
    }
    if (typeof data.vidas === "number") setVidas(data.vidas);
    if (data.progreso) setProgreso(data.progreso);
    if (typeof data.precision === "number") setPrecision(data.precision);
    if (data.estado === "PERDIDO") setPerdido(true);
    setRecetaOnline(data.resultados);
  }

  function toggleMotivo(codigo: string) {
    setMotivosSeleccionados((m) => (m.includes(codigo) ? m.filter((x) => x !== codigo) : [...m, codigo]));
  }

  async function confirmarRechazo() {
    const data = await registrarAccion("RECHAZAR_VENTA", { motivos: motivosSeleccionados });
    if (data.estado !== "PERDIDO") await finalizar("RECHAZO_CORRECTO");
  }

  async function escalarASupervisor() {
    const data = await registrarAccion("ESCALAR_A_SUPERVISOR");
    if (data.estado !== "PERDIDO") await finalizar("RECHAZO_CORRECTO");
  }

  async function registrarControlado(med: Medicamento) {
    setControladosRegistrados((c) => [...c, med.id]);
    await registrarAccion("REGISTRAR_CONTROLADO", { medicamentoId: med.id });
  }

  async function agregarAVenta(med: Medicamento) {
    setCarrito((c) => [...c, med]);
    await registrarAccion("AGREGAR_A_VENTA", { medicamentoId: med.id });
  }

  function quitarDeVenta(id: string) {
    setCarrito((c) => c.filter((m) => m.id !== id));
    registrarAccion("QUITAR_DE_VENTA", { medicamentoId: id });
  }

  async function completarVenta() {
    const data = await registrarAccion("COMPLETAR_VENTA");
    if (data.estado !== "PERDIDO") await finalizar("VENTA_CORRECTA");
  }

  async function finalizar(resultado: "VENTA_CORRECTA" | "RECHAZO_CORRECTO") {
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

  if (turnoTerminado) {
    const colorPuntaje =
      turnoTerminado.puntajeFinal >= 70 ? "text-emerald-600" : turnoTerminado.puntajeFinal >= 40 ? "text-gold-700" : "text-red-600";
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <header className="px-6 py-4" style={{ background: "linear-gradient(135deg, #6d28d9, #a21caf)" }}>
          <div className="mx-auto max-w-2xl flex items-center gap-3">
            <Image src="/funca-logo.png" alt="FUNCA" width={100} height={50} className="h-8 w-auto bg-white rounded px-1.5 py-1" />
            <span className="font-heading text-sm font-semibold text-white">🏆 Prueba final</span>
          </div>
        </header>
        <div className="px-6 py-10">
          <div className="mx-auto max-w-2xl rounded-xl bg-white border border-slate-200 p-8 shadow-sm text-center">
            <p className="text-5xl mb-3">🏆</p>
            <h1 className="font-heading text-xl font-bold text-purple-800 mb-2">¡Turno completo!</h1>
            <p className="text-sm text-slate-500 mb-4">Atendiste los 5 casos seguidos con las mismas 3 vidas.</p>
            <p className={`text-4xl font-heading font-extrabold mb-6 ${colorPuntaje}`}>{turnoTerminado.puntajeFinal}/100</p>
            <button
              onClick={() => router.push("/panel")}
              className="rounded-lg bg-purple-800 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-900 transition-colors"
            >
              Volver a mis casos
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (perdido || intento.estado === "PERDIDO") {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <header
          className={`px-6 py-4 ${enTurno ? "" : "bg-blue-900"}`}
          style={enTurno ? { background: "linear-gradient(135deg, #6d28d9, #a21caf)" } : undefined}
        >
          <div className="mx-auto max-w-2xl flex items-center gap-3">
            <Image src="/funca-logo.png" alt="FUNCA" width={100} height={50} className="h-8 w-auto bg-white rounded px-1.5 py-1" />
            <span className="font-heading text-sm font-semibold text-white">{enTurno ? "🏆 Prueba final" : "Prácticas"}</span>
          </div>
        </header>
        <div className="px-6 py-10">
          <div className="mx-auto max-w-2xl rounded-xl bg-white border border-slate-200 p-8 shadow-sm text-center">
            <p className="text-5xl mb-3">💔</p>
            <h1 className="font-heading text-xl font-bold text-red-600 mb-2">Te quedaste sin corazones</h1>
            <p className="text-sm text-slate-500 mb-6">
              {enTurno
                ? `Este turno completo no cuenta — te quedaste sin corazones en el caso ${enTurno.indice + 1} de ${enTurno.total}. Tendrás que reintentar los 5 casos desde el principio.`
                : "Este intento no cuenta. Repasa el caso y vuelve a intentarlo."}
            </p>
            <button
              onClick={() => router.push("/panel")}
              className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900 transition-colors"
            >
              Volver a mis casos
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (resultadoFinal || intento.estado === "COMPLETADO") {
    const puntaje = resultadoFinal?.puntajeFinal ?? intento.puntajeFinal ?? 0;
    const colorPuntaje = puntaje >= 70 ? "text-emerald-600" : puntaje >= 40 ? "text-gold-700" : "text-red-600";
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <header
          className="px-6 py-4"
          style={enTurno ? { background: "linear-gradient(135deg, #6d28d9, #a21caf)" } : { backgroundColor: "#1b3a6b" }}
        >
          <div className="mx-auto max-w-2xl flex items-center gap-3">
            <Image src="/funca-logo.png" alt="FUNCA" width={100} height={50} className="h-8 w-auto bg-white rounded px-1.5 py-1" />
            <span className="font-heading text-sm font-semibold text-white">
              {enTurno ? `🏆 Prueba final · Caso ${enTurno.indice + 1}/${enTurno.total}` : "Prácticas"}
            </span>
          </div>
        </header>
        <div className="px-6 py-10">
          <div className="mx-auto max-w-2xl rounded-xl bg-white border border-slate-200 p-8 shadow-sm">
            <h1 className="font-heading text-xl font-bold text-blue-900 mb-2">Resultado</h1>
            <p className={`text-4xl font-heading font-extrabold mb-1 ${colorPuntaje}`}>{puntaje}/100</p>
            <p className="text-sm text-slate-500 mb-6">
              {"❤️".repeat(vidas)}
              {"🖤".repeat(3 - vidas)} · Precisión: {precision}%
            </p>
            {resultadoFinal && (
              <ul className="flex flex-col gap-2 mb-6">
                {resultadoFinal.detallePasos.map((p, i) => (
                  <li key={i} className={`text-sm flex gap-2 ${p.cumplido ? "text-emerald-700" : "text-red-600"}`}>
                    <span>{p.cumplido ? "✓" : "✗"}</span>
                    <span>{p.descripcion}</span>
                  </li>
                ))}
              </ul>
            )}
            {enTurno ? (
              <button
                onClick={() => avanzarTurno(enTurno.id)}
                disabled={avanzando}
                className="rounded-lg bg-purple-800 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-900 transition-colors disabled:opacity-50"
              >
                {avanzando
                  ? "Cargando..."
                  : enTurno.indice + 1 >= enTurno.total
                    ? "Ver resultado del turno"
                    : `Siguiente caso (${enTurno.indice + 2}/${enTurno.total})`}
              </button>
            ) : (
              <button
                onClick={() => router.push("/panel")}
                className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900 transition-colors"
              >
                Volver a casos
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const medicamentosFiltrados = medicamentos.filter((m) =>
    m.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header
        className={`px-6 py-4 ${enTurno ? "" : "bg-blue-900"}`}
        style={enTurno ? { background: "linear-gradient(135deg, #6d28d9, #a21caf)" } : undefined}
      >
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/funca-logo.png" alt="FUNCA" width={100} height={50} className="h-8 w-auto bg-white rounded px-1.5 py-1" />
            <span className="font-heading text-sm font-semibold text-white">
              {enTurno ? `🏆 Prueba final · Caso ${enTurno.indice + 1}/${enTurno.total}` : "Prácticas"}
            </span>
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
          <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm mb-4 border-l-4 border-l-gold-500">
            <h1 className="font-heading font-semibold text-blue-900">{intento.escenario.titulo}</h1>
            <p className="text-sm text-slate-600 mt-1 whitespace-pre-line">{intento.escenario.descripcion}</p>
          </div>

          <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm mb-6">
            <div className="flex items-center justify-between mb-2 gap-4">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Progreso de este caso</span>
              <span className="text-xs font-semibold text-slate-500">
                Precisión: {precision}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-800 transition-all"
                style={{
                  width: `${progreso.total > 0 ? Math.round((progreso.completados / progreso.total) * 100) : 0}%`,
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {/* Columna paciente */}
            <div className="col-span-1">
              {intento.escenario.mostrarIdentidad && (
                <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
                  <h2 className="text-sm font-heading font-semibold text-blue-900 mb-2">Identidad del cliente</h2>
                  {!cedula && (
                    <button
                      onClick={solicitarCedula}
                      className="w-full rounded-lg bg-blue-800 py-2 text-sm font-medium text-white hover:bg-blue-900 transition-colors"
                    >
                      Solicitar cédula
                    </button>
                  )}
                  {cedula && !cedula.entregada && (
                    <p className="text-sm text-red-600">El cliente se niega a mostrar su cédula.</p>
                  )}
                  {cedula && cedula.entregada && cedula.datos && (
                    <div className="flex flex-col gap-3">
                      <CedulaCard datos={cedula.datos} />

                      {!ficha && (
                        <button
                          onClick={buscarFichaPaciente}
                          className="w-full rounded-lg border border-slate-300 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          Buscar en el sistema por esta cédula
                        </button>
                      )}
                      {ficha && !ficha.encontrado && (
                        <p className="text-sm text-red-700 bg-red-50 rounded-lg p-2">
                          No hay ningún paciente registrado con esta cédula en el sistema.
                        </p>
                      )}
                      {ficha && ficha.encontrado && ficha.paciente && (
                        <div className="text-sm text-slate-700 flex flex-col gap-1 bg-slate-50 rounded-lg p-2">
                          <p><span className="font-medium">Nombre:</span> {ficha.paciente.nombre}</p>
                          <p><span className="font-medium">Edad:</span> {ficha.paciente.edad}</p>
                          <p><span className="font-medium">Alergias:</span> {ficha.paciente.alergias.join(", ") || "Ninguna"}</p>
                          <p><span className="font-medium">Antecedentes:</span> {ficha.paciente.antecedentes || "Ninguno"}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className={`rounded-xl bg-white border border-slate-200 p-4 shadow-sm ${intento.escenario.mostrarIdentidad ? "mt-4" : ""}`}>
                <h2 className="text-sm font-heading font-semibold text-blue-900 mb-2">Receta médica</h2>
                {!recetaVerificada && (
                  <button
                    onClick={verificarReceta}
                    className="w-full rounded-lg border border-slate-300 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Verificar receta
                  </button>
                )}
                {recetaVerificada && !intento.escenario.recetaPresentada && (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-gold-700">El cliente no presenta receta física.</p>
                    {!recetaOnline && (
                      <button
                        onClick={buscarRecetaOnline}
                        className="w-full rounded-lg border border-slate-300 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        Buscar receta en línea
                      </button>
                    )}
                    {avisoCedula && <p className="text-xs text-gold-700 bg-gold-50 rounded-lg p-2">{avisoCedula}</p>}
                    {recetaOnline && (
                      <div className="flex flex-col gap-1">
                        {recetaOnline.length === 0 && (
                          <p className="text-sm text-red-700 bg-red-50 rounded-lg p-2">
                            No se encontró ninguna receta a nombre de este paciente.
                          </p>
                        )}
                        {recetaOnline.map((r) => {
                          const med = medicamentos.find((m) => m.id === r.medicamentoId);
                          const etiquetaEstado =
                            r.estado === "VIGENTE" ? "Vigente" : r.estado === "VENCIDA" ? "Vencida" : "Agotada";
                          const colorEstado =
                            r.estado === "VIGENTE" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700";
                          return (
                            <div key={r.medicamentoId} className="rounded-lg border border-slate-200 overflow-hidden">
                              <div className="flex items-center justify-between bg-slate-50 px-2.5 py-1.5">
                                <span className="text-xs font-semibold text-slate-800">{med?.nombre ?? "Medicamento"}</span>
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${colorEstado}`}>
                                  {etiquetaEstado}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-x-2 gap-y-1 px-2.5 py-2 text-xs text-slate-600">
                                <div>
                                  <p className="text-[9px] text-slate-400 uppercase tracking-wide leading-none">Autorizado</p>
                                  <p className="font-medium text-slate-700">{r.cantidadAutorizada}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] text-slate-400 uppercase tracking-wide leading-none">Redimido</p>
                                  <p className="font-medium text-slate-700">{r.cantidadRedimida}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] text-slate-400 uppercase tracking-wide leading-none">Vence</p>
                                  <p className="font-medium text-slate-700">{new Date(r.fechaVigencia).toLocaleDateString()}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] text-slate-400 uppercase tracking-wide leading-none">Médico</p>
                                  <p className="font-medium text-slate-700 truncate">{r.medico}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
                {recetaVerificada &&
                  intento.escenario.recetaPresentada &&
                  intento.escenario.recetaFisicaMedicamento &&
                  intento.escenario.recetaFisicaFechaEmision && (
                    <>
                      <RecetaFisicaCard
                        datos={{
                          pacienteNombre: intento.escenario.recetaFisicaPacienteNombre ?? "—",
                          medicamento: intento.escenario.recetaFisicaMedicamento,
                          posologia: intento.escenario.recetaFisicaPosologia ?? "",
                          cantidad: intento.escenario.recetaFisicaCantidad ?? "",
                          cantidadTachada: intento.escenario.recetaFisicaCantidadTachada,
                          medico: intento.escenario.recetaFisicaMedico ?? "",
                          registroMedico: intento.escenario.recetaFisicaRegistroMedico ?? "",
                          fechaEmision: intento.escenario.recetaFisicaFechaEmision,
                          diasVigencia: intento.escenario.recetaFisicaDiasVigencia ?? 30,
                          controlado: intento.escenario.recetaFisicaControlado,
                        } satisfies DatosRecetaFisica}
                      />
                    </>
                  )}
              </div>

              <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm mt-4 flex flex-col gap-2">
                <button
                  onClick={completarVenta}
                  disabled={carrito.length === 0}
                  className="rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  Completar venta
                </button>

                {!mostrarMotivos && (
                  <button
                    onClick={() => setMostrarMotivos(true)}
                    className="rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
                  >
                    Rechazar venta
                  </button>
                )}
                {mostrarMotivos && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="text-xs font-semibold text-red-700 mb-2">¿Por qué rechazas la venta?</p>
                    <div className="flex flex-col gap-1.5 mb-3">
                      {MOTIVOS_RECHAZO.map((m) => (
                        <label key={m.codigo} className="flex items-start gap-2 text-xs text-slate-700">
                          <input
                            type="checkbox"
                            checked={motivosSeleccionados.includes(m.codigo)}
                            onChange={() => toggleMotivo(m.codigo)}
                            className="mt-0.5"
                          />
                          {m.etiqueta}
                        </label>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={confirmarRechazo}
                        disabled={motivosSeleccionados.length === 0}
                        className="flex-1 rounded-lg bg-red-600 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        Confirmar rechazo
                      </button>
                      <button
                        onClick={() => {
                          setMostrarMotivos(false);
                          setMotivosSeleccionados([]);
                        }}
                        className="rounded-lg border border-slate-300 px-3 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={escalarASupervisor}
                  className="rounded-lg border border-gold-500 text-gold-700 py-2 text-sm font-semibold hover:bg-gold-50 transition-colors"
                >
                  Escalar a supervisor
                </button>
              </div>
            </div>

            {/* Columna medicamentos */}
            <div className="col-span-1">
              <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
                <h2 className="text-sm font-heading font-semibold text-blue-900 mb-2">Buscar medicamento</h2>
                <input
                  value={busqueda}
                  onChange={(e) => buscar(e.target.value)}
                  placeholder="Nombre del medicamento..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                />
                <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
                  {medicamentosFiltrados.map((m) => {
                    const vencido = m.loteVencimiento ? new Date(m.loteVencimiento) < new Date() : false;
                    return (
                      <div key={m.id} className="rounded-lg border border-slate-200 p-3">
                        <p className="text-sm font-medium text-slate-800">{m.nombre}</p>
                        <p className="text-xs text-slate-500">{m.presentacion} · Stock: {m.stock} · ${m.precio}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {m.tags.length > 0 && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                              Familia: {m.tags.join(", ")}
                            </span>
                          )}
                          {m.requiereReceta && (
                            <span className="text-[10px] bg-gold-100 text-gold-700 px-1.5 py-0.5 rounded">Requiere receta</span>
                          )}
                          {m.esControlado && (
                            <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Controlado</span>
                          )}
                          {m.stock <= 0 && (
                            <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded">⚠ Sin stock</span>
                          )}
                          {vencido && (
                            <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded">⚠ Lote vencido</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {m.esControlado && (
                            <button
                              onClick={() => registrarControlado(m)}
                              disabled={controladosRegistrados.includes(m.id)}
                              className="text-xs rounded border border-red-300 text-red-700 px-2 py-1 hover:bg-red-50 transition-colors disabled:opacity-50"
                            >
                              {controladosRegistrados.includes(m.id) ? "Controlado registrado" : "Registrar controlado"}
                            </button>
                          )}
                          <button
                            onClick={() => agregarAVenta(m)}
                            className="text-xs rounded bg-blue-800 text-white px-2 py-1 hover:bg-blue-900 transition-colors"
                          >
                            Agregar a venta
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Columna venta */}
            <div className="col-span-1">
              <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
                <h2 className="text-sm font-heading font-semibold text-blue-900 mb-2">Venta actual</h2>
                {carrito.length === 0 && <p className="text-sm text-slate-400">Sin productos agregados.</p>}
                <div className="flex flex-col gap-2">
                  {carrito.map((m, i) => (
                    <div key={`${m.id}-${i}`} className="flex items-center justify-between rounded-lg border border-slate-200 p-2">
                      <div>
                        <p className="text-sm text-slate-800">{m.nombre}</p>
                        <p className="text-xs text-slate-500">${m.precio}</p>
                      </div>
                      <button onClick={() => quitarDeVenta(m.id)} className="text-xs text-red-600 hover:underline">
                        Quitar
                      </button>
                    </div>
                  ))}
                </div>
                {carrito.length > 0 && (
                  <p className="text-sm font-semibold text-blue-900 mt-3">
                    Total: ${carrito.reduce((sum, m) => sum + m.precio, 0)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
