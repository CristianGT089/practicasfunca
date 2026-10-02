"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PROPORCION_NORMALES_DEFAULT, situacionesDeTipo, definicionSituacion } from "@/lib/simulacion/situaciones";
import {
  ALERTAS_MEDICAS,
  ANTECEDENTES_ODONTOLOGICOS,
  ANTECEDENTES_PERSONALES,
  EXAMEN_DENTAL,
  EXAMEN_ESTOMATOLOGICO_NA,
  EXAMEN_ESTOMATOLOGICO_SN,
  esperadoVacio,
  type EsperadoOdontologia,
} from "@/lib/modulos/odontologia/historia";
import { generarCasoAleatorio, guionDictado, type SeccionesDictado } from "@/lib/modulos/odontologia/dictado";
import Odontograma from "@/components/modulos/odontologia/Odontograma";
import { GrillaSi } from "@/components/modulos/odontologia/SeccionesHistoria";

export type Tipo = "FARMACIA" | "DISPENSARIO" | "ODONTOLOGIA";
type Genero = "MASCULINO" | "FEMENINO" | "OTRO";
type CasoOdonto = { id: string; titulo: string; activo: boolean; odontologia: { paciente: { nombres: string; primerApellido: string } } | null };
type GrupoOpcion = { id: string; nombre: string; estudiantes: unknown[] };

export type Modalidad = "TURNOS_DISPENSARIO" | "TURNOS_FARMACIA" | "CASOS" | "REALES" | "DICTADO";

const MODALIDADES: { id: Modalidad; tipo: Tipo; titulo: string; texto: string; ideal: string }[] = [
  {
    id: "TURNOS_DISPENSARIO",
    tipo: "DISPENSARIO",
    titulo: "Dispensario con turnos",
    texto: "Turnero y ventanillas. Compañeros llegan con fórmulas generadas; se verifica y entrega.",
    ideal: "Practicar el proceso completo de dispensación.",
  },
  {
    id: "TURNOS_FARMACIA",
    tipo: "FARMACIA",
    titulo: "Farmacia (mostrador) con turnos",
    texto: "Turnero y ventanillas. Se califica lo que se vende a cada paciente.",
    ideal: "Practicar venta y atención en mostrador.",
  },
  {
    id: "CASOS",
    tipo: "ODONTOLOGIA",
    titulo: "Consultorio con casos",
    texto: "Un compañero interpreta un caso con tarjeta; el estudiante hace la historia y el odontograma. Se califica solo.",
    ideal: "Rotar por unidades atendiendo pacientes simulados.",
  },
  {
    id: "REALES",
    tipo: "ODONTOLOGIA",
    titulo: "Pacientes reales",
    texto: "Se examinan entre compañeros, de verdad. Tú calificas con una rúbrica; al cerrar se borran sus datos.",
    ideal: "Examen clínico real en la boca de un compañero.",
  },
  {
    id: "DICTADO",
    tipo: "ODONTOLOGIA",
    titulo: "Dictado",
    texto: "Tú lees un caso en voz alta y todo el grupo lo registra a la vez, cada uno en su cuenta. Nota individual.",
    ideal: "Practicar el registro (odontograma o historia completa) con todo el salón.",
  },
];

const PASOS = ["Modalidad", "Configurar", "Revisar y crear"];

/** Nombre sugerido para no tener que escribirlo: modalidad y fecha (se puede cambiar). */
const nombreSugerido = (m: Modalidad) =>
  `${MODALIDADES.find((x) => x.id === m)?.titulo ?? "Jornada"} — ${new Date().toLocaleDateString("es-CO", { day: "numeric", month: "short" })}`;

/**
 * Crear una jornada presencial en 3 pasos: qué tipo de práctica, sus datos y un resumen
 * antes de crear. El dictado (por ahora solo Odontología) se configura aquí también.
 */
