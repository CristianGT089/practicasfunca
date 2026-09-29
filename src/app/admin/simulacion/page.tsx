"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PROPORCION_NORMALES_DEFAULT, situacionesDeTipo } from "@/lib/simulacion/situaciones";

type Genero = "MASCULINO" | "FEMENINO" | "OTRO";

type Simulacion = {
  id: string;
  nombre: string;
  tipo: "FARMACIA" | "DISPENSARIO";
  estado: "BORRADOR" | "ABIERTA" | "EN_REVISION" | "CERRADA";
  creadaEn: string;
  situaciones: string[];
  grupo: { nombre: string } | null;
  _count: { pacientes: number; atenciones: number; participantes: number };
};
type Tipo = "FARMACIA" | "DISPENSARIO" | "ODONTOLOGIA";
type CasoOdonto = { id: string; titulo: string; activo: boolean; odontologia: { paciente: { nombres: string; primerApellido: string } } | null };
type GrupoOpcion = { id: string; nombre: string; estudiantes: unknown[] };

const ETIQUETA_ESTADO: Record<Simulacion["estado"], string> = {
  BORRADOR: "Preparando",
  ABIERTA: "En curso",
  EN_REVISION: "Por confirmar",
  CERRADA: "Calificada",
};

const COLOR_ESTADO: Record<Simulacion["estado"], string> = {
  BORRADOR: "bg-amber-100 text-amber-700",
  ABIERTA: "bg-green-100 text-green-700",
  EN_REVISION: "bg-blue-100 text-blue-800",
  CERRADA: "bg-slate-100 text-slate-500",
};

const ETIQUETA_TIPO: Record<Tipo, string> = { FARMACIA: "Farmacia", DISPENSARIO: "Dispensario", ODONTOLOGIA: "Odontología (historia clínica)" };

