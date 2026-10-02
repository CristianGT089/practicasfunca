"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { RUTAS_DIRECTAS } from "@/lib/nucleo/rutasDirectas";
import PuestosTemporales from "@/components/admin/PuestosTemporales";
import { useSesionGestor } from "@/components/admin/useSesionGestor";

type Genero = "MASCULINO" | "FEMENINO" | "OTRO";

type Estudiante = {
  id: string;
  nombre: string;
  usuario: string;
  activo: boolean;
  temporal: boolean;
  rutaDirecta: string | null;
  genero: Genero | null;
  creadoEn: string;
  gruposComoEstudiante: { id: string; nombre: string }[];
};

type GrupoOpcion = { id: string; nombre: string };

function etiquetaRuta(ruta: string): string {
  return RUTAS_DIRECTAS.find((r) => r.valor === ruta)?.etiqueta ?? ruta;
}

export function etiquetaGenero(genero: Genero | null): string {
  switch (genero) {
    case "MASCULINO":
      return "Masculino";
    case "FEMENINO":
      return "Femenino";
    case "OTRO":
      return "Otro";
    default:
      return "";
  }
}

export default function EstudiantesPage() {
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [cargando, setCargando] = useState(true);
  const [nombre, setNombre] = useState("");
  const [usuario, setUsuario] = useState("");
  const [genero, setGenero] = useState<Genero | "">("");
  const [error, setError] = useState<string | null>(null);
  const [credenciales, setCredenciales] = useState<{ usuario: string; password: string } | null>(null);
  const [grupos, setGrupos] = useState<GrupoOpcion[]>([]);
  const [grupoIds, setGrupoIds] = useState<string[]>([]);
  const [filtroGrupo, setFiltroGrupo] = useState("");
  const sesion = useSesionGestor();

  const cargar = useCallback(async () => {
    const [res, resGrupos] = await Promise.all([fetch("/api/admin/estudiantes"), fetch("/api/admin/grupos")]);
    const data = await res.json();
    const dataGrupos = await resGrupos.json();
    setEstudiantes(data.estudiantes ?? []);
    setGrupos((dataGrupos.grupos ?? []).map((g: GrupoOpcion) => ({ id: g.id, nombre: g.nombre })));
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
      body: JSON.stringify({ nombre, usuario, genero: genero || null, grupoIds }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "No se pudo crear el estudiante");
      return;
    }
    setCredenciales({ usuario: data.estudiante.usuario, password: data.passwordTemporal });
    setNombre("");
    setUsuario("");
    setGenero("");
    setGrupoIds([]);
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
  const visibles = filtroGrupo
    ? estudiantes.filter((e) => e.gruposComoEstudiante.some((g) => g.id === filtroGrupo))
    : estudiantes;
  const esDocente = sesion?.rol === "DOCENTE";

  async function eliminarTemporales() {
    if (!confirm(`¿Eliminar las ${totalTemporales} cuentas temporales? Se borra su progreso y no se puede deshacer.`))
      return;
    await fetch("/api/admin/estudiantes/temporales", { method: "DELETE" });
    cargar();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="titulo-pagina mb-6">Estudiantes</h1>

      <form onSubmit={crear} className="tarjeta p-5 mb-6 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-40">
          <label className="block text-sm font-medium text-slate-700 mb-1">Nombre completo</label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full rounded-xl border border-blue-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
            required
          />
        </div>
        <div className="flex-1 min-w-40">
          <label className="block text-sm font-medium text-slate-700 mb-1">Usuario</label>
          <input
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            className="w-full rounded-xl border border-blue-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Género</label>
          <select
            value={genero}
            onChange={(e) => setGenero(e.target.value as Genero | "")}
            className="rounded-xl border border-blue-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
          >
            <option value="">Sin especificar</option>
            <option value="FEMENINO">Femenino</option>
            <option value="MASCULINO">Masculino</option>
            <option value="OTRO">Otro</option>
          </select>
        </div>
        <button type="submit" className="rounded-full font-heading bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900">
          Crear
        </button>
        <div className="basis-full">
          <p className="text-sm font-medium text-slate-700 mb-1">
            Grupos {esDocente && <span className="text-xs font-normal text-slate-500">(elige al menos uno)</span>}
          </p>
          {grupos.length === 0 ? (
            <p className="text-xs text-slate-500">
              Aún no hay grupos. <a href="/admin/grupos" className="underline">Crea uno</a> para que el estudiante quede matriculado en sus
              módulos.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {grupos.map((g) => (
                <label key={g.id} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={grupoIds.includes(g.id)}
                    onChange={() => setGrupoIds((ids) => (ids.includes(g.id) ? ids.filter((x) => x !== g.id) : [...ids, g.id]))}
                  />
                  {g.nombre}
                </label>
              ))}
            </div>
          )}
        </div>
      </form>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {credenciales && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 mb-6 text-sm text-emerald-800">
          <p className="font-medium">Credenciales generadas — cópialas ahora, no se muestran de nuevo:</p>
          <p className="mt-1">Usuario: <span className="font-mono font-semibold">{credenciales.usuario}</span></p>
          <p>Contraseña: <span className="font-mono font-semibold">{credenciales.password}</span></p>
        </div>
      )}

      <PuestosTemporales onCreados={cargar} />
      <p className="text-xs text-slate-400 -mt-4 mb-6">
        Para una sala con turnero, mejor créalos desde la <Link href="/admin/simulacion" className="underline">jornada presencial</Link>:
        se borran solos cuando la cierras.
      </p>

      {cargando && <p className="text-slate-500 text-sm">Cargando...</p>}

      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-heading font-semibold text-blue-900">{esDocente ? "Mis estudiantes" : "Todos"}</h2>
          {grupos.length > 0 && (
            <select
              value={filtroGrupo}
              onChange={(e) => setFiltroGrupo(e.target.value)}
              className="rounded-xl border border-blue-200 px-2 py-1 text-xs"
              aria-label="Filtrar por grupo"
            >
              <option value="">Todos los grupos</option>
              {grupos.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nombre}
                </option>
              ))}
            </select>
          )}
        </div>
        {totalTemporales > 0 && !esDocente && (
          <button onClick={eliminarTemporales} className="text-xs text-red-600 hover:underline">
            Eliminar {totalTemporales} cuenta(s) temporal(es)
          </button>
        )}
      </div>

      <div className="tarjeta-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead className="bg-slate-50 text-slate-600 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium">Usuario</th>
              <th className="px-4 py-2 font-medium">Grupos</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((est) => (
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
                  {est.genero && (
                    <span className="ml-2 text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      {etiquetaGenero(est.genero)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-slate-600 font-mono">{est.usuario}</td>
                <td className="px-4 py-2 text-xs text-slate-600">
                  {est.gruposComoEstudiante.map((g) => g.nombre).join(", ") || <span className="text-slate-400">—</span>}
                </td>
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
