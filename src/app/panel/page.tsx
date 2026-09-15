"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { generarInformePDF } from "@/lib/nucleo/informePdf";

type EscenarioResumen = {
  id: string;
  titulo: string;
  intentos: {
    id: string;
    estado: "EN_PROGRESO" | "COMPLETADO" | "PERDIDO";
    puntajeFinal: number | null;
    puntajeProceso: number | null;
    puntajeResultado: number | null;
    finalizadoEn: string | null;
  }[];
};

type TurnoResumen = {
  id: string;
  titulo: string;
  descripcion: string;
  totalCasos: number;
  desbloqueado: boolean;
  ultimo: {
    id: string;
    estado: "EN_PROGRESO" | "COMPLETADO" | "PERDIDO";
    vidas: number;
    indice: number;
    puntajeFinal: number | null;
  } | null;
};

type Modulo = {
  id: string;
  slug: string;
  nombre: string;
  colorTema: string | null;
  tipo: "CASOS" | "SIMULADOR";
  rutaSimulador: string | null;
};

export default function PanelPage() {
  const router = useRouter();
  const [escenarios, setEscenarios] = useState<EscenarioResumen[]>([]);
  const [turnos, setTurnos] = useState<TurnoResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [perfil, setPerfil] = useState<{ nombre: string; usuario: string } | null>(null);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [moduloActivo, setModuloActivo] = useState<Modulo | null>(null);
  const [redirigiendo, setRedirigiendo] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        // Cuenta temporal con pantalla directa asignada: no ve el panel general, aunque
        // llegue aquí por atrás/adelante del navegador o un enlace guardado.
        if (data.usuario?.rutaDirecta) {
          setRedirigiendo(true);
          router.replace(data.usuario.rutaDirecta);
          return;
        }
        setPerfil(data.usuario ?? null);
        const lista: Modulo[] = data.modulos ?? [];
        setModulos(lista);
        setModuloActivo((actual) => actual ?? lista[0] ?? null);
      })
      .catch(() => {});
  }, [router]);

  useEffect(() => {
    if (!moduloActivo || moduloActivo.tipo === "SIMULADOR") {
      setEscenarios([]);
      setTurnos([]);
      setCargando(false);
      return;
    }
    setCargando(true);
    fetch(`/api/escenarios?moduloId=${moduloActivo.id}`)
      .then((res) => {
        if (res.status === 401) {
          router.push("/");
          throw new Error("no auth");
        }
        return res.json();
      })
      .then((data) => setEscenarios(data.escenarios ?? []))
      .catch(() => {})
      .finally(() => setCargando(false));

    fetch(`/api/turnos?moduloId=${moduloActivo.id}`)
      .then((res) => res.json())
      .then((data) => setTurnos(data.turnos ?? []))
      .catch(() => {});
  }, [moduloActivo, router]);

  async function descargarInforme() {
    if (!perfil) return;
    setGenerandoPdf(true);
    try {
      const evaluables = escenarios.filter((e) => !e.titulo.startsWith("Tutorial"));
      const completadosEsc = evaluables.filter((e) => e.intentos[0]?.estado === "COMPLETADO");
      const promedio =
        completadosEsc.length > 0
          ? Math.round(
              completadosEsc.reduce((sum, e) => sum + (e.intentos[0]?.puntajeFinal ?? 0), 0) /
                completadosEsc.length
            )
          : null;

      await generarInformePDF({
        nombre: perfil.nombre,
        usuario: perfil.usuario,
        completados: completadosEsc.length,
        totalEscenarios: evaluables.length,
        promedio,
        intentos: completadosEsc.map((e) => ({
          escenarioTitulo: e.titulo,
          puntajeFinal: e.intentos[0]?.puntajeFinal ?? null,
          puntajeProceso: e.intentos[0]?.puntajeProceso ?? null,
          puntajeResultado: e.intentos[0]?.puntajeResultado ?? null,
          finalizadoEn: e.intentos[0]?.finalizadoEn ?? null,
        })),
      });
    } finally {
      setGenerandoPdf(false);
    }
  }

  async function iniciar(escenarioId: string, modo: "FACIL" | "DIFICIL" = "FACIL") {
    const res = await fetch(`/api/escenarios/${escenarioId}/iniciar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modo }),
    });
    const data = await res.json();
    router.push(`/panel/escenario/${data.intentoId}`);
  }

  const [escogiendoModo, setEscogiendoModo] = useState<EscenarioResumen | null>(null);

  function alHacerClicIniciar(esc: EscenarioResumen) {
    const ultimo = esc.intentos[0];
    const esTutorial = esc.titulo.startsWith("Tutorial");
    if (esTutorial || ultimo?.estado === "EN_PROGRESO") {
      iniciar(esc.id);
      return;
    }
    setEscogiendoModo(esc);
  }

  async function iniciarTurno(turnoId: string, modo: "FACIL" | "DIFICIL" = "FACIL") {
    const res = await fetch(`/api/turnos/${turnoId}/iniciar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modo }),
    });
    const data = await res.json();
    if (data.intentoId) router.push(`/panel/escenario/${data.intentoId}`);
  }

  const [escogiendoModoTurno, setEscogiendoModoTurno] = useState<TurnoResumen | null>(null);

  function alHacerClicIniciarTurno(t: TurnoResumen) {
    if (t.ultimo?.estado === "EN_PROGRESO") {
      iniciarTurno(t.id);
      return;
    }
    setEscogiendoModoTurno(t);
  }

  async function cerrarSesion() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  const esSimulador = moduloActivo?.tipo === "SIMULADOR";
  const evaluables = escenarios.filter((e) => !e.titulo.startsWith("Tutorial"));
  const tutorial = escenarios.find((e) => e.titulo.startsWith("Tutorial"));
  const pendientes = evaluables.filter((e) => e.intentos[0]?.estado !== "COMPLETADO");
  const completados = evaluables.filter((e) => e.intentos[0]?.estado === "COMPLETADO");
  const totalCompletados = completados.length;
  const totalEvaluables = evaluables.length;
  const porcentaje = totalEvaluables > 0 ? Math.round((totalCompletados / totalEvaluables) * 100) : 0;
  const turnosDesbloqueados = turnos.filter((t) => t.desbloqueado);

  function renderEscenario(esc: EscenarioResumen, esTutorial: boolean) {
    const ultimo = esc.intentos[0];
    return (
      <div
        key={esc.id}
        className={`rounded-lg px-4 py-3 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between gap-4 ${
          esTutorial ? "bg-gold-50 border-2 border-gold-500" : "bg-white border border-slate-200"
        }`}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {esTutorial && (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-gold-700 bg-gold-100 px-1.5 py-0.5 rounded">
                Empieza aquí
              </span>
            )}
            <h2 className="font-heading font-semibold text-blue-900 flex items-center gap-1.5 truncate">
              {esc.titulo}
              {!esTutorial && ultimo?.estado === "COMPLETADO" && (
                <span className="inline-flex items-center justify-center h-4 w-4 shrink-0 rounded-full bg-emerald-500 text-white text-[10px]">
                  ✓
                </span>
              )}
            </h2>
            {ultimo?.estado === "COMPLETADO" && (
              <span className="text-xs font-semibold text-emerald-600 shrink-0">{ultimo.puntajeFinal}/100</span>
            )}
            {ultimo?.estado === "EN_PROGRESO" && (
              <span className="text-xs font-semibold text-gold-700 shrink-0">Sin terminar</span>
            )}
            {ultimo?.estado === "PERDIDO" && (
              <span className="text-xs font-semibold text-red-600 shrink-0">💔 Sin corazones</span>
            )}
          </div>
        </div>
        <button
          onClick={() => alHacerClicIniciar(esc)}
          className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors ${
            esTutorial ? "bg-gold-600 hover:bg-gold-700" : "bg-blue-800 hover:bg-blue-900"
          }`}
        >
          {ultimo?.estado === "EN_PROGRESO" ? "Continuar" : ultimo?.estado === "PERDIDO" ? "Reintentar" : "Iniciar"}
        </button>
      </div>
    );
  }

  if (redirigiendo) return null;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="bg-blue-900 px-6 py-4">
        <div className="mx-auto max-w-3xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/funca-logo.png" alt="FUNCA" width={100} height={50} className="h-8 w-auto bg-white rounded px-1.5 py-1" />
            <span className="font-heading text-sm font-semibold text-white">Prácticas</span>
          </div>
          <button onClick={cerrarSesion} className="text-sm text-blue-100 hover:text-white transition-colors">
            Cerrar sesión
          </button>
        </div>
      </header>

      <div className="px-6 py-10">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-start justify-between gap-4 mb-1">
            <h1 className="font-heading text-2xl font-bold text-blue-900">
              {esSimulador ? moduloActivo?.nombre : "Casos prácticos"}
            </h1>
            {moduloActivo?.slug === "farmacia" && (
              <button
                onClick={() => router.push("/panel/catalogo")}
                className="shrink-0 rounded-lg border border-blue-200 bg-white px-3.5 py-1.5 text-sm font-semibold text-blue-800 hover:bg-blue-50 transition-colors"
              >
                Ver expediente de medicamentos
              </button>
            )}
          </div>
          <p className="text-sm text-slate-500 mb-4">
            {esSimulador
              ? "Practica el proceso las veces que necesites. No se califica."
              : "Resuelve cada caso como lo harías en el trabajo real. Tu desempeño se califica automáticamente."}
          </p>

          {modulos.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {modulos.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setModuloActivo(m)}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                    moduloActivo?.id === m.id
                      ? "text-white"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                  style={moduloActivo?.id === m.id ? { backgroundColor: m.colorTema ?? "#1b3a6b" } : undefined}
                >
                  {m.nombre}
                </button>
              ))}
            </div>
          )}
          {modulos.length === 0 && !cargando && (
            <p className="text-sm text-gold-700 bg-gold-50 rounded-lg p-3 mb-6">
              No estás matriculado en ningún módulo todavía. Pídele a tu profesor que te matricule.
            </p>
          )}

          {esSimulador && moduloActivo && (
            <div className="rounded-xl bg-white border border-slate-200 p-6 shadow-sm">
              <p className="text-sm text-slate-500 mb-4">
                Atiende a los pacientes que llegan a la ventanilla: busca al paciente en el sistema, coteja la fórmula
                contra lo autorizado y dispensa. Puedes reiniciar la práctica cuando quieras.
              </p>
              <button
                onClick={() => router.push(moduloActivo.rutaSimulador ?? "/panel")}
                className="w-full rounded-lg px-4 py-3 text-sm font-semibold text-white transition-colors"
                style={{ backgroundColor: moduloActivo.colorTema ?? "#1b3a6b" }}
              >
                Abrir simulador de {moduloActivo.nombre.toLowerCase()}
              </button>
            </div>
          )}

          {!esSimulador && !cargando && (
            <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm mb-6">
              <div className="flex items-center justify-between mb-2 gap-4">
                <span className="text-sm font-heading font-semibold text-blue-900">Tu progreso</span>
                <span className="text-sm font-semibold text-blue-900">
                  {totalCompletados}/{totalEvaluables} casos · {porcentaje}%
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden mb-4">
                <div className="h-full rounded-full bg-gold-500 transition-all" style={{ width: `${porcentaje}%` }} />
              </div>
              <button
                onClick={descargarInforme}
                disabled={generandoPdf || !perfil}
                className="w-full rounded-lg border border-blue-800 text-blue-800 py-2 text-sm font-semibold hover:bg-blue-50 transition-colors disabled:opacity-50"
              >
                {generandoPdf ? "Generando..." : "Descargar mi informe en PDF"}
              </button>
              <p className="text-xs text-slate-400 mt-2 text-center">Súbelo a Q10 como evidencia de tu progreso.</p>
            </div>
          )}

          {cargando && <p className="text-slate-500 text-sm">Cargando...</p>}

          {/* Turno / prueba final — solo aparece cuando está desbloqueado */}
          {turnosDesbloqueados.map((t) => (
            <div
              key={t.id}
              className="rounded-xl p-5 shadow-lg mb-6 flex items-center justify-between gap-4 text-white"
              style={{ background: "linear-gradient(135deg, #6d28d9, #a21caf)" }}
            >
              <div>
                <span className="inline-block text-[11px] font-semibold uppercase tracking-wide text-purple-100 bg-white/15 px-2 py-0.5 rounded mb-1">
                  🏆 Prueba final desbloqueada
                </span>
                <h2 className="font-heading font-bold text-lg">{t.titulo}</h2>
                <p className="text-sm text-purple-100 mt-1">{t.descripcion}</p>
                {t.ultimo?.estado === "EN_PROGRESO" && (
                  <p className="text-sm mt-2 font-semibold text-white">
                    Vas en el caso {t.ultimo.indice + 1} de {t.totalCasos} · {"❤️".repeat(t.ultimo.vidas)}
                    {"🖤".repeat(3 - t.ultimo.vidas)}
                  </p>
                )}
                {t.ultimo?.estado === "COMPLETADO" && (
                  <p className="text-sm mt-2 font-semibold text-white">
                    Último resultado: {t.ultimo.puntajeFinal}/100 promedio
                  </p>
                )}
                {t.ultimo?.estado === "PERDIDO" && (
                  <p className="text-sm mt-2 font-semibold text-white">
                    💔 Perdiste el turno completo la última vez, vuelve a intentarlo
                  </p>
                )}
              </div>
              <button
                onClick={() => alHacerClicIniciarTurno(t)}
                className="shrink-0 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-purple-800 hover:bg-purple-50 transition-colors"
              >
                {t.ultimo?.estado === "EN_PROGRESO" ? "Continuar" : "Empezar"}
              </button>
            </div>
          ))}

          {!cargando && tutorial && (
            <div className="flex flex-col gap-4 mb-2">{renderEscenario(tutorial, true)}</div>
          )}

          {!cargando && pendientes.length > 0 && (
            <div className="mt-6">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Por resolver</h2>
              <div className="flex flex-col gap-2.5">{pendientes.map((esc) => renderEscenario(esc, false))}</div>
            </div>
          )}

          {!cargando && completados.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Completados</h2>
              <div className="flex flex-col gap-2.5">{completados.map((esc) => renderEscenario(esc, false))}</div>
            </div>
          )}
        </div>
      </div>

      {escogiendoModo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="font-heading text-lg font-bold text-blue-900 mb-1">Elige tu modo</h2>
            <p className="text-sm text-slate-500 mb-5">{escogiendoModo.titulo}</p>

            <button
              onClick={() => {
                iniciar(escogiendoModo.id, "FACIL");
                setEscogiendoModo(null);
              }}
              className="w-full text-left rounded-lg border-2 border-emerald-500 bg-emerald-50 p-4 mb-3 hover:bg-emerald-100 transition-colors"
            >
              <span className="block font-heading font-semibold text-emerald-700">🙂 Modo fácil</span>
              <span className="block text-xs text-emerald-700 mt-1">
                El enunciado te guía con pistas explícitas sobre qué revisar.
              </span>
            </button>

            <button
              onClick={() => {
                iniciar(escogiendoModo.id, "DIFICIL");
                setEscogiendoModo(null);
              }}
              className="w-full text-left rounded-lg border-2 border-red-500 bg-red-50 p-4 mb-4 hover:bg-red-100 transition-colors"
            >
              <span className="block font-heading font-semibold text-red-700">🔥 Modo difícil</span>
              <span className="block text-xs text-red-700 mt-1">
                Solo te dan los datos básicos, como en la vida real — tú decides qué revisar. Además, cualquier clic
                de más te cuesta un corazón.
              </span>
            </button>

            <button
              onClick={() => setEscogiendoModo(null)}
              className="w-full text-center text-sm text-slate-400 hover:text-slate-600"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {escogiendoModoTurno && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="font-heading text-lg font-bold text-blue-900 mb-1">Elige tu modo</h2>
            <p className="text-sm text-slate-500 mb-1">{escogiendoModoTurno.titulo}</p>
            <p className="text-xs text-slate-400 mb-5">Este modo aplica a los 5 casos del turno, no se puede cambiar a mitad de camino.</p>

            <button
              onClick={() => {
                iniciarTurno(escogiendoModoTurno.id, "FACIL");
                setEscogiendoModoTurno(null);
              }}
              className="w-full text-left rounded-lg border-2 border-emerald-500 bg-emerald-50 p-4 mb-3 hover:bg-emerald-100 transition-colors"
            >
              <span className="block font-heading font-semibold text-emerald-700">🙂 Modo fácil</span>
              <span className="block text-xs text-emerald-700 mt-1">
                El enunciado te guía con pistas explícitas sobre qué revisar, en los 5 casos.
              </span>
            </button>

            <button
              onClick={() => {
                iniciarTurno(escogiendoModoTurno.id, "DIFICIL");
                setEscogiendoModoTurno(null);
              }}
              className="w-full text-left rounded-lg border-2 border-red-500 bg-red-50 p-4 mb-4 hover:bg-red-100 transition-colors"
            >
              <span className="block font-heading font-semibold text-red-700">🔥 Modo difícil</span>
              <span className="block text-xs text-red-700 mt-1">
                Solo los datos básicos en los 5 casos — la verdadera prueba final.
              </span>
            </button>

            <button
              onClick={() => setEscogiendoModoTurno(null)}
              className="w-full text-center text-sm text-slate-400 hover:text-slate-600"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
