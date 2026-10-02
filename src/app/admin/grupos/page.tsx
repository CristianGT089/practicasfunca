"use client";

import { useCallback, useEffect, useState } from "react";
import { useSesionGestor } from "@/components/admin/useSesionGestor";

type Ref = { id: string; nombre: string };
type Grupo = {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  modulos: Ref[];
  docentes: Ref[];
  estudiantes: (Ref & { usuario: string })[];
};
type Estudiante = Ref & { usuario: string };

const claseInput =
  "w-full rounded-xl border border-blue-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500";

const alternar = (lista: string[], id: string) => (lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id]);

/**
 * Grupos (cohortes): sus módulos, docentes y estudiantes. Al agregar un estudiante a un
 * grupo queda matriculado en los módulos del grupo. Un docente ve y edita solo sus grupos.
 */
export default function GruposPage() {
  const sesion = useSesionGestor();
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [modulos, setModulos] = useState<Ref[]>([]);
  const [docentes, setDocentes] = useState<Ref[]>([]);
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [cargando, setCargando] = useState(true);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [moduloIds, setModuloIds] = useState<string[]>([]);
  const [docenteIds, setDocenteIds] = useState<string[]>([]);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [edicion, setEdicion] = useState<{ moduloIds: string[]; estudianteIds: string[]; docenteIds: string[] } | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState<string | null>(null);

  const esAdmin = sesion?.rol === "ADMIN";

  const cargar = useCallback(async () => {
    const [rg, re] = await Promise.all([fetch("/api/admin/grupos"), fetch("/api/admin/estudiantes")]);
    const dg = await rg.json();
    const de = await re.json();
    setGrupos(dg.grupos ?? []);
    setModulos(dg.modulos ?? []);
    setDocentes(dg.docentes ?? []);
    setEstudiantes((de.estudiantes ?? []).map((e: Estudiante) => ({ id: e.id, nombre: e.nombre, usuario: e.usuario })));
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/grupos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, descripcion: descripcion.trim() || null, moduloIds, docenteIds }),
    });
    if (!res.ok) {
      setError("No se pudo crear el grupo. Revisa el nombre.");
      return;
    }
    setNombre("");
    setDescripcion("");
    setModuloIds([]);
    setDocenteIds([]);
    cargar();
  }

  function abrir(g: Grupo) {
    if (abierto === g.id) {
      setAbierto(null);
      return;
    }
    setAbierto(g.id);
    setBusqueda("");
    setEdicion({
      moduloIds: g.modulos.map((m) => m.id),
      estudianteIds: g.estudiantes.map((e) => e.id),
      docenteIds: g.docentes.map((d) => d.id),
    });
  }

  async function guardar(g: Grupo) {
    if (!edicion) return;
    await fetch(`/api/admin/grupos/${g.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(esAdmin ? edicion : { moduloIds: edicion.moduloIds, estudianteIds: edicion.estudianteIds }),
    });
    setAbierto(null);
    cargar();
  }

  async function alternarActivo(g: Grupo) {
    await fetch(`/api/admin/grupos/${g.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !g.activo }),
    });
    cargar();
  }

  async function eliminar(g: Grupo) {
    if (!confirm(`¿Eliminar el grupo "${g.nombre}"? Sus estudiantes y sus notas no se borran.`)) return;
    await fetch(`/api/admin/grupos/${g.id}`, { method: "DELETE" });
    cargar();
  }

  const casillas = (opciones: Ref[], seleccion: string[], cambiar: (ids: string[]) => void) => (
    <div className="flex flex-wrap gap-2">
      {opciones.map((o) => (
        <label key={o.id} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700">
          <input type="checkbox" checked={seleccion.includes(o.id)} onChange={() => cambiar(alternar(seleccion, o.id))} />
          {o.nombre}
        </label>
      ))}
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="titulo-pagina mb-2">Grupos</h1>
      <p className="text-sm text-slate-500 mb-6">
        Un grupo es un curso o cohorte, por ejemplo &ldquo;Técnico en Farmacia, sábado 2026-2&rdquo;. Sus estudiantes quedan matriculados en
        los módulos del grupo, y las jornadas presenciales se hacen por grupo.
      </p>

      <form onSubmit={crear} className="tarjeta p-5 mb-6 flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-sm font-medium text-slate-700">
            Nombre del grupo
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={`${claseInput} mt-1`} required />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Descripción (opcional)
            <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className={`${claseInput} mt-1`} />
          </label>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-700 mb-1">Módulos</p>
          {casillas(modulos, moduloIds, setModuloIds)}
        </div>
        {esAdmin && docentes.length > 0 && (
          <div>
            <p className="text-sm font-medium text-slate-700 mb-1">Docentes</p>
            {casillas(docentes, docenteIds, setDocenteIds)}
          </div>
        )}
        <button type="submit" className="self-start rounded-full font-heading bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900">
          Crear grupo
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      {cargando && <p className="text-slate-500 text-sm">Cargando...</p>}
      {!cargando && grupos.length === 0 && <p className="text-sm text-slate-500">Todavía no hay grupos.</p>}

      <div className="flex flex-col gap-2">
        {grupos.map((g) => {
          const q = busqueda.trim().toLowerCase();
          const candidatos = estudiantes.filter((e) => !q || e.nombre.toLowerCase().includes(q) || e.usuario.includes(q));
          return (
            <div key={g.id} className="rounded-lg bg-white border border-slate-200 px-4 py-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <button onClick={() => abrir(g)} className="text-left">
                  <p className="font-medium text-slate-800">
                    {g.nombre}
                    {!g.activo && <span className="ml-2 text-xs text-slate-400">(inactivo)</span>}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {g.estudiantes.length} estudiante(s) · {g.modulos.map((m) => m.nombre).join(", ") || "sin módulos"}
                    {g.docentes.length > 0 && <> · Docentes: {g.docentes.map((d) => d.nombre).join(", ")}</>}
                  </p>
                </button>
                <div className="flex gap-3 text-xs shrink-0">
                  <button onClick={() => abrir(g)} className="text-blue-700 hover:underline">
                    {abierto === g.id ? "Cerrar" : "Editar"}
                  </button>
                  <button onClick={() => alternarActivo(g)} className="text-slate-500 hover:underline">
                    {g.activo ? "Desactivar" : "Activar"}
                  </button>
                  <button onClick={() => eliminar(g)} className="text-slate-400 hover:text-red-600">
                    Eliminar
                  </button>
                </div>
              </div>

              {abierto === g.id && edicion && (
                <div className="mt-3 flex flex-col gap-3 border-t border-slate-100 pt-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-1">Módulos</p>
                    {casillas(modulos, edicion.moduloIds, (ids) => setEdicion({ ...edicion, moduloIds: ids }))}
                  </div>
                  {esAdmin && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-1">Docentes</p>
                      {casillas(docentes, edicion.docenteIds, (ids) => setEdicion({ ...edicion, docenteIds: ids }))}
                    </div>
                  )}
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                      <p className="text-xs font-semibold text-slate-500">
                        Estudiantes ({edicion.estudianteIds.length} en el grupo)
                      </p>
                      <input
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="Buscar estudiante"
                        className="rounded-xl border border-blue-200 px-2 py-1 text-xs"
                      />
                    </div>
                    {estudiantes.length === 0 ? (
                      <p className="text-xs text-slate-500">
                        No hay estudiantes todavía. Créalos en <a href="/admin/estudiantes" className="underline">Estudiantes</a>.
                      </p>
                    ) : (
                      <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-100 p-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                        {candidatos.map((e) => (
                          <label key={e.id} className="flex items-center gap-2 text-xs text-slate-700 px-1 py-0.5">
                            <input
                              type="checkbox"
                              checked={edicion.estudianteIds.includes(e.id)}
                              onChange={() => setEdicion({ ...edicion, estudianteIds: alternar(edicion.estudianteIds, e.id) })}
                            />
                            {e.nombre} <span className="font-mono text-slate-400">{e.usuario}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => guardar(g)} className="rounded-lg bg-blue-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-900">
                      Guardar cambios
                    </button>
                    <button onClick={() => setAbierto(null)} className="text-xs text-slate-500">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