export default function AsistenteJornada({
  onCreada,
  tiposPermitidos,
  modalidadInicial = null,
}: {
  /** Recibe el id de la jornada creada (y si ya quedó iniciada). */
  onCreada: (id: string) => void;
  tiposPermitidos: Tipo[];
  /** Desde un acceso directo (ej. "Dictar un caso"): salta el paso 1. */
  modalidadInicial?: Modalidad | null;
}) {
  const [paso, setPaso] = useState(modalidadInicial ? 1 : 0);
  const [modalidad, setModalidad] = useState<Modalidad | null>(modalidadInicial);
  const def = MODALIDADES.find((m) => m.id === modalidad) ?? null;
  const tipo: Tipo = def?.tipo ?? "DISPENSARIO";
  const esOdonto = tipo === "ODONTOLOGIA";

  const [nombre, setNombre] = useState(() => (modalidadInicial ? nombreSugerido(modalidadInicial) : ""));
  const [grupos, setGrupos] = useState<GrupoOpcion[]>([]);
  const [grupoId, setGrupoId] = useState("");
  const [numeroEspacios, setNumeroEspacios] = useState(3);

  // Turnos
  const [situaciones, setSituaciones] = useState<string[]>([]);
  const [porcentajeNormales, setPorcentajeNormales] = useState(Math.round(PROPORCION_NORMALES_DEFAULT * 100));
  const [modo, setModo] = useState<"nombres" | "cantidad">("cantidad");
  const [nombresTexto, setNombresTexto] = useState("");
  const [generos, setGeneros] = useState<Record<string, Genero | "">>({});
  const [cantidad, setCantidad] = useState(10);

  // Odontología
  const [casosOdonto, setCasosOdonto] = useState<CasoOdonto[]>([]);
  const [casosElegidos, setCasosElegidos] = useState<string[]>([]);

  // Dictado
  const [secciones, setSecciones] = useState<SeccionesDictado>("ODONTOGRAMA");
  const [fuente, setFuente] = useState<"ALEATORIO" | "PROPIO" | "EXISTENTE">("ALEATORIO");
  const [denticion, setDenticion] = useState<"PERMANENTE" | "TEMPORAL">("PERMANENTE");
  const [esperado, setEsperado] = useState<EsperadoOdontologia>(() =>
    modalidadInicial === "DICTADO" ? generarCasoAleatorio("PERMANENTE", false).esperado : esperadoVacio()
  );
  const [casoExistente, setCasoExistente] = useState("");

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/grupos")
      .then((r) => r.json())
      .then((d) => {
        const lista: GrupoOpcion[] = (d.grupos ?? []).filter((g: GrupoOpcion & { activo: boolean }) => g.activo);
        setGrupos(lista);
        if (lista.length === 1) setGrupoId(lista[0].id);
      });
  }, []);

  useEffect(() => {
    if (!esOdonto || casosOdonto.length > 0) return;
    fetch("/api/modulos/odontologia/admin/casos")
      .then((r) => r.json())
      .then((d) => setCasosOdonto((d.casos ?? []).filter((c: CasoOdonto) => c.activo && c.odontologia)));
  }, [esOdonto, casosOdonto.length]);

  const catalogo = situacionesDeTipo(tipo);
  const nombresPacientes = useMemo(
    () =>
      nombresTexto
        .split("\n")
        .map((n) => n.trim())
        .filter(Boolean),
    [nombresTexto]
  );
  const cantidadTurnos = modo === "nombres" ? nombresPacientes.length : cantidad;
  const grupo = grupos.find((g) => g.id === grupoId);

  function elegirModalidad(m: Modalidad) {
    // Si el nombre era el sugerido para otra modalidad (o está vacío), se actualiza.
    if (!nombre.trim() || (modalidad && nombre === nombreSugerido(modalidad))) setNombre(nombreSugerido(m));
    setModalidad(m);
    setError(null);
    if (m === "DICTADO" && fuente === "ALEATORIO" && esperado.odontograma.length === 0) sortear(secciones, denticion);
    setPaso(1);
  }

  function sortear(s: SeccionesDictado, d: "PERMANENTE" | "TEMPORAL") {
    setEsperado(generarCasoAleatorio(d, s === "COMPLETA").esperado);
  }

  // Qué falta para poder seguir (null = listo).
  const faltante = (() => {
    if (!nombre.trim()) return "Ponle un nombre a la jornada";
    if (grupos.length > 0 && !grupoId) return "Elige el grupo";
    if (modalidad === "TURNOS_DISPENSARIO" || modalidad === "TURNOS_FARMACIA") return cantidadTurnos > 0 ? null : "Indica cuántos pacientes";
    if (modalidad === "CASOS") return casosElegidos.length > 0 ? null : "Elige al menos un caso";
    if (modalidad === "DICTADO") {
      if (fuente === "EXISTENTE") return casoExistente ? null : "Elige el caso que vas a dictar";
      return esperado.odontograma.length > 0 ? null : "Marca al menos un hallazgo en el odontograma";
    }
    return null;
  })();

  async function crear(iniciar = false) {
    if (!def) return;
    setEnviando(true);
    setError(null);
    const turnos =
      modo === "nombres"
        ? { pacientes: nombresPacientes.map((n) => ({ nombre: n, genero: generos[n] || null })) }
        : { cantidadPacientes: cantidad };
    const res = await fetch("/api/simulaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: nombre.trim(),
        tipo,
        numeroEspacios,
        grupoId: grupoId || null,
        situaciones: esOdonto ? [] : situaciones.filter((c) => catalogo.some((s) => s.codigo === c)),
        proporcionNormales: porcentajeNormales / 100,
        casosOdontologiaIds: modalidad === "CASOS" ? casosElegidos : [],
        pacientesReales: modalidad === "REALES",
        dictado:
          modalidad === "DICTADO"
            ? {
                secciones,
                fuente,
                denticion,
                esperado: fuente === "EXISTENTE" ? undefined : esperado,
                escenarioId: fuente === "EXISTENTE" ? casoExistente : undefined,
              }
            : null,
        ...(esOdonto ? {} : turnos),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setEnviando(false);
      setError(data.error ?? "No se pudo crear la jornada");
      return;
    }
    // "Crear e iniciar": se ahorra el paso de abrirla después (útil en el dictado).
    if (iniciar) await fetch(`/api/simulaciones/${data.simulacion.id}/abrir`, { method: "POST" });
    setEnviando(false);
    onCreada(data.simulacion.id);
  }

  const disponibles = MODALIDADES.filter((m) => tiposPermitidos.includes(m.tipo));
  const tarjeta = (activa: boolean) =>
    `flex gap-2 rounded-lg border p-2.5 text-sm cursor-pointer ${activa ? "border-blue-700 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`;

  return (
    <div className="tarjeta p-5 sm:p-7 mb-8">
      <ol className="flex flex-wrap gap-2 mb-6 text-xs" aria-label="Pasos">
        {PASOS.map((p, i) => (
          <li
            key={p}
            aria-current={i === paso ? "step" : undefined}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-medium ${
              i === paso ? "bg-blue-800 text-white" : i < paso ? "bg-blue-100 text-blue-800" : "bg-blue-50 text-slate-500"
            }`}
          >
            <span>{i + 1}.</span> {p}
          </li>
        ))}
      </ol>

      {/* ---------- 1. Modalidad ---------- */}
      {paso === 0 && (
        <div>
          <h2 className="font-heading text-lg font-bold text-blue-900 mb-1">¿Qué tipo de práctica es?</h2>
          <p className="text-xs text-slate-500 mb-3">Elige cómo se va a trabajar ese día. En el siguiente paso configuras los detalles.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {disponibles.map((m) => (
              <button
                key={m.id}
                onClick={() => elegirModalidad(m.id)}
                className={`tarjeta-accion ${modalidad === m.id ? "border-blue-700 bg-blue-50" : ""}`}
              >
                <p className="text-[11px] uppercase tracking-wide text-slate-500">{m.tipo === "ODONTOLOGIA" ? "Odontología" : m.tipo === "FARMACIA" ? "Farmacia" : "Dispensario"}</p>
                <p className="font-heading font-semibold text-blue-900">{m.titulo}</p>
                <p className="mt-1 text-xs text-slate-600">{m.texto}</p>
                <p className="mt-2 text-[11px] text-slate-500">
                  <b>Ideal para:</b> {m.ideal}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ---------- 2. Configurar ---------- */}
      {paso === 1 && def && (
        <div className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="nombre-jornada" className="block text-xs font-medium text-slate-500 mb-1">
                Nombre de la jornada
              </label>
              <input
                id="nombre-jornada"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder={modalidad === "DICTADO" ? "ej. Dictado odontograma — grupo A" : "ej. Dispensario — fórmulas vencidas"}
                className="w-full rounded-xl border border-blue-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="grupo-jornada" className="block text-xs font-medium text-slate-500 mb-1">
                Grupo
              </label>
              <select
                id="grupo-jornada"
                value={grupoId}
                onChange={(e) => setGrupoId(e.target.value)}
                className="w-full rounded-xl border border-blue-200 px-3 py-2 text-sm"
              >
                <option value="">Elige un grupo</option>
                {grupos.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nombre} ({g.estudiantes.length} estudiantes)
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-400 mt-1">
                {modalidad === "DICTADO"
                  ? "Cada estudiante del grupo entra con su propia cuenta y recibe su nota."
                  : "Sus estudiantes quedan como participantes. Puedes sumar invitados durante la jornada."}
              </p>
            </div>
          </div>

          {(modalidad === "TURNOS_DISPENSARIO" || modalidad === "TURNOS_FARMACIA") && (
            <>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">¿Qué quieres practicar hoy?</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {catalogo.map((sit) => {
                    const marcada = situaciones.includes(sit.codigo);
                    return (
                      <label key={sit.codigo} className={tarjeta(marcada)}>
                        <input
                          type="checkbox"
                          checked={marcada}
                          onChange={() => setSituaciones((l) => (l.includes(sit.codigo) ? l.filter((x) => x !== sit.codigo) : [...l, sit.codigo]))}
                          className="mt-0.5"
                        />
                        <span>
                          <span className="font-medium text-slate-800">{sit.nombre}</span>
                          {!sit.verificable && <span className="ml-1 text-[11px] text-slate-500">(lo observas tú)</span>}
                          <span className="block text-xs text-slate-500">{sit.queHacer}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
                {situaciones.length === 0 ? (
                  <p className="text-xs text-slate-400 mt-2">Si no eliges ninguna, las situaciones se sortean al azar.</p>
                ) : (
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                    <label htmlFor="normales" className="text-xs font-medium text-slate-500">
                      Casos normales (sin ninguna situación)
                    </label>
                    <input
                      id="normales"
                      type="range"
                      min={0}
                      max={80}
                      step={5}
                      value={porcentajeNormales}
                      onChange={(e) => setPorcentajeNormales(Number(e.target.value))}
                      className="flex-1 min-w-32"
                    />
                    <span className="w-24 text-xs">
                      {porcentajeNormales}% · {Math.round((cantidadTurnos * porcentajeNormales) / 100)} de {cantidadTurnos}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <div className="flex gap-2 mb-3">
                  {(["cantidad", "nombres"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setModo(m)}
                      className={`rounded-full px-3 py-1 text-xs font-medium border ${
                        modo === m ? "border-blue-600 bg-blue-50 text-blue-800" : "border-slate-300 text-slate-500"
                      }`}
                    >
                      {m === "cantidad" ? "Cantidad al azar" : "Nombres de los pacientes"}
                    </button>
                  ))}
                </div>
                {modo === "cantidad" ? (
                  <>
                    <label htmlFor="cantidad" className="block text-xs font-medium text-slate-500 mb-1">
                      Cantidad de pacientes
                    </label>
                    <input
                      id="cantidad"
                      type="number"
                      min={1}
                      max={60}
                      value={cantidad}
                      onChange={(e) => setCantidad(Number(e.target.value))}
                      className="w-full max-w-[10rem] rounded-xl border border-blue-200 px-3 py-2 text-sm"
                    />
                  </>
                ) : (
                  <>
                    <label htmlFor="nombres" className="block text-xs text-slate-500 mb-1">
                      Un nombre por línea — la historia clínica se arma alrededor de cada uno
                    </label>
                    <textarea
                      id="nombres"
                      value={nombresTexto}
                      onChange={(e) => setNombresTexto(e.target.value)}
                      rows={4}
                      placeholder={"María Gómez\nJuan Pérez\nLaura Torres"}
                      className="w-full rounded-xl border border-blue-200 px-2 py-1.5 text-sm font-mono"
                    />
                    {nombresPacientes.length > 0 && (
                      <div className="mt-2 flex flex-col gap-1.5">
                        {nombresPacientes.map((n) => (
                          <div key={n} className="flex items-center gap-2">
                            <span className="flex-1 text-sm text-slate-700 truncate">{n}</span>
                            <select
                              value={generos[n] ?? ""}
                              onChange={(e) => setGeneros((g) => ({ ...g, [n]: e.target.value as Genero | "" }))}
                              aria-label={`Género de ${n}`}
                              className="rounded-xl border border-blue-200 px-2 py-1 text-xs text-slate-600"
                            >
                              <option value="">Género (opcional)</option>
                              <option value="FEMENINO">Femenino</option>
                              <option value="MASCULINO">Masculino</option>
                              <option value="OTRO">Otro</option>
                            </select>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          {modalidad === "CASOS" && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">¿Qué casos se atienden hoy?</p>
              <p className="text-xs text-slate-400 mb-2">
                Cada caso lo interpreta un compañero con su tarjeta impresa. Un mismo caso lo pueden atender varios estudiantes, rotando.
              </p>
              {casosOdonto.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No hay casos de odontología. Créalos en{" "}
                  <Link href="/admin/modulos/odontologia/casos" className="underline">
                    Odontología → Casos
                  </Link>
                  .
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {casosOdonto.map((c) => {
                    const marcado = casosElegidos.includes(c.id);
                    return (
                      <label key={c.id} className={tarjeta(marcado)}>
                        <input
                          type="checkbox"
                          checked={marcado}
                          onChange={() => setCasosElegidos((l) => (l.includes(c.id) ? l.filter((x) => x !== c.id) : [...l, c.id]))}
                          className="mt-0.5"
                        />
                        <span>
                          <span className="font-medium text-slate-800">{c.titulo}</span>
                          <span className="block text-xs text-slate-500">
                            {c.odontologia?.paciente.nombres} {c.odontologia?.paciente.primerApellido}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {modalidad === "DICTADO" && (
            <ConfigDictado
              secciones={secciones}
              setSecciones={(s) => {
                setSecciones(s);
                if (fuente === "ALEATORIO") sortear(s, denticion);
              }}
              fuente={fuente}
              setFuente={(f) => {
                setFuente(f);
                if (f === "ALEATORIO") sortear(secciones, denticion);
                if (f === "PROPIO") setEsperado(esperadoVacio());
              }}
              denticion={denticion}
              setDenticion={(d) => {
                setDenticion(d);
                if (fuente === "ALEATORIO") sortear(secciones, d);
                else setEsperado((e) => ({ ...e, odontograma: [] }));
              }}
              esperado={esperado}
              setEsperado={setEsperado}
              otroAlAzar={() => sortear(secciones, denticion)}
              casos={casosOdonto}
              casoExistente={casoExistente}
              setCasoExistente={setCasoExistente}
            />
          )}

          {modalidad !== "DICTADO" && (
            <div>
              <label htmlFor="espacios" className="block text-xs font-medium text-slate-500 mb-1">
                {esOdonto ? "Unidades (sillas) que se usan" : "Ventanillas que se usan"}
              </label>
              <p className="text-xs text-slate-400 mb-1">Al iniciar la jornada se crea una cuenta por cada una, con su contraseña, lista para cada computador.</p>
              <input
                id="espacios"
                type="number"
                min={1}
                max={20}
                value={numeroEspacios}
                onChange={(e) => setNumeroEspacios(Number(e.target.value))}
                className="w-full max-w-[10rem] rounded-xl border border-blue-200 px-3 py-2 text-sm"
              />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
            <button onClick={() => setPaso(0)} className="btn text-slate-600 hover:bg-blue-50">
              ← Cambiar modalidad
            </button>
            <button onClick={() => setPaso(2)} disabled={faltante !== null} className="btn-primario">
              Revisar →
            </button>
            {faltante && <span className="text-xs text-amber-700">{faltante}</span>}
          </div>
        </div>
      )}

      {/* ---------- 3. Revisar ---------- */}
      {paso === 2 && def && (
        <div className="flex flex-col gap-4">
          <h2 className="font-heading font-semibold text-blue-900">Revisa antes de crear</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-slate-500">Nombre</dt>
            <dd className="text-slate-800">{nombre}</dd>
            <dt className="text-slate-500">Modalidad</dt>
            <dd className="text-slate-800">{def.titulo}</dd>
            <dt className="text-slate-500">Grupo</dt>
            <dd className="text-slate-800">{grupo ? `${grupo.nombre} (${grupo.estudiantes.length} estudiantes)` : "Sin grupo"}</dd>
            {(modalidad === "TURNOS_DISPENSARIO" || modalidad === "TURNOS_FARMACIA") && (
              <>
                <dt className="text-slate-500">Pacientes</dt>
                <dd className="text-slate-800">{cantidadTurnos}</dd>
                <dt className="text-slate-500">Situaciones</dt>
                <dd className="text-slate-800">
                  {situaciones.length ? situaciones.map((c) => definicionSituacion(c)?.nombre ?? c).join(", ") : "Al azar"}
                </dd>
              </>
            )}
            {modalidad === "CASOS" && (
              <>
                <dt className="text-slate-500">Casos</dt>
                <dd className="text-slate-800">{casosOdonto.filter((c) => casosElegidos.includes(c.id)).map((c) => c.titulo).join(", ")}</dd>
              </>
            )}
            {modalidad !== "DICTADO" && (
              <>
                <dt className="text-slate-500">{esOdonto ? "Unidades" : "Ventanillas"}</dt>
                <dd className="text-slate-800">{numeroEspacios} (una cuenta por cada una al iniciar)</dd>
              </>
            )}
            {modalidad === "DICTADO" && (
              <>
                <dt className="text-slate-500">Qué se dicta</dt>
                <dd className="text-slate-800">{secciones === "COMPLETA" ? "La historia completa (alerta, antecedentes, exámenes y odontograma)" : "Solo el odontograma"}</dd>
                <dt className="text-slate-500">Caso</dt>
                <dd className="text-slate-800">
                  {fuente === "EXISTENTE"
                    ? casosOdonto.find((c) => c.id === casoExistente)?.titulo
                    : `${fuente === "ALEATORIO" ? "Al azar" : "Marcado por ti"} · ${esperado.odontograma.length} marca(s) en ${new Set(esperado.odontograma.map((m) => m.diente)).size} diente(s)`}
                </dd>
              </>
            )}
          </dl>
          {modalidad === "DICTADO" && (
            <p className="rounded-2xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-900">
              Al iniciar, los estudiantes del grupo ven &ldquo;Tienes un dictado en curso&rdquo; en su panel. Tú tendrás el guion para leer, el avance
              de cada uno en vivo, y botones para pausar y terminar. Al terminar se califica a cada uno y queda el mapa de errores por diente.
            </p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-4">
            <button onClick={() => setPaso(1)} className="btn text-slate-600 hover:bg-blue-50">
              ← Volver
            </button>
            {modalidad === "DICTADO" ? (
              <>
                <button onClick={() => crear(true)} disabled={enviando} className="btn-cta">
                  {enviando ? "Creando..." : "Crear e iniciar el dictado"}
                </button>
                <button onClick={() => crear(false)} disabled={enviando} className="btn-secundario">
                  Crear y dejar listo para después
                </button>
              </>
            ) : (
              <button onClick={() => crear(false)} disabled={enviando} className="btn-cta">
                {enviando ? "Creando..." : "Crear jornada"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ConfigDictado(p: {
  secciones: SeccionesDictado;
  setSecciones: (s: SeccionesDictado) => void;
  fuente: "ALEATORIO" | "PROPIO" | "EXISTENTE";
  setFuente: (f: "ALEATORIO" | "PROPIO" | "EXISTENTE") => void;
  denticion: "PERMANENTE" | "TEMPORAL";
  setDenticion: (d: "PERMANENTE" | "TEMPORAL") => void;
  esperado: EsperadoOdontologia;
  setEsperado: (f: (e: EsperadoOdontologia) => EsperadoOdontologia) => void;
  otroAlAzar: () => void;
  casos: CasoOdonto[];
  casoExistente: string;
  setCasoExistente: (id: string) => void;
}) {
  const completa = p.secciones === "COMPLETA";
  const opcion = (activa: boolean) =>
    `flex gap-2 rounded-lg border p-2.5 text-sm cursor-pointer ${activa ? "border-blue-700 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`;
  const set = (cambio: Partial<EsperadoOdontologia>) => p.setEsperado((e) => ({ ...e, ...cambio }));
  const lineas = p.fuente === "EXISTENTE" ? [] : guionDictado(p.esperado, p.secciones).length;

  return (
    <div className="flex flex-col gap-4">
      <fieldset>
        <legend className="text-xs font-medium text-slate-500 mb-1">¿Qué vas a dictar?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { v: "ODONTOGRAMA" as const, t: "Solo el odontograma", d: "Diente por diente. Lo más rápido para practicar convenciones." },
            { v: "COMPLETA" as const, t: "La historia completa", d: "Alerta médica, antecedentes, exámenes y odontograma." },
          ].map((o) => (
            <label key={o.v} className={opcion(p.secciones === o.v)}>
              <input type="radio" name="secciones" checked={p.secciones === o.v} onChange={() => p.setSecciones(o.v)} className="mt-0.5" />
              <span>
                <span className="font-medium text-slate-800">{o.t}</span>
                <span className="block text-xs text-slate-500">{o.d}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-xs font-medium text-slate-500 mb-1">¿De dónde sale el caso?</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { v: "ALEATORIO" as const, t: "Al azar", d: "Lo arma el sistema. Puedes retocarlo." },
            { v: "PROPIO" as const, t: "Lo marco yo", d: "Marcas el odontograma del caso aquí mismo." },
            { v: "EXISTENTE" as const, t: "Un caso creado", d: "Uno de Odontología → Casos." },
          ].map((o) => (
            <label key={o.v} className={opcion(p.fuente === o.v)}>
              <input type="radio" name="fuente" checked={p.fuente === o.v} onChange={() => p.setFuente(o.v)} className="mt-0.5" />
              <span>
                <span className="font-medium text-slate-800">{o.t}</span>
                <span className="block text-xs text-slate-500">{o.d}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {p.fuente === "EXISTENTE" ? (
        <div>
          <label htmlFor="caso-existente" className="block text-xs font-medium text-slate-500 mb-1">
            Caso
          </label>
          <select
            id="caso-existente"
            value={p.casoExistente}
            onChange={(e) => p.setCasoExistente(e.target.value)}
            className="w-full rounded-xl border border-blue-200 px-3 py-2 text-sm"
          >
            <option value="">Elige un caso</option>
            {p.casos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.titulo}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1.5" role="radiogroup" aria-label="Dentición">
              {(["PERMANENTE", "TEMPORAL"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={p.denticion === d}
                  onClick={() => p.setDenticion(d)}
                  className={`rounded-full px-3 py-1 text-xs font-medium border ${
                    p.denticion === d ? "border-blue-700 bg-blue-50 text-blue-800" : "border-slate-300 text-slate-500"
                  }`}
                >
                  {d === "PERMANENTE" ? "Adulto (permanente)" : "Niño (temporal)"}
                </button>
              ))}
            </div>
            {p.fuente === "ALEATORIO" && (
              <button type="button" onClick={p.otroAlAzar} className="rounded-lg border border-blue-700 px-3 py-1 text-xs font-semibold text-blue-800 hover:bg-blue-50">
                Otro al azar
              </button>
            )}
            <span className="text-xs text-slate-500">
              {lineas} línea(s) para dictar · el paciente (nombre, documento) se inventa al crear
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 p-3">
            <p className="text-xs font-semibold text-slate-600 mb-2">
              Odontograma del caso {p.fuente === "ALEATORIO" ? "(puedes cambiar lo que quieras)" : "(clic o clic derecho en cada diente)"}
            </p>
            <Odontograma denticion={p.denticion} marcas={p.esperado.odontograma} onChange={(odontograma) => set({ odontograma })} />
          </div>

          {completa && (
            <div className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3">
              <p className="text-xs font-semibold text-slate-600">Resto de la historia que vas a dictar</p>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 mb-1">Alerta médica</p>
                <GrillaSi items={ALERTAS_MEDICAS} seleccion={p.esperado.alertaMedica} onChange={(v) => set({ alertaMedica: v })} etiquetaSi="Alerta" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 mb-1">Antecedentes personales</p>
                <GrillaSi items={ANTECEDENTES_PERSONALES} seleccion={p.esperado.antecedentesPersonales} onChange={(v) => set({ antecedentesPersonales: v })} />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 mb-1">Antecedentes odontológicos</p>
                <GrillaSi
                  items={ANTECEDENTES_ODONTOLOGICOS}
                  seleccion={p.esperado.antecedentesOdontologicos}
                  onChange={(v) => set({ antecedentesOdontologicos: v })}
                />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 mb-1">Examen estomatológico (marcado = alterado)</p>
                <GrillaSi
                  items={[...EXAMEN_ESTOMATOLOGICO_NA, ...EXAMEN_ESTOMATOLOGICO_SN]}
                  seleccion={p.esperado.examenEstomatologico}
                  onChange={(v) => set({ examenEstomatologico: v })}
                  etiquetaSi="Sí"
                />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 mb-1">Examen pulpar, dental y periodontal</p>
                <GrillaSi items={EXAMEN_DENTAL.flatMap((g) => g.items)} seleccion={p.esperado.examenDental} onChange={(v) => set({ examenDental: v })} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
