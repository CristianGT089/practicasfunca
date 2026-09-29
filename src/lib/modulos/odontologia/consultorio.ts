import type { Accion, ModoJuego } from "@prisma/client";
import type { EscenarioConExtensiones } from "../contrato";
import { normalizarEsperado, SUPERFICIES_PLACA } from "./historia";
import { nombreSuperficie, relatoOdontograma, type Denticion } from "./odontograma";

export type InformacionConsultorio = {
  anamnesis: { motivoConsulta: string; relato: string } | null;
  examen: { relato: string | null; hallazgosDentales: string[] } | null;
  placa: { tenidas: string[] } | null;
  radiografia: { tipos: string[]; relato: string | null; hallazgos: string[] } | null;
};

/**
 * Lo que el estudiante ya "descubrió" en el consultorio: cada sección solo se entrega si
 * registró la acción que la revela (interrogar, examinar, revelador, radiografía). Así la
 * respuesta del caso nunca viaja al navegador antes de tiempo.
 */
export function informacionRevelada(
  escenario: EscenarioConExtensiones,
  acciones: Pick<Accion, "tipo" | "payload">[],
  modo: ModoJuego
): InformacionConsultorio {
  const o = escenario.odontologia;
  const vacia: InformacionConsultorio = { anamnesis: null, examen: null, placa: null, radiografia: null };
  if (!o) return vacia;
  const esperado = normalizarEsperado(o.esperado);
  const hizo = (tipo: string) => acciones.some((a) => a.tipo === tipo);
  const conNumero = modo !== "DIFICIL";

  const tiposRadiografia = [
    ...new Set(
      acciones
        .filter((a) => a.tipo === "SOLICITAR_RADIOGRAFIA")
        .map((a) => String((a.payload as Record<string, unknown> | null)?.tipo ?? "PERIAPICAL"))
    ),
  ];

  const porDiente = new Map<number, string[]>();
  for (const m of esperado.placa) {
    porDiente.set(m.diente, [...(porDiente.get(m.diente) ?? []), m.superficie]);
  }

  return {
    anamnesis: hizo("INTERROGAR_PACIENTE") ? { motivoConsulta: o.motivoConsulta, relato: o.relatoAnamnesis } : null,
    examen: hizo("EXAMINAR_PACIENTE")
      ? { relato: o.relatoExamen, hallazgosDentales: relatoOdontograma(esperado.odontograma, "CLINICO", conNumero) }
      : null,
    placa: hizo("APLICAR_REVELADOR_PLACA")
      ? {
          tenidas: [...porDiente.entries()]
            .sort(([a], [b]) => a - b)
            .map(
              ([diente, sups]) =>
                `${diente}: ${SUPERFICIES_PLACA.filter((s) => sups.includes(s))
                  .map((s) => nombreSuperficie(diente, s))
                  .join(", ")}`
            ),
        }
      : null,
    radiografia: tiposRadiografia.length
      ? {
          tipos: tiposRadiografia,
          relato: o.relatoRadiografia,
          hallazgos: relatoOdontograma(esperado.odontograma, "RADIOGRAFICO", conNumero),
        }
      : null,
  };
}

export const denticionDe = (valor: string): Denticion =>
  valor === "TEMPORAL" || valor === "MIXTA" ? valor : "PERMANENTE";
