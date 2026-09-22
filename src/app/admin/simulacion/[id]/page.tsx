"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { generarRecetasPDF } from "@/lib/simulacion/recetaPdf";
import { useSnapshotTurnero } from "@/components/turnero/useSnapshotTurnero";
import PuestosTemporales from "@/components/admin/PuestosTemporales";

type Receta = {
  id: string;
  cantidadAutorizada: number;
  medico: string;
  fechaEmision: string;
  fechaVigencia: string;
  medicamento: { nombre: string; presentacion: string };
};

type Paciente = {
  id: string;
  nombre: string;
  cedula: string;
  edad: number;
  genero: "MASCULINO" | "FEMENINO" | "OTRO" | null;
  alergias: string[];
  antecedentes: string | null;
  diagnostico: string | null;
  esAltoCosto: boolean;
  categoriaAfiliado: string | null;
  tipoRecogida: "EL_MISMO" | "TERCERO_AUTORIZADO" | "SUPLANTACION";
  personaRecogeNombre: string | null;
  personaRecogeRelacion: string | null;
  recetas: Receta[];
};

type Simulacion = {
  id: string;
  nombre: string;
  tipo: "FARMACIA" | "DISPENSARIO";
  estado: "BORRADOR" | "ABIERTA" | "CERRADA";
  turneroId: string;
  sesionTurneroId: string | null;
  pacientes: Paciente[];
};

