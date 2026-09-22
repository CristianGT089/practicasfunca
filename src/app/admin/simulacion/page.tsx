"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Genero = "MASCULINO" | "FEMENINO" | "OTRO";

type Simulacion = {
  id: string;
  nombre: string;
  tipo: "FARMACIA" | "DISPENSARIO";
  estado: "BORRADOR" | "ABIERTA" | "CERRADA";
  creadaEn: string;
  _count: { pacientes: number };
};

const ETIQUETA_ESTADO: Record<Simulacion["estado"], string> = {
  BORRADOR: "Borrador",
  ABIERTA: "Abierta",
  CERRADA: "Cerrada",
};

const COLOR_ESTADO: Record<Simulacion["estado"], string> = {
  BORRADOR: "bg-amber-100 text-amber-700",
  ABIERTA: "bg-green-100 text-green-700",
  CERRADA: "bg-slate-100 text-slate-500",
};

export default function SimulacionPage() {
  const [simulaciones, setSimulaciones] = useState<Simulacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);

  const cargar = useCallback(async () => {
    const res = await fetch("/api/simulaciones");
    const data = await res.json();
    setSimulaciones(data.simulaciones ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (cargando) return <p className="text-slate-500 text-sm">Cargando...</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold text-blue-900">Simulación</h1>
        <button
          onClick={() => setMostrarForm((v) => !v)}
          className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900"
        >
          {mostrarForm ? "Cancelar" : "Nueva simulación"}
        </button>
      </div>

      {mostrarForm && (
        <FormularioCrear
          onCreada={() => {
            setMostrarForm(false);
            cargar();
          }}
        />
      )}

      {simulaciones.length === 0 ? (
        <p className="text-sm text-slate-500">Aún no has creado ninguna simulación.</p>
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
                  {s.tipo === "FARMACIA" ? "Farmacia" : "Dispensario"} · {s._count.pacientes} pacientes
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

function FormularioCrear({ onCreada }: { onCreada: () => void }) {
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<"FARMACIA" | "DISPENSARIO">("DISPENSARIO");
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

  const cantidadFinal = modo === "nombres" ? nombresPacientes.length : cantidad;

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
      body: JSON.stringify({ nombre: nombre.trim(), tipo, numeroEspacios, ...body }),
    });
    const data = await res.json();
    setEnviando(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo crear la simulación");
      return;
    }
    onCreada();
  }

  return (
    <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm mb-6">
      <div className="grid gap-4 sm:grid-cols-2 mb-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Nombre de la simulación</label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="ej. Turno tarde – grupo A"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Módulo</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as "FARMACIA" | "DISPENSARIO")}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="DISPENSARIO">Dispensario</option>
            <option value="FARMACIA">Farmacia</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2 mb-3">
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

      {modo === "cantidad" ? (
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
        <label className="block text-xs font-medium text-slate-500 mb-1">Espacios / puestos del turnero</label>
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
        El turnero de esta simulación se crea automáticamente — no hace falta configurarlo aparte.
      </p>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      <button
        onClick={crear}
        disabled={enviando || !nombre.trim() || cantidadFinal === 0}
        className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-40"
      >
        {enviando ? "Generando pacientes..." : `Generar ${cantidadFinal || ""} paciente(s)`}
      </button>
    </div>
  );
}
