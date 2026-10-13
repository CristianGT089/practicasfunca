"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BarraTrabajo, claseAccionBarra } from "@/components/nucleo/EncabezadoFunca";
import HojaEnfermeriaFormulario from "@/components/modulos/enfermeria/HojaEnfermeria";
import { claseInput } from "@/components/modulos/odontologia/SeccionesHistoria";
import { hojaVacia, normalizarHoja, type HojaEnfermeria } from "@/lib/modulos/enfermeria/hoja";

type Jornada = { id: string; nombre: string; estaciones: number };
type Orden = {
  medicamento: string;
  dosis: string;
  via: string;
  frecuencia: string;
  hora: string;
  medico: string;
  firmada: boolean;
  emitida: string;
  vence: string;
  ultimaAdministracion: string | null;
  nota: string | null;
};
type Ficha = {
  codigo: string;
  paciente: { nombre: string; tipoDocumento: string; documento: string; edad: number; sexo: string; servicio: string; cama: string; diagnostico: string; pesoKg?: number };
  horaRonda: string;
  calculo: { clave: string; pregunta: string; unidad: string } | null;
  ordenes: Orden[];
};

const CLAVE_ESTACION = "enfermeria-estacion";
const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });

/**
 * Estación de enfermería de la ronda de medicamentos: como el software de un hospital. El
 * paciente es un compañero con manilla; el estudiante lo busca por documento, revisa el
 * kárdex y diligencia la hoja de enfermería. Se guarda sola; no hay nota en pantalla.
 */