export default function SimulacionDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [simulacion, setSimulacion] = useState<Simulacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [regenerando, setRegenerando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generandoPdf, setGenerandoPdf] = useState(false);

  const cargar = useCallback(async () => {
    const res = await fetch(`/api/simulaciones/${id}`);
    const data = await res.json();
    if (res.ok) setSimulacion(data.simulacion);
    setCargando(false);
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function regenerar(pacienteId: string) {
    setRegenerando(pacienteId);
    await fetch(`/api/simulaciones/${id}/pacientes/${pacienteId}/regenerar`, { method: "POST" });
    setRegenerando(null);
    cargar();
  }

  async function abrir() {
    setError(null);
    const res = await fetch(`/api/simulaciones/${id}/abrir`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "No se pudo abrir la simulación");
      return;
    }
    cargar();
  }

  async function descargarPdf() {
    if (!simulacion || generandoPdf) return;
    setGenerandoPdf(true);
    try {
      await generarRecetasPDF({ nombreSimulacion: simulacion.nombre, pacientes: simulacion.pacientes });
    } finally {
      setGenerandoPdf(false);
    }
  }

  async function cerrar() {
    if (!confirm("Esto cierra el turnero y borra los pacientes generados para esta simulación. ¿Continuar?")) return;
    setError(null);
    const res = await fetch(`/api/simulaciones/${id}/cerrar`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "No se pudo cerrar la simulación");
      return;
    }
    router.push("/admin/simulacion");
  }

  if (cargando) return <p className="text-slate-500 text-sm">Cargando...</p>;
  if (!simulacion) return <p className="text-slate-500 text-sm">Simulación no encontrada.</p>;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Link href="/admin/simulacion" className="text-sm text-slate-400 hover:text-blue-800">
            ← Simulación
          </Link>
        </div>
      </div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-blue-900">{simulacion.nombre}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {simulacion.tipo === "FARMACIA" ? "Farmacia" : "Dispensario"} · {simulacion.pacientes.length} pacientes ·{" "}
            {simulacion.estado === "BORRADOR" ? "Borrador" : simulacion.estado === "ABIERTA" ? "Abierta" : "Cerrada"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {simulacion.pacientes.length > 0 && (
            <button
              onClick={descargarPdf}
              disabled={generandoPdf}
              className="text-sm text-blue-700 hover:underline disabled:opacity-40"
            >
              {generandoPdf ? "Generando..." : "Descargar recetas (PDF)"}
            </button>
          )}
          {simulacion.estado === "BORRADOR" && (
            <button
              onClick={abrir}
              className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900"
            >
              Abrir simulación
            </button>
          )}
          {simulacion.estado === "ABIERTA" && (
            <button onClick={cerrar} className="text-sm text-slate-500 hover:text-red-600">
              Cerrar simulación
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {simulacion.estado === "BORRADOR" && (
        <p className="text-xs text-slate-400 mb-4">
          Revisa cada paciente antes de abrir. Puedes regenerar los que no sirvan para la clase.
        </p>
      )}

      {simulacion.estado === "ABIERTA" && simulacion.sesionTurneroId && (
        <ControlTurnero sesionId={simulacion.sesionTurneroId} />
      )}

      {simulacion.estado !== "ABIERTA" && (
        <div className="flex flex-col gap-3">
          {simulacion.pacientes.map((p) => (
            <FilaPaciente
              key={p.id}
              paciente={p}
              editable={simulacion.estado === "BORRADOR"}
              regenerando={regenerando === p.id}
              onRegenerar={() => regenerar(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Control en vivo del turnero de esta Simulación (espacios, cola, puestos temporales) —
 * vive acá directamente: no hay una sección de "Turnero" aparte a la que ir. Cerrar la
 * Simulación (arriba) es lo único que cierra este turnero; acá solo se opera el día a día.
 */
function ControlTurnero({ sesionId }: { sesionId: string }) {
  const { snapshot, conectado, finalizada } = useSnapshotTurnero(sesionId);

  async function api(url: string, body: unknown, method = "POST") {
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  if (finalizada) return null; // se cerró desde otra pestaña; el estado de la Simulación ya lo refleja arriba
  if (!snapshot) return <p className="text-slate-500 text-sm mb-6">Conectando al turnero...</p>;

  const { espacios, enEspera, contadores, puestos, sesion } = snapshot;
  const colaVacia = enEspera.length === 0;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-4 mb-4 text-sm">
        <a href="/admin/turnero/registro" target="_blank" className="text-blue-700 hover:underline">
          Abrir pantalla de registro ↗
        </a>
        <a href="/admin/turnero/tablero" target="_blank" className="text-blue-700 hover:underline">
          Abrir tablero ↗
        </a>
        <span className={`ml-auto text-xs ${conectado ? "text-green-600" : "text-amber-600"}`}>
          {conectado ? "● en vivo" : "○ reconectando"}
        </span>
      </div>

      <PuestosTemporales
        sesionTurneroId={sesionId}
        titulo="Puestos de este turnero"
        descripcion="Crea las cuentas de sala de cómputo para esta sesión — se borran solas al cerrar la simulación."
        colapsable={false}
        onCreados={() => {}}
      />

      {puestos.length > 0 && (
        <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm mb-5">
          <p className="text-xs font-semibold text-slate-500 mb-2">Cuentas de esta sesión ({puestos.length})</p>
          <div className="flex flex-wrap gap-2">
            {puestos.map((p) => (
              <span key={p.id} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 font-mono">
                {p.usuario}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm mb-5 flex items-center gap-6 text-sm">
        <span className="text-slate-500">
          En espera <b className="text-slate-800">{contadores.enEspera}</b>
        </span>
        <span className="text-slate-500">
          Atendidos <b className="text-slate-800">{contadores.atendidos}</b>
        </span>
        <span className="text-slate-500">
          No se presentó <b className="text-slate-800">{contadores.noShow}</b>
        </span>
        <span className="ml-auto flex items-center gap-2 text-slate-500">
          Espacios
          <button
            onClick={() => api(`/api/turnero/sesiones/${sesionId}`, { numeroEspacios: sesion.numeroEspacios - 1 }, "PATCH")}
            disabled={sesion.numeroEspacios <= 1}
            className="h-6 w-6 rounded border border-slate-300 disabled:opacity-30"
          >
            −
          </button>
          <b className="text-slate-800">{sesion.numeroEspacios}</b>
          <button
            onClick={() => api(`/api/turnero/sesiones/${sesionId}`, { numeroEspacios: sesion.numeroEspacios + 1 }, "PATCH")}
            disabled={sesion.numeroEspacios >= 20}
            className="h-6 w-6 rounded border border-slate-300 disabled:opacity-30"
          >
            +
          </button>
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 mb-6">
        {espacios.map((e) => (
          <div key={e.numero} className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-heading font-semibold text-blue-900">
                {e.nombre ?? `Espacio ${e.numero}`}
              </span>
              <span className="text-[11px] uppercase tracking-wide text-slate-400">{e.estado}</span>
            </div>

            {e.ticket ? (
              <div>
                <p className="text-2xl font-bold text-blue-900">
                  {e.ticket.codigo}
                  {e.ticket.prioritario && (
                    <span className="ml-2 align-middle rounded bg-gold-100 px-1.5 py-0.5 text-[11px] font-semibold text-gold-700">
                      {e.ticket.categoriaNombre ?? "Prioritario"}
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500 mb-3">{e.ticket.servicioNombre}</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => api(`/api/turnero/tickets/${e.ticket!.id}`, { resultado: "ATENDIDO" }, "PATCH")}
                    className="rounded-lg bg-blue-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-900"
                  >
                    Atendido
                  </button>
                  <button
                    onClick={() => api(`/api/turnero/tickets/${e.ticket!.id}`, { resultado: "NO_SE_PRESENTO" }, "PATCH")}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    No se presentó
                  </button>
                  <button
                    onClick={() => api(`/api/turnero/tickets/${e.ticket!.id}`, { rellamar: true }, "PATCH")}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Rellamar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => api(`/api/turnero/sesiones/${sesionId}/llamar`, { espacio: e.numero })}
                disabled={colaVacia}
                className="w-full rounded-lg bg-blue-50 py-2 text-sm font-medium text-blue-800 hover:bg-blue-100 disabled:opacity-40"
              >
                Llamar siguiente
              </button>
            )}
          </div>
        ))}
      </div>

      <h2 className="text-sm font-heading font-semibold text-blue-900 mb-2">En espera ({enEspera.length})</h2>
      <div className="flex flex-col gap-1.5">
        {enEspera.map((t) => (
          <div key={t.id} className="rounded-lg bg-white border border-slate-200 px-3 py-2 text-sm flex items-center gap-3">
            <span className="font-bold text-blue-900 w-14">{t.codigo}</span>
            <span className="text-slate-500 flex-1">{t.servicioNombre}</span>
            {t.prioritario && (
              <span className="rounded bg-gold-100 px-1.5 py-0.5 text-[11px] font-semibold text-gold-700">
                {t.categoriaNombre ?? "Prioritario"}
              </span>
            )}
          </div>
        ))}
        {colaVacia && <p className="text-xs text-slate-400">La cola está vacía.</p>}
      </div>
    </div>
  );
}

function FilaPaciente({
  paciente,
  editable,
  regenerando,
  onRegenerar,
}: {
  paciente: Paciente;
  editable: boolean;
  regenerando: boolean;
  onRegenerar: () => void;
}) {
  const ahora = Date.now();
  return (
    <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-sm font-medium text-slate-800">
            {paciente.nombre}{" "}
            <span className="text-xs text-slate-400 font-mono">CC {paciente.cedula}</span>
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {paciente.edad} años
            {paciente.genero && ` · ${etiquetaGenero(paciente.genero)}`}
            {paciente.categoriaAfiliado && ` · ${etiquetaCategoria(paciente.categoriaAfiliado)}`}
            {paciente.diagnostico && ` · ${paciente.diagnostico}`}
            {paciente.esAltoCosto && (
              <span className="ml-2 rounded bg-purple-100 px-1.5 py-0.5 text-[11px] font-semibold text-purple-700">
                Alto costo · exento de cuota
              </span>
            )}
            {paciente.tipoRecogida !== "EL_MISMO" && (
              <span
                className={`ml-2 rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                  paciente.tipoRecogida === "SUPLANTACION" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"
                }`}
              >
                {paciente.tipoRecogida === "SUPLANTACION" ? "Suplantación" : "Tercero autorizado"} —{" "}
                {paciente.personaRecogeNombre}
                {paciente.personaRecogeRelacion ? ` (${paciente.personaRecogeRelacion})` : ""}
              </span>
            )}
          </p>
          {paciente.alergias.length > 0 && (
            <p className="text-xs text-red-600 mt-1">Alergias: {paciente.alergias.join(", ")}</p>
          )}
          {paciente.antecedentes && <p className="text-xs text-slate-400 mt-1">{paciente.antecedentes}</p>}
        </div>
        {editable && (
          <button
            onClick={onRegenerar}
            disabled={regenerando}
            className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            {regenerando ? "Generando..." : "Regenerar"}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1 mt-3">
        {paciente.recetas.map((r) => {
          const vencida = new Date(r.fechaVigencia).getTime() < ahora;
          return (
            <div key={r.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs">
              <span className="font-medium text-slate-700">{r.medicamento.nombre}</span>
              <span className="text-slate-400">{r.medicamento.presentacion}</span>
              <span className="text-slate-500 ml-auto">{r.cantidadAutorizada} unid. · {r.medico}</span>
              {vencida && (
                <span className="rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-semibold text-red-700">
                  Vencida
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function etiquetaCategoria(categoria: string) {
  switch (categoria) {
    case "SUBSIDIADO":
      return "Subsidiado";
    case "CONTRIBUTIVO_A":
      return "Contributivo A";
    case "CONTRIBUTIVO_B":
      return "Contributivo B";
    case "CONTRIBUTIVO_C":
      return "Contributivo C";
    default:
      return categoria;
  }
}

function etiquetaGenero(genero: "MASCULINO" | "FEMENINO" | "OTRO") {
  switch (genero) {
    case "MASCULINO":
      return "Masculino";
    case "FEMENINO":
      return "Femenino";
    case "OTRO":
      return "Otro";
  }
}
