"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AsistenteJornada, { type Modalidad, type Tipo } from "@/components/admin/jornada/AsistenteJornada";

type Simulacion = {
  id: string;
  nombre: string;
  tipo: Tipo;
  estado: "BORRADOR" | "ABIERTA" | "EN_REVISION" | "CERRADA";
  creadaEn: string;
  situaciones: string[];
  pacientesReales: boolean;
  dictado: boolean;
  grupo: { nombre: string } | null;
  _count: { pacientes: number; atenciones: number; participantes: number };
};

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

const ETIQUETA_TIPO: Record<Tipo, string> = { FARMACIA: "Farmacia", DISPENSARIO: "Dispensario", ODONTOLOGIA: "Odontología" };

export default function SimulacionPage() {
  const [simulaciones, setSimulaciones] = useState<Simulacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const router = useRouter();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [modalidadInicial, setModalidadInicial] = useState<Modalidad | null>(null);
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
    // Accesos directos desde el Inicio: ?nueva=1 abre el asistente; ?nueva=DICTADO, con la modalidad ya elegida.
    const nueva = new URLSearchParams(window.location.search).get("nueva");
    if (nueva) {
      setMostrarForm(true);
      if (nueva !== "1") setModalidadInicial(nueva as Modalidad);
    }
  }, [cargar]);

  if (cargando) return <p className="text-slate-500 text-sm">Cargando...</p>;

  const pendientes = simulaciones.filter((s) => s.estado !== "CERRADA");
  const calificadas = simulaciones.filter((s) => s.estado === "CERRADA");
  const fila = (s: Simulacion) => (
    <Link key={s.id} href={`/admin/simulacion/${s.id}`} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-blue-50">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{s.nombre}</p>
        <p className="text-xs text-slate-500 mt-0.5">
          {ETIQUETA_TIPO[s.tipo]}
          {s.dictado ? " · dictado" : s.pacientesReales ? " · pacientes reales" : ""}
          {s.grupo && ` · ${s.grupo.nombre}`} ·{" "}
          {s.estado === "CERRADA" || s.tipo === "ODONTOLOGIA" ? `${s._count.atenciones} atenciones` : `${s._count.pacientes} pacientes`}
          {` · ${new Date(s.creadaEn).toLocaleDateString("es-CO")}`}
        </p>
      </div>
      <span className={`pildora shrink-0 ${COLOR_ESTADO[s.estado]}`}>{ETIQUETA_ESTADO[s.estado]}</span>
    </Link>
  );

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <p className="eyebrow">Práctica en vivo</p>
          <h1 className="titulo-pagina mt-1">Jornadas presenciales</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Turnos, consultorio o dictado en clase. El estudiante no ve su nota; al final se genera el reporte para repasar con el grupo.
          </p>
        </div>
        {tiposPermitidos.length > 0 && (
          <button
            onClick={() => {
              setModalidadInicial(null);
              setMostrarForm((v) => !v);
            }}
            className={mostrarForm ? "btn text-slate-600 hover:bg-blue-50" : "btn-cta"}
          >
            {mostrarForm ? "Cancelar" : "Nueva jornada"}
          </button>
        )}
      </div>

      {mostrarForm && (
        <AsistenteJornada
          key={modalidadInicial ?? "nueva"}
          tiposPermitidos={tiposPermitidos}
          modalidadInicial={modalidadInicial}
          onCreada={(id) => router.push(`/admin/simulacion/${id}`)}
        />
      )}

      {simulaciones.length === 0 ? (
        <div className="tarjeta p-8 text-center">
          <p className="font-heading font-semibold text-blue-900">Aún no hay jornadas</p>
          <p className="text-sm text-slate-500 mt-1">Crea la primera con el botón &ldquo;Nueva jornada&rdquo;.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {pendientes.length > 0 && (
            <section>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Pendientes ({pendientes.length})</h2>
              <div className="tarjeta divide-y divide-blue-100 overflow-hidden">{pendientes.map(fila)}</div>
            </section>
          )}
          {calificadas.length > 0 && (
            <section>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Calificadas ({calificadas.length})</h2>
              <div className="tarjeta divide-y divide-blue-100 overflow-hidden">{calificadas.map(fila)}</div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
