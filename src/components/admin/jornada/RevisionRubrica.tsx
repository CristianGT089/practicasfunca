"use client";

import { useEffect, useState } from "react";
import { historiaVacia, normalizarHistoria, REMISIONES, type HistoriaOdontologica } from "@/lib/modulos/odontologia/historia";
import type { Denticion } from "@/lib/modulos/odontologia/odontograma";
import { CRITERIOS_RUBRICA, NIVELES, normalizarRubrica, puntajeRubrica, type Rubrica } from "@/lib/modulos/odontologia/rubrica";
import {
  SeccionAlerta,
  SeccionAnamnesis,
  SeccionDiagnosticoPlan,
  SeccionEvolucion,
  SeccionExamenes,
  SeccionIdentificacion,
  SeccionOdontograma,
  SeccionPlacaHigiene,
  type PacienteOdontologia,
} from "@/components/modulos/odontologia/SeccionesHistoria";

type Detalle = {
  historia: unknown;
  pacienteReal: Partial<PacienteOdontologia> | null;
  denticion: string | null;
  rubrica: unknown;
  comentario: string | null;
  cerrada: boolean;
  remision: string | null;
};

/**
 * Paciente real: el docente lee la historia tal como la escribió el estudiante (solo lectura)
 * y la califica con la rúbrica. Para el odontograma, lo ideal es mirar la boca del compañero.
 */
export default function RevisionRubrica({
  simulacionId,
  atencionId,
  onGuardado,
}: {
  simulacionId: string;
  atencionId: string;
  onGuardado: (puntaje: number | null) => void;
}) {
  const [d, setD] = useState<Detalle | null>(null);
  const [rubrica, setRubrica] = useState<Rubrica>({});
  const [comentario, setComentario] = useState("");
  const [verHistoria, setVerHistoria] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vivo = true;
    fetch(`/api/simulaciones/${simulacionId}/atenciones/${atencionId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!vivo) return;
        setD(data.atencion);
        setRubrica(normalizarRubrica(data.atencion.rubrica));
        setComentario(data.atencion.comentario ?? "");
      });
    return () => {
      vivo = false;
    };
  }, [simulacionId, atencionId]);

  async function guardar() {
    setGuardando(true);
    await fetch(`/api/simulaciones/${simulacionId}/atenciones/${atencionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rubrica, comentario }),
    });
    setGuardando(false);
    onGuardado(puntajeRubrica(rubrica));
  }

  if (!d) return <p className="text-xs text-slate-500">Cargando la historia...</p>;

  const h: HistoriaOdontologica = d.historia ? normalizarHistoria(d.historia) : historiaVacia();
  const p = d.pacienteReal ?? {};
  const paciente: PacienteOdontologia = {
    nombres: p.nombres ?? "",
    primerApellido: p.primerApellido ?? "",
    segundoApellido: p.segundoApellido ?? null,
    tipoDocumento: p.tipoDocumento ?? "",
    documento: p.documento ?? "",
    sexo: p.sexo ?? "",
    fechaNacimiento: p.fechaNacimiento ?? new Date().toISOString(),
    eps: p.eps ?? null,
    profesion: null,
    ocupacion: p.ocupacion ?? null,
    estadoCivil: null,
    telefono: null,
    direccion: null,
    contactoEmergencia: null,
    parentescoContacto: null,
    telefonoContacto: null,
  };
  const denticion = (d.denticion ?? "PERMANENTE") as Denticion;
  const puntaje = puntajeRubrica(rubrica);

  return (
    <div className="mt-3 flex flex-col gap-3 border-t border-slate-100 pt-3">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <button onClick={() => setVerHistoria((v) => !v)} className="font-semibold text-blue-700 hover:underline">
          {verHistoria ? "Ocultar la historia" : "Ver la historia completa"}
        </button>
        <span className="text-slate-500">
          {d.cerrada
            ? `Cerrada · conducta: ${REMISIONES.find((r) => r.codigo === d.remision)?.etiqueta ?? "—"}`
            : "El estudiante no la cerró"}
        </span>
      </div>

      {verHistoria && (
        <div className="flex flex-col gap-3 rounded-lg bg-slate-50 p-2">
          <SeccionIdentificacion paciente={paciente} />
          <SeccionAlerta h={h} />
          <SeccionAnamnesis h={h} />
          <SeccionExamenes h={h} />
          <SeccionOdontograma h={h} denticion={denticion} />
          <SeccionPlacaHigiene h={h} denticion={denticion} />
          <SeccionDiagnosticoPlan h={h} />
          <SeccionEvolucion h={h} />
        </div>
      )}

      <div className="flex flex-col gap-2">
        {CRITERIOS_RUBRICA.map((c) => (
          <div key={c.codigo} className="rounded-lg border border-slate-200 p-2.5">
            <p className="text-sm font-medium text-slate-800">{c.etiqueta}</p>
            <p className="text-[11px] text-slate-500">{c.ayuda}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5" role="radiogroup" aria-label={c.etiqueta}>
              {NIVELES.map((n) => (
                <button
                  key={n.valor}
                  type="button"
                  role="radio"
                  aria-checked={rubrica[c.codigo] === n.valor}
                  onClick={() => setRubrica((r) => ({ ...r, [c.codigo]: n.valor }))}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                    rubrica[c.codigo] === n.valor
                      ? n.valor === 2
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : n.valor === 1
                          ? "border-amber-500 bg-amber-500 text-white"
                          : "border-red-600 bg-red-600 text-white"
                      : "border-slate-300 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {n.etiqueta}
                </button>
              ))}
            </div>
          </div>
        ))}
        <label className="text-xs font-medium text-slate-600">
          Comentario para el estudiante (se ve en el reporte)
          <textarea
            rows={2}
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={guardar}
            disabled={guardando}
            className="rounded-lg bg-blue-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-900 disabled:opacity-40"
          >
            {guardando ? "Guardando..." : "Guardar calificación"}
          </button>
          <span className="text-xs text-slate-600">
            {puntaje === null ? "Califica los 4 criterios para que tenga nota." : `Nota: ${puntaje}%`}
          </span>
        </div>
      </div>
    </div>
  );
}