export default function SimulacionPage() {
  const [simulaciones, setSimulaciones] = useState<Simulacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [tiposPermitidos, setTiposPermitidos] = useState<Tipo[]>([]);

  const cargar = useCallback(async () => {
    const res = await fetch("/api/simulaciones");
    const data = await res.json();
    setSimulaciones(data.simulaciones ?? []);
    setTiposPermitidos(data.tiposPermitidos ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (cargando) return <p className="text-slate-500 text-sm">Cargando...</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold text-blue-900">Jornadas presenciales</h1>
        {tiposPermitidos.length > 0 && (
          <button
            onClick={() => setMostrarForm((v) => !v)}
            className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900"
          >
            {mostrarForm ? "Cancelar" : "Nueva jornada"}
          </button>
        )}
      </div>
      <p className="text-sm text-slate-500 -mt-4 mb-6">
        La práctica en vivo: turnero, ventanillas y compañeros haciendo de pacientes. El estudiante no ve su nota; tú finalizas la
        jornada, confirmas quién atendió a quién y se genera el reporte para repasar en clase.
      </p>

      {mostrarForm && (
        <FormularioCrear
          tiposPermitidos={tiposPermitidos}
          onCreada={() => {
            setMostrarForm(false);
            cargar();
          }}
        />
      )}

      {simulaciones.length === 0 ? (
        <p className="text-sm text-slate-500">Aún no hay jornadas.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {simulaciones.map((s) => (
            <Link
              key={s.id}
              href={`/admin/simulacion/${s.id}`}
              className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm flex items-center justify-between hover:border-blue-300"
            >
              <div>
                <p className="text-sm font-medium text-slate-800">{s.nombre}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {ETIQUETA_TIPO[s.tipo]}
                  {s.grupo && ` · ${s.grupo.nombre}`} ·{" "}
                  {s.estado === "CERRADA" ? `${s._count.atenciones} atenciones` : `${s._count.pacientes} pacientes`}
                  {` · ${new Date(s.creadaEn).toLocaleDateString("es-CO")}`}
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${COLOR_ESTADO[s.estado]}`}>
                {ETIQUETA_ESTADO[s.estado]}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function FormularioCrear({ onCreada, tiposPermitidos }: { onCreada: () => void; tiposPermitidos: Tipo[] }) {
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<Tipo>(tiposPermitidos.includes("DISPENSARIO") ? "DISPENSARIO" : tiposPermitidos[0]);
  const [grupos, setGrupos] = useState<GrupoOpcion[]>([]);
  const [grupoId, setGrupoId] = useState("");
  const [situaciones, setSituaciones] = useState<string[]>([]);
  const [porcentajeNormales, setPorcentajeNormales] = useState(Math.round(PROPORCION_NORMALES_DEFAULT * 100));
  const [casosOdonto, setCasosOdonto] = useState<CasoOdonto[]>([]);
  const [casosElegidos, setCasosElegidos] = useState<string[]>([]);
  const esOdonto = tipo === "ODONTOLOGIA";

  useEffect(() => {
    if (!esOdonto || casosOdonto.length > 0) return;
    fetch("/api/modulos/odontologia/admin/casos")
      .then((r) => r.json())
      .then((d) => setCasosOdonto((d.casos ?? []).filter((c: CasoOdonto) => c.activo && c.odontologia)));
  }, [esOdonto, casosOdonto.length]);

  useEffect(() => {
    fetch("/api/admin/grupos")
      .then((r) => r.json())
      .then((d) => {
        const lista: GrupoOpcion[] = (d.grupos ?? []).filter((g: GrupoOpcion & { activo: boolean }) => g.activo);
        setGrupos(lista);
        if (lista.length === 1) setGrupoId(lista[0].id);
      });
  }, []);

  const catalogo = situacionesDeTipo(tipo);
  const [modo, setModo] = useState<"nombres" | "cantidad">("cantidad");
  const [nombresTexto, setNombresTexto] = useState("");
  const [generos, setGeneros] = useState<Record<string, Genero | "">>({});
  const [cantidad, setCantidad] = useState(10);
  const [numeroEspacios, setNumeroEspacios] = useState(3);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Un nombre por línea, sin líneas vacías — igual que en Puestos temporales.
  const nombresPacientes = useMemo(
    () =>
      nombresTexto
        .split("\n")
        .map((n) => n.trim())
        .filter(Boolean),
    [nombresTexto]
  );

  const cantidadFinal = esOdonto ? casosElegidos.length : modo === "nombres" ? nombresPacientes.length : cantidad;

  async function crear() {
    if (!nombre.trim() || cantidadFinal === 0) return;
    setEnviando(true);
    setError(null);
    const body =
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
        casosOdontologiaIds: esOdonto ? casosElegidos : [],
        proporcionNormales: porcentajeNormales / 100,
        ...body,
      }),
    });
    const data = await res.json();
    setEnviando(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo crear la jornada");
      return;
    }
    onCreada();
  }

  return (
    <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm mb-6">
      <div className="grid gap-4 sm:grid-cols-2 mb-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Nombre de la jornada</label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="ej. Dispensario — fórmulas vencidas"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Módulo</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as Tipo)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {tiposPermitidos.map((t) => (
              <option key={t} value={t}>
                {ETIQUETA_TIPO[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-500 mb-1">Grupo que hace la jornada</label>
          <select value={grupoId} onChange={(e) => setGrupoId(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Elige un grupo</option>
            {grupos.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nombre} ({g.estudiantes.length} estudiantes)
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-400 mt-1">Sus estudiantes quedan como participantes. Puedes sumar invitados durante la jornada.</p>
        </div>
      </div>

      {esOdonto && (
        <div className="mb-4">
          <p className="text-xs font-medium text-slate-500 mb-1">¿Qué casos se atienden hoy?</p>
          <p className="text-xs text-slate-400 mb-2">
            Cada caso lo interpreta un compañero con su tarjeta impresa. Un mismo caso lo pueden atender varios estudiantes, rotando.
          </p>
          {casosOdonto.length === 0 ? (
            <p className="text-xs text-slate-500">
              No hay casos de odontología. Créalos en <Link href="/admin/modulos/odontologia/casos" className="underline">Odontología → Casos</Link>.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {casosOdonto.map((c) => {
                const marcado = casosElegidos.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className={`flex gap-2 rounded-lg border p-2.5 text-sm cursor-pointer ${marcado ? "border-cyan-600 bg-cyan-50" : "border-slate-200 hover:bg-slate-50"}`}
                  >
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

      <div className={`mb-4 ${esOdonto ? "hidden" : ""}`}>
        <p className="text-xs font-medium text-slate-500 mb-1">¿Qué quieres practicar hoy?</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {catalogo.map((sit) => {
            const marcada = situaciones.includes(sit.codigo);
            return (
              <label
                key={sit.codigo}
                className={`flex gap-2 rounded-lg border p-2.5 text-sm cursor-pointer ${
                  marcada ? "border-blue-600 bg-blue-50" : "border-slate-200 hover:bg-slate-50"
                }`}
              >
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
              {porcentajeNormales}% · {Math.round((cantidadFinal * porcentajeNormales) / 100)} de {cantidadFinal}
            </span>
          </div>
        )}
      </div>

      <div className={`flex gap-2 mb-3 ${esOdonto ? "hidden" : ""}`}>
        <button
          type="button"
          onClick={() => setModo("cantidad")}
          className={`rounded-full px-3 py-1 text-xs font-medium border ${
            modo === "cantidad" ? "border-blue-600 bg-blue-50 text-blue-800" : "border-slate-300 text-slate-500"
          }`}
        >
          Cantidad al azar
        </button>
        <button
          type="button"
          onClick={() => setModo("nombres")}
          className={`rounded-full px-3 py-1 text-xs font-medium border ${
            modo === "nombres" ? "border-blue-600 bg-blue-50 text-blue-800" : "border-slate-300 text-slate-500"
          }`}
        >
          Nombres de los pacientes
        </button>
      </div>

      {esOdonto ? null : modo === "cantidad" ? (
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-500 mb-1">Cantidad de pacientes</label>
          <input
            type="number"
            min={1}
            max={60}
            value={cantidad}
            onChange={(e) => setCantidad(Number(e.target.value))}
            className="w-full max-w-[10rem] rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      ) : (
        <div className="mb-4">
          <label className="block text-xs text-slate-500 mb-1">
            Un nombre por línea — la historia clínica se arma alrededor de cada uno
          </label>
          <textarea
            value={nombresTexto}
            onChange={(e) => setNombresTexto(e.target.value)}
            rows={4}
            placeholder={"María Gómez\nJuan Pérez\nLaura Torres"}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-mono"
          />
          {nombresPacientes.length > 0 && (
            <div className="mt-2 flex flex-col gap-1.5">
              {nombresPacientes.map((n) => (
                <div key={n} className="flex items-center gap-2">
                  <span className="flex-1 text-sm text-slate-700 truncate">{n}</span>
                  <select
                    value={generos[n] ?? ""}
                    onChange={(e) => setGeneros((g) => ({ ...g, [n]: e.target.value as Genero | "" }))}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-600"
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
          <p className="text-xs text-slate-400 mt-1.5">
            El género es opcional, pero ayuda a que el diagnóstico generado tenga sentido (ej. no asigna
            &ldquo;control prenatal&rdquo; a un hombre).
          </p>
        </div>
      )}

      <div className="mb-4">
        <label className="block text-xs font-medium text-slate-500 mb-1">
          {esOdonto ? "Unidades (sillas) que se usan" : "Espacios / puestos del turnero"}
        </label>
        <input
          type="number"
          min={1}
          max={20}
          value={numeroEspacios}
          onChange={(e) => setNumeroEspacios(Number(e.target.value))}
          className="w-full max-w-[10rem] rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <p className="text-xs text-slate-400 mb-4">
        El turnero de esta jornada se crea automáticamente; no hace falta configurarlo aparte.
      </p>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      <button
        onClick={crear}
        disabled={enviando || !nombre.trim() || cantidadFinal === 0}
        className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-40"
      >
        {enviando ? "Creando..." : esOdonto ? `Crear jornada con ${cantidadFinal} caso(s)` : `Generar ${cantidadFinal || ""} paciente(s)`}
      </button>
    </div>
  );
}
