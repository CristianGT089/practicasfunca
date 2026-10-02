"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import EncabezadoFunca from "@/components/nucleo/EncabezadoFunca";
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
  const [dictado, setDictado] = useState<{ nombre: string; pausado: boolean } | null>(null);

  // ¿El docente está dictando un caso a este grupo? Se revisa cada 10 s.
  useEffect(() => {
    const revisar = () =>
      fetch("/api/modulos/odontologia/dictado")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => setDictado(d?.dictado ?? null))
        .catch(() => {});
    revisar();
    const t = setInterval(revisar, 10000);
    return () => clearInterval(t);
  }, []);

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
  const enCurso = evaluables.find((e) => e.intentos[0]?.estado === "EN_PROGRESO");

  function renderEscenario(esc: EscenarioResumen, esTutorial: boolean) {
    const ultimo = esc.intentos[0];
    return (
      <div
        key={esc.id}
        className={`flex items-center justify-between gap-4 px-5 py-3.5 ${esTutorial ? "rounded-3xl bg-gold-50 border-2 border-gold-500" : "hover:bg-blue-50"}`}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {esTutorial && (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-gold-700 bg-gold-100 px-1.5 py-0.5 rounded">
                Empieza aquí
              </span>
            )}
            <h3 className="font-heading font-semibold text-blue-900 flex items-center gap-1.5 truncate">
              {esc.titulo}
              {!esTutorial && ultimo?.estado === "COMPLETADO" && (
                <span className="inline-flex items-center justify-center h-4 w-4 shrink-0 rounded-full bg-emerald-500 text-white text-[10px]">
                  ✓
                </span>
              )}
            </h3>
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
          aria-label={`${ultimo?.estado === "EN_PROGRESO" ? "Continuar" : ultimo?.estado === "PERDIDO" ? "Reintentar" : ultimo?.estado === "COMPLETADO" ? "Repetir" : "Iniciar"} ${esc.titulo}`}
          className={`shrink-0 px-4 py-2 ${esTutorial ? "btn-cta" : ultimo?.estado === "COMPLETADO" ? "btn-suave" : "btn-primario"}`}
        >
          {ultimo?.estado === "EN_PROGRESO" ? "Continuar" : ultimo?.estado === "PERDIDO" ? "Reintentar" : ultimo?.estado === "COMPLETADO" ? "Repetir" : "Iniciar"}
        </button>
      </div>
    );
  }

  if (redirigiendo) return null;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <EncabezadoFunca etiqueta="Estudiante" inicioHref="/panel" nombre={perfil?.nombre} rol="Estudiante" onSalir={cerrarSesion} />

      <main className="px-4 sm:px-6 py-8 sm:py-10">
        <div className="mx-auto max-w-4xl flex flex-col gap-6">
          {/* 1. Lo urgente: el docente está dictando ahora mismo. */}
          {dictado && (
            <button
              onClick={() => router.push("/panel/dictado")}
              className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-800 to-blue-700 p-5 sm:p-6 text-left text-white shadow-[0_16px_40px_-20px_rgba(30,46,85,0.8)]"
            >
              <span aria-hidden className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold-500/20 blur-2xl" />
              <span className="relative flex flex-wrap items-center justify-between gap-4">
                <span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-gold-500/15 px-3 py-1 text-xs font-semibold text-gold-400">
                    <span className="h-2 w-2 rounded-full bg-gold-400 animate-pulse" aria-hidden />
                    {dictado.pausado ? "Dictado en pausa" : "Dictado en curso"}
                  </span>
                  <span className="mt-2 block font-heading text-xl font-bold">{dictado.nombre}</span>
                  <span className="block text-sm text-blue-200">Tu docente está dictando un caso. Entra para registrarlo.</span>
                </span>
                <span className="btn-cta">Entrar al dictado →</span>
              </span>
            </button>
          )}

          {/* 2. Saludo y progreso */}
          <section className="tarjeta p-5 sm:p-7">
            {modulos.length > 1 && (
              <div className="mb-5 -mx-1 flex flex-wrap gap-2 border-b border-blue-100 pb-4" role="tablist" aria-label="Módulos">
                {modulos.map((m) => (
                  <button
                    key={m.id}
                    role="tab"
                    aria-selected={moduloActivo?.id === m.id}
                    onClick={() => setModuloActivo(m)}
                    className={`rounded-full px-4 py-1.5 text-sm font-semibold font-heading transition-colors ${
                      moduloActivo?.id === m.id ? "bg-blue-800 text-white" : "bg-blue-50 text-slate-600 hover:bg-blue-100"
                    }`}
                  >
                    {m.nombre}
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="eyebrow">{esSimulador ? "Simulador" : "Práctica virtual"}</p>
                <h1 className="titulo-pagina mt-1">{perfil ? `Hola, ${perfil.nombre.split(" ")[0]}` : "Hola"}</h1>
                <p className="text-sm text-slate-500 mt-1">
                  {esSimulador
                    ? "Practica el proceso las veces que necesites. No se califica."
                    : "Resuelve cada caso como lo harías en el trabajo real. Se califica automáticamente."}
                </p>
              </div>
              {moduloActivo?.slug === "farmacia" && (
                <button onClick={() => router.push("/panel/catalogo")} className="btn-secundario px-4 py-2">
                  Expediente de medicamentos
                </button>
              )}
            </div>

            {!esSimulador && !cargando && totalEvaluables > 0 && (
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-48">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-semibold text-blue-900">Tu progreso</span>
                    <span className="text-slate-600">
                      {totalCompletados} de {totalEvaluables} casos · <b className="text-blue-900">{porcentaje}%</b>
                    </span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-blue-100 overflow-hidden" role="progressbar" aria-valuenow={porcentaje} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full rounded-full bg-gold-500 transition-all" style={{ width: `${porcentaje}%` }} />
                  </div>
                </div>
                <button onClick={descargarInforme} disabled={generandoPdf || !perfil} className="btn-suave px-4 py-2" title="Súbelo a Q10 como evidencia de tu progreso">
                  {generandoPdf ? "Generando..." : "Descargar informe PDF"}
                </button>
              </div>
            )}
          </section>

          {modulos.length === 0 && !cargando && (
            <p className="tarjeta p-5 text-sm text-gold-700 bg-gold-50 border-gold-100">
              No estás matriculado en ningún módulo todavía. Pídele a tu profesor que te matricule.
            </p>
          )}

          {esSimulador && moduloActivo && (
            <div className="tarjeta p-6">
              <p className="text-sm text-slate-600 mb-4">
                Atiende a los pacientes que llegan a la ventanilla: busca al paciente en el sistema, coteja la fórmula
                contra lo autorizado y dispensa. Puedes reiniciar la práctica cuando quieras.
              </p>
              <button onClick={() => router.push(moduloActivo.rutaSimulador ?? "/panel")} className="btn-cta w-full">
                Abrir simulador de {moduloActivo.nombre.toLowerCase()}
              </button>
            </div>
          )}

          {/* 3. Continúa donde quedaste: a un clic */}
          {!cargando && enCurso && (
            <section className="tarjeta p-5 flex flex-wrap items-center justify-between gap-4 border-gold-500 border-2">
              <div>
                <p className="eyebrow">Continúa donde quedaste</p>
                <p className="mt-1 font-heading font-semibold text-blue-900">{enCurso.titulo}</p>
              </div>
              <button onClick={() => iniciar(enCurso.id)} className="btn-cta">
                Continuar →
              </button>
            </section>
          )}

          {cargando && <p className="text-slate-500 text-sm">Cargando...</p>}

          {/* Turno / prueba final — solo aparece cuando está desbloqueado */}
          {turnosDesbloqueados.map((t) => (
            <div
              key={t.id}
              className="rounded-3xl p-5 sm:p-6 shadow-lg flex flex-wrap items-center justify-between gap-4 text-white"
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

          {!cargando && tutorial && renderEscenario(tutorial, true)}

          {!cargando && pendientes.length > 0 && (
            <section>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Por resolver ({pendientes.length})</h2>
              <div className="tarjeta divide-y divide-blue-100 overflow-hidden">{pendientes.map((esc) => renderEscenario(esc, false))}</div>
            </section>
          )}

          {!cargando && completados.length > 0 && (
            <section>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Completados ({completados.length})</h2>
              <div className="tarjeta divide-y divide-blue-100 overflow-hidden">{completados.map((esc) => renderEscenario(esc, false))}</div>
            </section>
          )}
        </div>
      </main>

      {escogiendoModo && (
        <div className="fixed inset-0 bg-blue-950/60 backdrop-blur-sm flex items-center justify-center px-4 z-50">
          <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
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
        <div className="fixed inset-0 bg-blue-950/60 backdrop-blur-sm flex items-center justify-center px-4 z-50">
          <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
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
