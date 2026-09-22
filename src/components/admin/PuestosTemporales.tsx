"use client";

import { useEffect, useMemo, useState } from "react";
import { RUTAS_DIRECTAS } from "@/lib/nucleo/rutasDirectas";

type Modulo = { id: string; slug: string; nombre: string; activo: boolean };
type Credencial = { nombre: string; usuario: string; password: string };
type Genero = "MASCULINO" | "FEMENINO" | "OTRO";

export function etiquetaRutaDirecta(ruta: string): string {
  return RUTAS_DIRECTAS.find((r) => r.valor === ruta)?.etiqueta ?? ruta;
}

/**
 * Crea de una vez N cuentas de estudiante para una sala de cómputo (un puesto = un
 * computador), ya matriculadas en los módulos elegidos. Se usa en dos lugares:
 *
 * - Estudiantes (`sesionTurneroId` ausente): puestos sueltos, se limpian a mano.
 * - Control del turnero (`sesionTurneroId` presente): los puestos quedan enlazados a esa
 *   sesión y se borran solos cuando el turnero se cierra — no hace falta limpiarlos aparte.
 *
 * Dos modos para nombrar los puestos: con los nombres reales de los estudiantes (uno por
 * línea, con género opcional cada uno) o genérico ("Prefijo 1", "Prefijo 2"...) cuando no
 * se tienen los nombres a la mano.
 */
