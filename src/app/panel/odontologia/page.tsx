"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { historiaVacia, normalizarHistoria, REMISIONES, type HistoriaOdontologica } from "@/lib/modulos/odontologia/historia";
import type { Denticion } from "@/lib/modulos/odontologia/odontograma";
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

type Jornada = { id: string; nombre: string; unidades: number; pacientesReales: boolean };

type Admision = {
  nombres: string;
  primerApellido: string;
  segundoApellido: string;
  tipoDocumento: "CC" | "TI" | "RC" | "CE";
  documento: string;
  sexo: "M" | "F";
  fechaNacimiento: string;
  eps: string;
  ocupacion: string;
};

const ADMISION_VACIA: Admision = {
  nombres: "",
  primerApellido: "",
  segundoApellido: "",
  tipoDocumento: "CC",
  documento: "",
  sexo: "F",
  fechaNacimiento: "",
  eps: "",
  ocupacion: "",
};

const claseCampo =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500";
type Encontrado = { casoId: string; paciente: PacienteOdontologia; denticion: Denticion };

const CLAVE_UNIDAD = "odontologia-unidad";

const SECCIONES = [
  { id: "sec-paciente", etiqueta: "Paciente y alerta" },
  { id: "sec-anamnesis", etiqueta: "Anamnesis y antecedentes" },
  { id: "sec-examenes", etiqueta: "Exámenes y radiografía" },
  { id: "sec-odontograma", etiqueta: "Odontograma" },
  { id: "sec-placa", etiqueta: "Placa e higiene oral" },
  { id: "sec-diagnostico", etiqueta: "Diagnóstico y plan" },
  { id: "sec-evolucion", etiqueta: "Evolución" },
];

/**
 * Consultorio de la jornada presencial de Odontología: como el software de una clínica. El
 * paciente es un compañero con una tarjeta; el estudiante lo busca por documento, redacta
 * la historia clínica y, en la misma página, el odontograma. Todo se guarda solo. No hay
 * nota ni pistas: la jornada la califica el docente al final.
 */
