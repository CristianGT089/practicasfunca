"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Servicio = { codigo: string; nombre: string; prefijo: string };
type Categoria = { codigo: string; nombre: string };
type Plantilla = {
  id: string;
  nombre: string;
  numeroEspacios: number;
  servicios: Servicio[];
  categorias: Categoria[];
  reglaPrioridad: "ESTRICTA" | "INTERCALADA";
  activo: boolean;
  sesionActiva: string | null;
};

export default function PlantillasTurneroPage() {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [cargando, setCargando] = useState(true);
  const [nombre, setNombre] = useState("");
  const [numeroEspacios, setNumeroEspacios] = useState(3);

  const cargar = useCallback(async () => {
    const res = await fetch("/api/turnero/plantillas");
    const data = await res.json();
    setPlantillas(data.plantillas ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function crear() {
    if (!nombre.trim()) return;
    await fetch("/api/turnero/plantillas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, numeroEspacios }),
    });
    setNombre("");
    setNumeroEspacios(3);
    cargar();
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold text-blue-900">Turneros</h1>
        <Link href="/admin/turnero" className="text-sm text-blue-700 hover:underline">
          ← Control
        </Link>
      </div>

      <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm mb-6">
        <h2 className="text-sm font-heading font-semibold text-blue-900 mb-3">Nuevo turnero</h2>
        <div className="flex gap-2">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre (ej: Droguería mostrador)"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
            Espacios
            <input
              type="number"
              min={1}
              max={20}
              value={numeroEspacios}
              onChange={(e) => setNumeroEspacios(Number(e.target.value))}
              className="w-16 rounded-lg border border-slate-300 px-2 py-2 text-sm"
            />
          </label>
          <button onClick={crear} className="rounded-lg bg-blue-800 px-4 text-sm font-medium text-white hover:bg-blue-900">
            Crear
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-2">Servicios y categorías arrancan con los valores por defecto; edítalos abajo.</p>
      </div>

      {cargando && <p className="text-slate-500 text-sm">Cargando...</p>}

      <div className="flex flex-col gap-3">
        {plantillas.map((p) => (
          <EditorPlantilla key={p.id} plantilla={p} onCambio={cargar} />
        ))}
      </div>
    </div>
  );
}

function EditorPlantilla({ plantilla, onCambio }: { plantilla: Plantilla; onCambio: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState(plantilla.nombre);
  const [numeroEspacios, setNumeroEspacios] = useState(plantilla.numeroEspacios);
  const [regla, setRegla] = useState(plantilla.reglaPrioridad);
  const [servicios, setServicios] = useState<Servicio[]>(plantilla.servicios);
  const [categorias, setCategorias] = useState<Categoria[]>(plantilla.categorias);
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    setGuardando(true);
    await fetch(`/api/turnero/plantillas/${plantilla.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, numeroEspacios, reglaPrioridad: regla, servicios, categorias }),
    });
    setGuardando(false);
    setAbierto(false);
    onCambio();
  }

  async function eliminar() {
    if (!confirm(`¿Eliminar "${plantilla.nombre}"?`)) return;
    await fetch(`/api/turnero/plantillas/${plantilla.id}`, { method: "DELETE" });
    onCambio();
  }

  return (
    <div className="rounded-xl bg-white border border-slate-200 shadow-sm">
      <div className="p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-800">
            {plantilla.nombre}
            {!plantilla.activo && <span className="ml-2 text-xs text-slate-400">(inactivo)</span>}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {plantilla.numeroEspacios} espacios · {plantilla.servicios.length} servicios ·{" "}
            {plantilla.categorias.length} categorías · prioridad {plantilla.reglaPrioridad.toLowerCase()}
          </p>
        </div>
        <button onClick={() => setAbierto((v) => !v)} className="text-xs text-blue-700 hover:underline">
          {abierto ? "Cerrar" : "Editar"}
        </button>
      </div>

      {abierto && (
        <div className="border-t border-slate-100 p-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-slate-500">
              Nombre
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-xs text-slate-500">
              Espacios (nuevas sesiones)
              <input
                type="number"
                min={1}
                max={20}
                value={numeroEspacios}
                onChange={(e) => setNumeroEspacios(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
          </div>

          <label className="text-xs text-slate-500">
            Regla de prioridad
            <select
              value={regla}
              onChange={(e) => setRegla(e.target.value as "ESTRICTA" | "INTERCALADA")}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="ESTRICTA">Estricta — prioritarios primero</option>
              <option value="INTERCALADA">Intercalada — máx. 2 prioritarios seguidos</option>
            </select>
          </label>

          <FilasEditables
            titulo="Servicios"
            columnas={["codigo", "nombre", "prefijo"]}
            filas={servicios as unknown as Record<string, string>[]}
            onChange={(f) => setServicios(f as unknown as Servicio[])}
            nueva={{ codigo: "", nombre: "", prefijo: "" }}
          />
          <FilasEditables
            titulo="Categorías de prioridad"
            columnas={["codigo", "nombre"]}
            filas={categorias as unknown as Record<string, string>[]}
            onChange={(f) => setCategorias(f as unknown as Categoria[])}
            nueva={{ codigo: "", nombre: "" }}
          />

          <div className="flex items-center gap-3">
            <button
              onClick={guardar}
              disabled={guardando}
              className="rounded-lg bg-blue-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-50"
            >
              Guardar
            </button>
            <button onClick={eliminar} className="text-xs text-slate-400 hover:text-red-600">
              Eliminar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilasEditables({
  titulo,
  columnas,
  filas,
  onChange,
  nueva,
}: {
  titulo: string;
  columnas: string[];
  filas: Record<string, string>[];
  onChange: (filas: Record<string, string>[]) => void;
  nueva: Record<string, string>;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 mb-1">{titulo}</p>
      <div className="flex flex-col gap-1.5">
        {filas.map((fila, i) => (
          <div key={i} className="flex gap-1.5">
            {columnas.map((col) => (
              <input
                key={col}
                value={fila[col] ?? ""}
                placeholder={col}
                onChange={(e) => {
                  const copia = filas.map((f) => ({ ...f }));
                  copia[i][col] = e.target.value;
                  onChange(copia);
                }}
                className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-xs"
              />
            ))}
            <button
              onClick={() => onChange(filas.filter((_, j) => j !== i))}
              className="px-2 text-slate-400 hover:text-red-600"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={() => onChange([...filas, { ...nueva }])}
        className="mt-1.5 text-xs text-blue-700 hover:underline"
      >
        + Agregar
      </button>
    </div>
  );
}