export default function PuestosTemporales({
  sesionTurneroId,
  titulo = "Puestos temporales para sala de cómputo",
  descripcion = "Crea varias cuentas de una vez (una por computador) ya matriculadas en el módulo que necesites.",
  colapsable = true,
  onCreados,
}: {
  sesionTurneroId?: string;
  titulo?: string;
  descripcion?: string;
  colapsable?: boolean;
  onCreados: () => void;
}) {
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [abierto, setAbierto] = useState(!colapsable);
  const [modo, setModo] = useState<"nombres" | "generico">("nombres");
  const [nombresTexto, setNombresTexto] = useState("");
  const [generos, setGeneros] = useState<Record<string, Genero | "">>({});
  const [cantidad, setCantidad] = useState(3);
  const [prefijo, setPrefijo] = useState("Dispensación");
  const [rutaDirecta, setRutaDirecta] = useState<string>("/panel/dispensacion");
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [creando, setCreando] = useState(false);
  const [creados, setCreados] = useState<Credencial[] | null>(null);

  useEffect(() => {
    fetch("/api/admin/modulos")
      .then((res) => res.json())
      .then((data) => setModulos((data.modulos ?? []).filter((m: Modulo) => m.activo)))
      .catch(() => {});
  }, []);

  // El módulo que hace falta matricular según la pantalla directa elegida.
  const sloguModuloSugerido = rutaDirecta === "/panel/catalogo" ? "farmacia" : "dispensacion";

  // Preselecciona el módulo sugerido la primera vez que llegan los módulos, y cuando
  // cambia la pantalla directa (sin des-marcar lo que el admin ya haya elegido a mano).
  useEffect(() => {
    const sugerido = modulos.find((m) => m.slug === sloguModuloSugerido);
    if (!sugerido) return;
    setSeleccion((s) => (s.has(sugerido.id) ? s : new Set([...s, sugerido.id])));
  }, [modulos, sloguModuloSugerido]);

  function alternar(id: string) {
    setSeleccion((s) => {
      const copia = new Set(s);
      if (copia.has(id)) copia.delete(id);
      else copia.add(id);
      return copia;
    });
  }

  // Nombres tal como los va escribiendo el admin, uno por línea, sin líneas vacías.
  const nombres = useMemo(
    () =>
      nombresTexto
        .split("\n")
        .map((n) => n.trim())
        .filter(Boolean),
    [nombresTexto]
  );

  const cantidadFinal = modo === "nombres" ? nombres.length : cantidad;

  async function crear() {
    if (seleccion.size === 0 || creando || cantidadFinal === 0) return;
    setCreando(true);
    const body =
      modo === "nombres"
        ? { alumnos: nombres.map((nombre) => ({ nombre, genero: generos[nombre] || null })) }
        : { cantidad, prefijo };
    const res = await fetch("/api/admin/estudiantes/temporales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...body,
        moduloIds: Array.from(seleccion),
        rutaDirecta: rutaDirecta || null,
        sesionTurneroId: sesionTurneroId ?? null,
      }),
    });
    const data = await res.json();
    setCreando(false);
    if (!res.ok) {
      alert(data.error ?? "No se pudieron crear los puestos");
      return;
    }
    setCreados(data.creados);
    setNombresTexto("");
    setGeneros({});
    onCreados();
  }

  const textoParaCopiar = useMemo(
    () => (creados ?? []).map((c) => `${c.nombre}: usuario ${c.usuario} · contraseña ${c.password}`).join("\n"),
    [creados]
  );

  async function copiar() {
    try {
      await navigator.clipboard.writeText(textoParaCopiar);
    } catch {
      /* portapapeles no disponible; el texto ya está visible para copiar a mano */
    }
  }

  return (
    <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm mb-6">
      {colapsable ? (
        <button onClick={() => setAbierto((v) => !v)} className="text-sm font-heading font-semibold text-blue-900">
          {abierto ? "▾" : "▸"} {titulo}
        </button>
      ) : (
        <p className="text-sm font-heading font-semibold text-blue-900">{titulo}</p>
      )}
      {!abierto && <p className="text-xs text-slate-400 mt-1">{descripcion}</p>}

      {abierto && (
        <div className="mt-4">
          {sesionTurneroId && (
            <p className="text-xs text-slate-400 mb-3">
              Quedan enlazados a este turnero: al cerrarlo, estas cuentas se borran solas.
            </p>
          )}

          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => setModo("nombres")}
              className={`rounded-full px-3 py-1 text-xs font-medium border ${
                modo === "nombres" ? "border-blue-600 bg-blue-50 text-blue-800" : "border-slate-300 text-slate-500"
              }`}
            >
              Nombres de los estudiantes
            </button>
            <button
              type="button"
              onClick={() => setModo("generico")}
              className={`rounded-full px-3 py-1 text-xs font-medium border ${
                modo === "generico" ? "border-blue-600 bg-blue-50 text-blue-800" : "border-slate-300 text-slate-500"
              }`}
            >
              Genérico (Puesto 1, 2...)
            </button>
          </div>

          {modo === "nombres" ? (
            <div className="mb-4">
              <label className="block text-xs text-slate-500 mb-1">Un nombre por línea</label>
              <textarea
                value={nombresTexto}
                onChange={(e) => setNombresTexto(e.target.value)}
                rows={4}
                placeholder={"María Gómez\nJuan Pérez\nLaura Torres"}
                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-mono"
              />
              {nombres.length > 0 && (
                <div className="mt-2 flex flex-col gap-1.5">
                  {nombres.map((n) => (
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
            </div>
          ) : (
            <div className="flex gap-3 mb-3">
              <label className="text-xs text-slate-500">
                Cuántas
                <input
                  type="number"
                  min={1}
                  max={40}
                  value={cantidad}
                  onChange={(e) => setCantidad(Number(e.target.value))}
                  className="mt-1 block w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                />
              </label>
              <label className="flex-1 text-xs text-slate-500">
                Nombre base (queda &ldquo;{prefijo} 1&rdquo;, &ldquo;{prefijo} 2&rdquo;…)
                <input
                  value={prefijo}
                  onChange={(e) => setPrefijo(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                />
              </label>
            </div>
          )}

          <label className="block text-xs text-slate-500 mb-3">
            Al iniciar sesión entra directo a
            <select
              value={rutaDirecta}
              onChange={(e) => setRutaDirecta(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="">Ninguna — panel normal (elige el módulo ahí)</option>
              {RUTAS_DIRECTAS.map((r) => (
                <option key={r.valor} value={r.valor}>
                  {r.etiqueta}
                </option>
              ))}
            </select>
          </label>

          <p className="text-xs text-slate-500 mb-1.5">Matricular en:</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {modulos.map((m) => (
              <label
                key={m.id}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs border cursor-pointer ${
                  seleccion.has(m.id) ? "border-blue-600 bg-blue-50 text-blue-800" : "border-slate-300 text-slate-600"
                }`}
              >
                <input type="checkbox" checked={seleccion.has(m.id)} onChange={() => alternar(m.id)} className="hidden" />
                {m.nombre}
              </label>
            ))}
            {modulos.length === 0 && <span className="text-xs text-slate-400">No hay módulos activos.</span>}
          </div>

          <button
            onClick={crear}
            disabled={creando || seleccion.size === 0 || cantidadFinal === 0}
            className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-40"
          >
            {creando ? "Creando..." : `Crear ${cantidadFinal} puesto(s)`}
          </button>

          {creados && (
            <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-emerald-800">
                  Listo{rutaDirecta ? ` — entran directo a "${etiquetaRutaDirecta(rutaDirecta)}"` : ""} — cópialas
                  ahora, no se vuelven a mostrar:
                </p>
                <button onClick={copiar} className="text-xs text-emerald-700 hover:underline">
                  Copiar todo
                </button>
              </div>
              <div className="flex flex-col gap-1 font-mono text-sm text-emerald-900">
                {creados.map((c) => (
                  <div key={c.usuario}>
                    <span className="text-emerald-600">{c.nombre}:</span> {c.usuario} · {c.password}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