export default function EstacionEnfermeriaPage() {
  const router = useRouter();
  const [jornada, setJornada] = useState<Jornada | null | undefined>(undefined);
  const [usuario, setUsuario] = useState<{ nombre: string } | null>(null);
  const [estacion, setEstacion] = useState<number | null>(null);
  const [documento, setDocumento] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [atencionId, setAtencionId] = useState<string | null>(null);
  const [hoja, setHoja] = useState<HojaEnfermeria>(hojaVacia);
  const [guardado, setGuardado] = useState<"guardado" | "pendiente" | "guardando" | "error">("guardado");
  const [cerrando, setCerrando] = useState(false);
  const [cerrada, setCerrada] = useState<string | null>(null);
  const ultima = useRef<HojaEnfermeria>(hoja);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cargar = useCallback(async () => {
    const res = await fetch("/api/modulos/enfermeria/jornada/activa");
    if (res.status === 401) return router.push("/");
    const data = await res.json();
    setJornada(data.jornada);
    setUsuario(data.usuario);
    const propia = data.usuario?.espacioNumero;
    let guardada = 0;
    try {
      guardada = Number(localStorage.getItem(CLAVE_ESTACION));
    } catch {
      // sin almacenamiento local
    }
    if (typeof propia === "number" && propia > 0) setEstacion(propia);
    else if (guardada > 0) setEstacion(guardada);
  }, [router]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const guardarAhora = useCallback(async () => {
    if (!atencionId) return;
    setGuardado("guardando");
    const res = await fetch(`/api/modulos/enfermeria/jornada/atenciones/${atencionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hoja: ultima.current }),
    });
    setGuardado(res.ok ? "guardado" : "error");
  }, [atencionId]);

  function cambiar(cambio: Partial<HojaEnfermeria>) {
    setHoja((h) => {
      const nueva = { ...h, ...cambio };
      ultima.current = nueva;
      return nueva;
    });
    setGuardado("pendiente");
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(guardarAhora, 1200);
  }

  useEffect(() => {
    if (guardado !== "pendiente" && guardado !== "guardando") return;
    const aviso = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [guardado]);

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCerrada(null);
    const res = await fetch("/api/modulos/enfermeria/jornada/buscar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documento }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error ?? "No se encontró");
    setFicha(data);
  }

  async function abrirHoja() {
    if (!ficha || !estacion) return;
    const res = await fetch("/api/modulos/enfermeria/jornada/atenciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codigo: ficha.codigo, estacion }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error ?? "No se pudo abrir la hoja");
    const h = normalizarHoja(data.atencion.historia);
    ultima.current = h;
    setHoja(h);
    setAtencionId(data.atencion.id);
    setGuardado("guardado");
  }

  async function cerrar() {
    if (!atencionId || !ficha) return;
    if (temporizador.current) clearTimeout(temporizador.current);
    const res = await fetch(`/api/modulos/enfermeria/jornada/atenciones/${atencionId}/cerrar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hoja: ultima.current }),
    });
    if (!res.ok) {
      setError((await res.json()).error ?? "No se pudo cerrar");
      return;
    }
    setCerrada(ficha.paciente.nombre);
    setCerrando(false);
    setAtencionId(null);
    setFicha(null);
    setDocumento("");
    setHoja(hojaVacia());
  }

  async function salir() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  const etiquetaGuardado = { guardado: "Todo guardado", pendiente: "Cambios sin guardar…", guardando: "Guardando…", error: "No se pudo guardar" }[guardado];

  const barra = (
    <BarraTrabajo titulo="Estación de enfermería" subtitulo={jornada?.nombre} ancho="max-w-[1400px]">
      {estacion && (
        <button
          onClick={() => setEstacion(null)}
          disabled={Boolean(atencionId)}
          className="pildora bg-blue-100 text-blue-800 py-1 disabled:cursor-default"
          title="Cambiar de estación"
        >
          Estación {estacion}
        </button>
      )}
      {usuario && <span className="hidden sm:inline px-2 text-blue-100">{usuario.nombre}</span>}
      <button onClick={salir} className={claseAccionBarra}>
        Salir
      </button>
    </BarraTrabajo>
  );

  if (jornada === undefined) return <div className="p-8 text-sm text-slate-500">Cargando...</div>;

  if (jornada === null) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        {barra}
        <div className="mx-auto max-w-xl px-4 py-16 text-center">
          <h1 className="font-heading text-xl font-semibold text-blue-900">No hay una ronda de enfermería abierta</h1>
          <p className="mt-2 text-sm text-slate-600">Cuando el docente inicie la jornada, vuelve a revisar.</p>
          <button onClick={cargar} className="btn-primario mt-4">
            Volver a revisar
          </button>
        </div>
      </div>
    );
  }

  if (!estacion) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        {barra}
        <div className="mx-auto max-w-xl px-4 py-12">
          <h1 className="font-heading text-xl font-semibold text-blue-900">¿Qué estación es este computador?</h1>
          <p className="mt-1 mb-4 text-sm text-slate-600">Se elige una sola vez.</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {Array.from({ length: jornada.estaciones }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => {
                  try {
                    localStorage.setItem(CLAVE_ESTACION, String(n));
                  } catch {
                    // sin almacenamiento local
                  }
                  setEstacion(n);
                }}
                className="tarjeta-accion py-4 text-center font-heading text-lg font-bold text-blue-900"
              >
                Estación {n}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---------- Hoja abierta ----------
  if (atencionId && ficha) {
    const p = ficha.paciente;
    return (
      <div className="min-h-screen bg-[var(--background)]">
        {barra}
        <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur px-4 sm:px-6">
          <div className="mx-auto max-w-[1400px] flex flex-wrap items-center justify-between gap-3 py-2.5">
            <div>
              <p className="font-heading font-semibold text-blue-900">
                {p.nombre} <span className="text-sm font-normal text-slate-500">· cama {p.cama}</span>
              </p>
              <p className="text-xs text-slate-500">
                {p.tipoDocumento} {p.documento} · {p.edad} años · Ronda de las {ficha.horaRonda}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs ${guardado === "error" ? "text-red-600" : guardado === "guardado" ? "text-emerald-700" : "text-slate-500"}`}>
                {etiquetaGuardado}
              </span>
              <button onClick={() => setCerrando(true)} className="btn-primario px-4 py-2">
                Cerrar y firmar hoja
              </button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-6 grid gap-6 lg:grid-cols-[360px_1fr]">
          <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
            <Kardex ficha={ficha} />
            {ficha.calculo && (
              <section className="tarjeta-sm p-4">
                <h2 className="text-sm font-heading font-semibold text-blue-900">Cálculo</h2>
                <label className="mt-2 flex flex-col gap-1 text-xs font-medium text-slate-600">
                  {ficha.calculo.pregunta}
                  <span className="flex items-center gap-2">
                    <input
                      inputMode="decimal"
                      value={hoja.calculos[ficha.calculo.clave] ?? ""}
                      onChange={(e) => {
                        const v = e.target.value.replace(",", ".");
                        const calculos = { ...hoja.calculos };
                        if (v.trim() === "" || !Number.isFinite(Number(v))) delete calculos[ficha.calculo!.clave];
                        else calculos[ficha.calculo!.clave] = Number(v);
                        cambiar({ calculos });
                      }}
                      className={`${claseInput} w-32`}
                    />
                    <span className="text-slate-500">{ficha.calculo.unidad}</span>
                  </span>
                </label>
              </section>
            )}
          </aside>
          <main className="min-w-0">
            <HojaEnfermeriaFormulario h={hoja} set={cambiar} paciente={{ nombre: p.nombre, edad: p.edad, documento: `${p.tipoDocumento} ${p.documento}` }} />
          </main>
        </div>

        {cerrando && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-950/50 px-4">
            <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
              <h2 className="font-heading text-lg font-bold text-blue-900">¿Cerrar y firmar la hoja de {p.nombre}?</h2>
              <p className="mt-1 text-sm text-slate-600">Después de cerrarla ya no se puede editar.</p>
              {hoja.medicamentos.some((m) => m.administrado === "") && (
                <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Hay medicamentos sin marcar si se administraron o no.
                </p>
              )}
              <div className="mt-5 flex justify-end gap-2">
                <button onClick={() => setCerrando(false)} className="btn text-slate-600 hover:bg-blue-50">
                  Seguir editando
                </button>
                <button onClick={cerrar} className="btn-cta">
                  Cerrar y firmar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------- Buscar paciente ----------
  return (
    <div className="min-h-screen bg-[var(--background)]">
      {barra}
      <div className="mx-auto max-w-xl px-4 py-10">
        {cerrada && (
          <p className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
            Hoja de {cerrada} cerrada y firmada. Siguiente paciente.
          </p>
        )}
        <p className="eyebrow">Ronda de medicamentos</p>
        <h1 className="titulo-pagina mt-1">Buscar paciente</h1>
        <p className="mt-1 mb-4 text-sm text-slate-600">Escribe el número de documento que aparece en la manilla del paciente.</p>
        <form onSubmit={buscar} className="flex gap-2">
          <input
            value={documento}
            onChange={(e) => setDocumento(e.target.value)}
            inputMode="numeric"
            placeholder="Número de documento"
            aria-label="Número de documento"
            className={claseInput}
            autoFocus
          />
          <button className="btn-primario shrink-0">Buscar</button>
        </form>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        {ficha && (
          <div className="mt-6 tarjeta p-5">
            <p className="font-heading text-lg font-bold text-blue-900">{ficha.paciente.nombre}</p>
            <p className="text-sm text-slate-600">
              {ficha.paciente.tipoDocumento} {ficha.paciente.documento} · {ficha.paciente.edad} años · {ficha.paciente.servicio}, cama {ficha.paciente.cama}
            </p>
            <p className="mt-1 text-xs text-slate-500">Antes de abrir la hoja, verifica que este sea el paciente que tienes en frente (nombre completo y documento de la manilla).</p>
            <button onClick={abrirHoja} className="btn-cta mt-4 w-full">
              Abrir hoja de enfermería
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** El kárdex: las órdenes médicas del paciente para esta ronda. */
function Kardex({ ficha }: { ficha: Ficha }) {
  const p = ficha.paciente;
  return (
    <section className="tarjeta-sm p-4">
      <h2 className="text-sm font-heading font-semibold text-blue-900">Kárdex · órdenes médicas</h2>
      <p className="mt-1 text-xs text-slate-600">
        {p.servicio} · cama {p.cama} · {p.diagnostico}
        {p.pesoKg ? ` · peso ${p.pesoKg} kg` : ""}
      </p>
      <p className="mt-1 text-xs text-slate-600">
        Fecha de hoy: <b>{fecha(new Date().toISOString())}</b> · hora de la ronda: <b>{ficha.horaRonda}</b>
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {ficha.ordenes.map((o, i) => (
          <li key={i} className="rounded-xl border border-blue-100 bg-white p-3 text-xs text-slate-700">
            <p className="text-sm font-semibold text-slate-900">
              {o.medicamento} · {o.dosis}
            </p>
            <p>
              {o.via} · {o.frecuencia} · hora: {o.hora}
            </p>
            {o.nota && <p className="mt-1 italic text-slate-600">Indicación: {o.nota}</p>}
            {o.ultimaAdministracion && <p className="mt-1">Última administración registrada: {o.ultimaAdministracion}</p>}
            <p className="mt-1 text-slate-500">
              Ordenó: {o.medico} · {fecha(o.emitida)} · vigente hasta {fecha(o.vence)}
            </p>
            <p className={`mt-0.5 ${o.firmada ? "text-slate-500" : "text-slate-400 italic"}`}>{o.firmada ? "Firma: ✓" : "Firma: (en blanco)"}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
