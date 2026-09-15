"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { RUTAS_DIRECTAS } from "@/lib/nucleo/rutasDirectas";

type Estudiante = {
  id: string;
  nombre: string;
  usuario: string;
  activo: boolean;
  temporal: boolean;
  rutaDirecta: string | null;
  creadoEn: string;
};

function etiquetaRuta(ruta: string): string {
  return RUTAS_DIRECTAS.find((r) => r.valor === ruta)?.etiqueta ?? ruta;
}

type Modulo = { id: string; slug: string; nombre: string; activo: boolean };

type Credencial = { nombre: string; usuario: string; password: string };

export default function EstudiantesPage() {
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [nombre, setNombre] = useState("");
  const [usuario, setUsuario] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [credenciales, setCredenciales] = useState<{ usuario: string; password: string } | null>(null);

  const cargar = useCallback(async () => {
    const [resEst, resMod] = await Promise.all([fetch("/api/admin/estudiantes"), fetch("/api/admin/modulos")]);
    const dataEst = await resEst.json();
    const dataMod = await resMod.json();
    setEstudiantes(dataEst.estudiantes ?? []);
    setModulos((dataMod.modulos ?? []).filter((m: Modulo) => m.activo));
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/estudiantes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, usuario }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "No se pudo crear el estudiante");
      return;
    }
    setCredenciales({ usuario: data.estudiante.usuario, password: data.passwordTemporal });
    setNombre("");
    setUsuario("");
    cargar();
  }

  async function alternarActivo(est: Estudiante) {
    await fetch(`/api/admin/estudiantes/${est.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !est.activo }),
    });
    cargar();
  }

  async function resetPassword(est: Estudiante) {
    const res = await fetch(`/api/admin/estudiantes/${est.id}/reset-password`, { method: "POST" });
    const data = await res.json();
    setCredenciales({ usuario: est.usuario, password: data.passwordTemporal });
  }

  const totalTemporales = estudiantes.filter((e) => e.temporal).length;

  async function eliminarTemporales() {
    if (!confirm(`¿Eliminar las ${totalTemporales} cuentas temporales? Se borra su progreso y no se puede deshacer.`))
      return;
    await fetch("/api/admin/estudiantes/temporales", { method: "DELETE" });
    cargar();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-heading text-2xl font-bold text-blue-900 mb-6">Estudiantes</h1>

      <form onSubmit={crear} className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm mb-6 flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-1">Nombre completo</label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
            required
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-1">Usuario</label>
          <input
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
            required
          />
        </div>
        <button type="submit" className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900">
          Crear
        </button>
      </form>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {credenciales && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 mb-6 text-sm text-emerald-800">
          <p className="font-medium">Credenciales generadas — cópialas ahora, no se muestran de nuevo:</p>
          <p className="mt-1">Usuario: <span className="font-mono font-semibold">{credenciales.usuario}</span></p>
          <p>Contraseña: <span className="font-mono font-semibold">{credenciales.password}</span></p>
        </div>
      )}

      <PuestosTemporales modulos={modulos} onCreados={cargar} />

      {cargando && <p className="text-slate-500 text-sm">Cargando...</p>}

      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-heading font-semibold text-blue-900">Todos</h2>
        {totalTemporales > 0 && (
          <button onClick={eliminarTemporales} className="text-xs text-red-600 hover:underline">
            Eliminar {totalTemporales} cuenta(s) temporal(es)
          </button>
        )}
      </div>

      <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium">Usuario</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {estudiantes.map((est) => (
              <tr key={est.id} className="border-t border-slate-100">
                <td className="px-4 py-2 text-slate-800">
                  {est.nombre}
                  {est.temporal && (
                    <span className="ml-2 text-[10px] uppercase tracking-wide text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                      temporal
                    </span>
                  )}
                  {est.rutaDirecta && (
                    <span className="ml-2 text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                      → {etiquetaRuta(est.rutaDirecta)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-slate-600 font-mono">{est.usuario}</td>
                <td className="px-4 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${est.activo ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                    {est.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right flex gap-3 justify-end">
                  <button onClick={() => resetPassword(est)} className="text-xs text-blue-800 hover:underline">
                    Restablecer contraseña
                  </button>
                  <button onClick={() => alternarActivo(est)} className="text-xs text-slate-500 hover:underline">
                    {est.activo ? "Desactivar" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Crea de una vez N cuentas de estudiante para una sala de cómputo (un puesto = un
 * computador), ya matriculadas en los módulos elegidos. Pensado para el día de práctica:
 * "Dispensación 1/2/3" en tres computadores, por ejemplo.
 */
function PuestosTemporales({ modulos, onCreados }: { modulos: Modulo[]; onCreados: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const [cantidad, setCantidad] = useState(3);
  const [prefijo, setPrefijo] = useState("Dispensación");
  const [rutaDirecta, setRutaDirecta] = useState<string>("/panel/dispensacion");
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [creando, setCreando] = useState(false);
  const [creados, setCreados] = useState<Credencial[] | null>(null);

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

  async function crear() {
    if (seleccion.size === 0 || creando) return;
    setCreando(true);
    const res = await fetch("/api/admin/estudiantes/temporales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cantidad,
        prefijo,
        moduloIds: Array.from(seleccion),
        rutaDirecta: rutaDirecta || null,
      }),
    });
    const data = await res.json();
    setCreando(false);
    if (!res.ok) {
      alert(data.error ?? "No se pudieron crear los puestos");
      return;
    }
    setCreados(data.creados);
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
      <button onClick={() => setAbierto((v) => !v)} className="text-sm font-heading font-semibold text-blue-900">
        {abierto ? "▾" : "▸"} Puestos temporales para sala de cómputo
      </button>
      {!abierto && (
        <p className="text-xs text-slate-400 mt-1">
          Crea varias cuentas de una vez (una por computador) ya matriculadas en el módulo que necesites.
        </p>
      )}

      {abierto && (
        <div className="mt-4">
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
            disabled={creando || seleccion.size === 0}
            className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-40"
          >
            {creando ? "Creando..." : `Crear ${cantidad} puesto(s)`}
          </button>

          {creados && (
            <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-emerald-800">
                  Listo{rutaDirecta ? ` — entran directo a "${etiquetaRuta(rutaDirecta)}"` : ""} — cópialas ahora, no
                  se vuelven a mostrar:
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