export default function ConsultorioOdontologiaPage() {
  const router = useRouter();
  const [jornada, setJornada] = useState<Jornada | null | undefined>(undefined);
  const [usuario, setUsuario] = useState<{ nombre: string } | null>(null);
  const [unidad, setUnidad] = useState<number | null>(null);
  const [documento, setDocumento] = useState("");
  const [encontrado, setEncontrado] = useState<Encontrado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [atencionId, setAtencionId] = useState<string | null>(null);
  const [historia, setHistoria] = useState<HistoriaOdontologica>(historiaVacia);
  const [estadoGuardado, setEstadoGuardado] = useState<"guardado" | "pendiente" | "guardando" | "error">("guardado");
  const [cerrando, setCerrando] = useState(false);
  const [cerrada, setCerrada] = useState<string | null>(null);
  // Pacientes reales: admisión del compañero que se va a examinar.
  const [admision, setAdmision] = useState<Admision>(ADMISION_VACIA);
  const [denticionReal, setDenticionReal] = useState<Denticion>("PERMANENTE");
  const [consentimiento, setConsentimiento] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ultimaHistoria = useRef<HistoriaOdontologica>(historia);

  const cargar = useCallback(async () => {
    const res = await fetch("/api/modulos/odontologia/jornada/activa");
    if (res.status === 401) {
      router.push("/");
      return;
    }
    const data = await res.json();
    setJornada(data.jornada);
    setUsuario(data.usuario);
    // La cuenta del computador ya sabe qué unidad es; si no, se usa la elegida antes.
    const propia = data.usuario?.espacioNumero;
    const guardada = Number(localStorage.getItem(CLAVE_UNIDAD));
    if (typeof propia === "number" && propia > 0) setUnidad(propia);
    else if (guardada > 0) setUnidad(guardada);
  }, [router]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const guardarAhora = useCallback(async () => {
    if (!atencionId) return;
    setEstadoGuardado("guardando");
    const res = await fetch(`/api/modulos/odontologia/jornada/atenciones/${atencionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ historia: ultimaHistoria.current }),
    });
    setEstadoGuardado(res.ok ? "guardado" : "error");
  }, [atencionId]);

  // Guardado automático: 1,5 s después del último cambio.
  function cambiar(cambio: Partial<HistoriaOdontologica>) {
    setHistoria((h) => {
      const nueva = { ...h, ...cambio };
      ultimaHistoria.current = nueva;
      return nueva;
    });
    setEstadoGuardado("pendiente");
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(guardarAhora, 1500);
  }

  useEffect(() => {
    if (estadoGuardado !== "pendiente" && estadoGuardado !== "guardando") return;
    const aviso = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [estadoGuardado]);

  function elegirUnidad(n: number) {
    localStorage.setItem(CLAVE_UNIDAD, String(n));
    setUnidad(n);
  }

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEncontrado(null);
    const res = await fetch("/api/modulos/odontologia/jornada/buscar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documento }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "No se encontró");
      return;
    }
    setEncontrado(data);
  }

  async function abrirHistoria() {
    if (!encontrado || !unidad) return;
    const res = await fetch("/api/modulos/odontologia/jornada/atenciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ casoId: encontrado.casoId, unidad }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "No se pudo abrir la historia");
      return;
    }
    const h = data.atencion.historia ? normalizarHistoria(data.atencion.historia) : historiaVacia();
    ultimaHistoria.current = h;
    setHistoria(h);
    setAtencionId(data.atencion.id);
    setEstadoGuardado("guardado");
    window.scrollTo(0, 0);
  }

  async function abrirHistoriaReal(e: React.FormEvent) {
    e.preventDefault();
    if (!unidad) return;
    setError(null);
    const a = admision;
    if (!a.nombres.trim() || !a.primerApellido.trim() || !a.documento.trim() || !a.fechaNacimiento) {
      setError("Faltan datos: nombres, primer apellido, documento y fecha de nacimiento.");
      return;
    }
    if (!consentimiento) {
      setError("Confirma que tu compañero dio su consentimiento.");
      return;
    }
    const paciente = {
      ...a,
      segundoApellido: a.segundoApellido.trim() || null,
      eps: a.eps.trim() || null,
      ocupacion: a.ocupacion.trim() || null,
    };
    const res = await fetch("/api/modulos/odontologia/jornada/pacientes-reales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paciente, consentimiento: true, unidad, denticion: denticionReal }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "No se pudo abrir la historia");
      return;
    }
    const h = data.atencion.historia ? normalizarHistoria(data.atencion.historia) : historiaVacia();
    ultimaHistoria.current = h;
    setHistoria(h);
    setEncontrado({
      casoId: "",
      denticion: (data.atencion.denticion ?? denticionReal) as Denticion,
      paciente: {
        ...paciente,
        profesion: null,
        estadoCivil: null,
        telefono: null,
        direccion: null,
        contactoEmergencia: null,
        parentescoContacto: null,
        telefonoContacto: null,
      },
    });
    setAtencionId(data.atencion.id);
    setEstadoGuardado("guardado");
    setAdmision(ADMISION_VACIA);
    setConsentimiento(false);
    window.scrollTo(0, 0);
  }

  async function cerrarHistoria(remision: string) {
    if (!atencionId || !encontrado) return;
    if (temporizador.current) clearTimeout(temporizador.current);
    const res = await fetch(`/api/modulos/odontologia/jornada/atenciones/${atencionId}/cerrar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ historia: ultimaHistoria.current, remision }),
    });
    setCerrando(false);
    if (!res.ok) {
      setError((await res.json()).error ?? "No se pudo cerrar la historia");
      return;
    }
    setCerrada(`${encontrado.paciente.nombres} ${encontrado.paciente.primerApellido}`);
    setAtencionId(null);
    setEncontrado(null);
    setDocumento("");
    setHistoria(historiaVacia());
    setEstadoGuardado("guardado");
  }

  async function salir() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  const etiquetaGuardado = {
    guardado: "Todo guardado",
    pendiente: "Cambios sin guardar…",
    guardando: "Guardando…",
    error: "No se pudo guardar: revisa la conexión",
  }[estadoGuardado];

  const barra = (
    <header className="bg-cyan-800 px-4 sm:px-6">
      <div className="mx-auto max-w-[1400px] flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
        <div className="flex items-center gap-3">
          <Image src="/funca-logo.png" alt="FUNCA" width={100} height={50} className="h-8 w-auto bg-white rounded px-1.5 py-1" />
          <div className="text-white">
            <p className="font-heading text-sm font-semibold leading-tight">Consultorio odontológico</p>
            {jornada && <p className="text-[11px] text-cyan-100 leading-tight">{jornada.nombre}</p>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-cyan-50">
          {unidad && (
            <button onClick={() => setUnidad(null)} disabled={Boolean(atencionId)} className="rounded bg-white/10 px-2 py-1 text-xs disabled:cursor-default" title="Cambiar de unidad">
              Unidad {unidad}
            </button>
          )}
          {usuario && <span className="hidden sm:inline">{usuario.nombre}</span>}
          <button onClick={salir} className="hover:text-white">
            Salir
          </button>
        </div>
      </div>
    </header>
  );

  if (jornada === undefined) return <div className="p-8 text-sm text-slate-500">Cargando...</div>;

  if (jornada === null) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        {barra}
        <div className="mx-auto max-w-xl px-4 py-16 text-center">
          <h1 className="font-heading text-xl font-semibold text-cyan-900">No hay una jornada de odontología abierta</h1>
          <p className="mt-2 text-sm text-slate-600">Cuando el docente inicie la jornada, recarga esta página.</p>
          <button onClick={cargar} className="mt-4 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800">
            Volver a revisar
          </button>
        </div>
      </div>
    );
  }

  // ---------- Elegir la unidad (una vez por computador) ----------
  if (!unidad) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        {barra}
        <div className="mx-auto max-w-xl px-4 py-12">
          <h1 className="font-heading text-xl font-semibold text-cyan-900">¿Qué unidad es este computador?</h1>
          <p className="mt-1 mb-4 text-sm text-slate-600">Se elige una sola vez. Es la silla o unidad donde se atiende a los pacientes.</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {Array.from({ length: jornada.unidades }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => elegirUnidad(n)}
                className="rounded-xl border border-cyan-300 bg-white py-4 font-heading text-lg font-bold text-cyan-900 hover:bg-cyan-50"
              >
                Unidad {n}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---------- Historia abierta ----------
  if (atencionId && encontrado) {
    const p = encontrado.paciente;
    return (
      <div className="min-h-screen bg-[var(--background)]">
        {barra}
        <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur px-4 sm:px-6">
          <div className="mx-auto max-w-[1400px] flex flex-wrap items-center justify-between gap-3 py-2.5">
            <div>
              <p className="font-heading font-semibold text-cyan-900">
                {p.nombres} {p.primerApellido} {p.segundoApellido ?? ""}
              </p>
              <p className="text-xs text-slate-500">
                {p.tipoDocumento} {p.documento} · Historia clínica odontológica
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs ${estadoGuardado === "error" ? "text-red-600" : estadoGuardado === "guardado" ? "text-emerald-700" : "text-slate-500"}`}>
                {etiquetaGuardado}
              </span>
              <button
                onClick={() => setCerrando(true)}
                className="rounded-lg bg-cyan-700 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-800"
              >
                Cerrar y firmar historia
              </button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-6 grid gap-6 lg:grid-cols-[210px_1fr]">
          <nav className="hidden lg:block" aria-label="Secciones de la historia">
            <ol className="sticky top-24 flex flex-col gap-1 text-sm">
              {SECCIONES.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="block rounded-lg px-3 py-1.5 text-slate-600 hover:bg-cyan-50 hover:text-cyan-900">
                    {s.etiqueta}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <main className="min-w-0 flex flex-col gap-6">
            <section id="sec-paciente" className="scroll-mt-24 flex flex-col gap-4">
              <SeccionIdentificacion paciente={p} />
              <SeccionAlerta h={historia} set={cambiar} />
            </section>
            <section id="sec-anamnesis" className="scroll-mt-24">
              <SeccionAnamnesis h={historia} set={cambiar} />
            </section>
            <section id="sec-examenes" className="scroll-mt-24">
              <SeccionExamenes h={historia} set={cambiar} />
            </section>
            <section id="sec-odontograma" className="scroll-mt-24">
              <SeccionOdontograma h={historia} set={cambiar} denticion={encontrado.denticion} />
            </section>
            <section id="sec-placa" className="scroll-mt-24">
              <SeccionPlacaHigiene h={historia} set={cambiar} denticion={encontrado.denticion} />
            </section>
            <section id="sec-diagnostico" className="scroll-mt-24">
              <SeccionDiagnosticoPlan h={historia} set={cambiar} />
            </section>
            <section id="sec-evolucion" className="scroll-mt-24">
              <SeccionEvolucion h={historia} set={cambiar} />
            </section>
            <div className="flex justify-end">
              <button onClick={() => setCerrando(true)} className="rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-800">
                Cerrar y firmar historia
              </button>
            </div>
          </main>
        </div>

        {cerrando && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setCerrando(false)}>
            <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Cerrar historia">
              <h2 className="font-heading font-semibold text-cyan-900 mb-1">Cerrar y firmar la historia</h2>
              <p className="text-sm text-slate-600 mb-4">Después de cerrarla ya no se puede editar. ¿Cuál es la conducta con este paciente?</p>
              <div className="flex flex-col gap-2">
                {REMISIONES.map((r) => (
                  <button
                    key={r.codigo}
                    onClick={() => cerrarHistoria(r.codigo)}
                    className="rounded-lg border border-cyan-600 px-3 py-2 text-left text-sm font-medium text-cyan-900 hover:bg-cyan-50"
                  >
                    {r.etiqueta}
                  </button>
                ))}
              </div>
              <button onClick={() => setCerrando(false)} className="mt-4 text-sm text-slate-500 hover:text-slate-700">
                Seguir escribiendo
              </button>
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
      <div className="mx-auto max-w-3xl px-4 py-8 flex flex-col gap-4">
        {cerrada && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-900">
            Historia de <b>{cerrada}</b> cerrada y firmada. Llama al siguiente paciente.
          </div>
        )}
        {jornada.pacientesReales ? (
          <form onSubmit={abrirHistoriaReal} className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm flex flex-col gap-3">
            <div>
              <h1 className="font-heading text-lg font-semibold text-cyan-900">Admisión del paciente</h1>
              <p className="text-sm text-slate-600">
                Registra a tu compañero con los datos de su documento. Solo lo necesario: al cerrar la jornada se borran.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  ["nombres", "Nombres"],
                  ["primerApellido", "Primer apellido"],
                  ["segundoApellido", "Segundo apellido"],
                ] as const
              ).map(([k, etiqueta]) => (
                <label key={k} className="text-xs font-medium text-slate-600">
                  {etiqueta}
                  <input value={admision[k]} onChange={(e) => setAdmision({ ...admision, [k]: e.target.value })} className={`${claseCampo} mt-1`} />
                </label>
              ))}
              <label className="text-xs font-medium text-slate-600">
                Tipo de documento
                <select
                  value={admision.tipoDocumento}
                  onChange={(e) => setAdmision({ ...admision, tipoDocumento: e.target.value as Admision["tipoDocumento"] })}
                  className={`${claseCampo} mt-1`}
                >
                  {["CC", "TI", "RC", "CE"].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium text-slate-600">
                Número de documento
                <input
                  value={admision.documento}
                  inputMode="numeric"
                  onChange={(e) => setAdmision({ ...admision, documento: e.target.value })}
                  className={`${claseCampo} mt-1`}
                />
              </label>
              <label className="text-xs font-medium text-slate-600">
                Fecha de nacimiento
                <input
                  type="date"
                  value={admision.fechaNacimiento}
                  onChange={(e) => setAdmision({ ...admision, fechaNacimiento: e.target.value })}
                  className={`${claseCampo} mt-1`}
                />
              </label>
              <label className="text-xs font-medium text-slate-600">
                Sexo
                <select value={admision.sexo} onChange={(e) => setAdmision({ ...admision, sexo: e.target.value as "M" | "F" })} className={`${claseCampo} mt-1`}>
                  <option value="F">Femenino</option>
                  <option value="M">Masculino</option>
                </select>
              </label>
              <label className="text-xs font-medium text-slate-600">
                EPS
                <input value={admision.eps} onChange={(e) => setAdmision({ ...admision, eps: e.target.value })} className={`${claseCampo} mt-1`} />
              </label>
              <label className="text-xs font-medium text-slate-600">
                Ocupación
                <input value={admision.ocupacion} onChange={(e) => setAdmision({ ...admision, ocupacion: e.target.value })} className={`${claseCampo} mt-1`} />
              </label>
              <label className="text-xs font-medium text-slate-600">
                Dentición
                <select value={denticionReal} onChange={(e) => setDenticionReal(e.target.value as Denticion)} className={`${claseCampo} mt-1`}>
                  <option value="PERMANENTE">Permanente</option>
                  <option value="MIXTA">Mixta</option>
                  <option value="TEMPORAL">Temporal</option>
                </select>
              </label>
            </div>
            <label className="flex items-start gap-2 rounded-lg bg-cyan-50 p-3 text-sm text-cyan-900">
              <input type="checkbox" checked={consentimiento} onChange={(e) => setConsentimiento(e.target.checked)} className="mt-0.5" />
              Mi compañero aceptó que lo examine como parte de la práctica y que sus datos se usen solo durante esta jornada.
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" className="self-start rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-800">
              Abrir historia clínica
            </button>
          </form>
        ) : (
        <section className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
          <h1 className="font-heading text-lg font-semibold text-cyan-900">Admisión del paciente</h1>
          <p className="text-sm text-slate-600 mb-3">Pídele el documento de identidad y búscalo en el sistema.</p>
          <form onSubmit={buscar} className="flex flex-wrap gap-2">
            <label htmlFor="documento" className="sr-only">
              Número de documento
            </label>
            <input
              id="documento"
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              inputMode="numeric"
              placeholder="Número de documento"
              className="flex-1 min-w-48 rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <button type="submit" className="rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-800">
              Buscar
            </button>
          </form>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </section>
        )}

        {encontrado && (
          <>
            <SeccionIdentificacion paciente={encontrado.paciente} />
            <button
              onClick={abrirHistoria}
              className="self-start rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-800"
            >
              Abrir historia clínica
            </button>
          </>
        )}
      </div>
    </div>
  );
}
