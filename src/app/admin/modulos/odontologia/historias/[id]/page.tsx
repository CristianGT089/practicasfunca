"use client";

import { use as usePromise, useEffect, useState } from "react";
import Link from "next/link";
import type { HistoriaOdontologica } from "@/lib/modulos/odontologia/historia";
import type { Denticion } from "@/lib/modulos/odontologia/odontograma";
import RevisionOdontograma, { type RevisionOdontologia } from "@/components/modulos/odontologia/RevisionOdontograma";
import {
  SeccionAlerta,
  SeccionAnamnesis,
  SeccionDiagnosticoPlan,
  SeccionEvolucion,
  SeccionExamenes,
  SeccionIdentificacion,
  SeccionPlacaHigiene,
  type PacienteOdontologia,
} from "@/components/modulos/odontologia/SeccionesHistoria";

type Detalle = {
  intento: {
    estado: string;
    modo: string;
    iniciadoEn: string;
    finalizadoEn: string | null;
    puntajeFinal: number | null;
    usuario: { nombre: string; usuario: string };
    titulo: string;
  };
  paciente: PacienteOdontologia;
  denticion: Denticion;
  historia: HistoriaOdontologica;
  detallePasos: { descripcion: string; cumplido: boolean }[];
  revisionOdontologia: RevisionOdontologia;
};

/** Historia de un estudiante en solo lectura, con la comparación contra la respuesta del caso. */
export default function HistoriaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const [d, setD] = useState<Detalle | null>(null);

  useEffect(() => {
    fetch(`/api/modulos/odontologia/admin/historias/${id}`)
      .then((r) => r.json())
      .then(setD);
  }, [id]);

  if (!d) return <p className="text-slate-500 text-sm">Cargando...</p>;
  const h = d.historia;
  const otras = d.detallePasos.filter((p) => !p.descripcion.startsWith("Odontograma:"));

  return (
    <div className="mx-auto max-w-6xl flex flex-col gap-4">
      <Link href="/admin/modulos/odontologia/historias" className="text-sm text-slate-500 hover:text-slate-800">
        ← Historias
      </Link>
      <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl font-bold text-blue-900">{d.intento.usuario.nombre}</h1>
          <p className="text-sm text-slate-500">
            {d.intento.titulo} · modo {d.intento.modo === "DIFICIL" ? "difícil" : "fácil"} ·{" "}
            {d.intento.estado === "COMPLETADO" ? "historia cerrada" : d.intento.estado === "PERDIDO" ? "se quedó sin corazones" : "en progreso (último guardado)"}
          </p>
        </div>
        {d.intento.puntajeFinal !== null && <p className="text-3xl font-heading font-extrabold text-cyan-700">{Math.round(d.intento.puntajeFinal)}/100</p>}
      </div>

      <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
        <RevisionOdontograma revision={d.revisionOdontologia} />
      </div>

      <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
        <h3 className="text-sm font-heading font-semibold text-cyan-900 mb-2">Revisión automática del resto</h3>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
          {otras.map((p, i) => (
            <li key={i} className={`text-sm flex gap-2 ${p.cumplido ? "text-cyan-700" : "text-red-600"}`}>
              <span>{p.cumplido ? "✓" : "✗"}</span>
              <span>{p.descripcion}</span>
            </li>
          ))}
        </ul>
      </div>

      <h2 className="font-heading text-lg font-semibold text-blue-900 mt-2">Historia tal como la diligenció</h2>
      <SeccionIdentificacion paciente={d.paciente} />
      <SeccionAlerta h={h} />
      <SeccionAnamnesis h={h} />
      <SeccionExamenes h={h} />
      <SeccionPlacaHigiene h={h} denticion={d.denticion} />
      <SeccionDiagnosticoPlan h={h} />
      <SeccionEvolucion h={h} />
    </div>
  );
}
