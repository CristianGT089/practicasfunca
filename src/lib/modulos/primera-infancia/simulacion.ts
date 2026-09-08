import type { ContextoEvaluacion, ModuloSimulacion, ResultadoEvaluacion } from "../contrato";
import { escenarioBaseSeguro } from "../contrato";
import { estaFueraDeChecklist, evaluarPeligroValorarHito } from "./reglas";

export const simulacionPrimeraInfancia: ModuloSimulacion = {
  slug: "primera_infancia",

  proyectarEscenario(escenario, modo) {
    const base = escenarioBaseSeguro(escenario, modo);
    const i = escenario.infancia;
    return {
      ...base,
      infancia: i ? { nino: i.nino, contexto: i.contexto, hitosEsperados: i.hitosEsperados } : null,
    };
  },
  async evaluarAccion({
    tipo,
    payload,
    modo,
    escenario,
    accionesPrevias,
  }: ContextoEvaluacion): Promise<ResultadoEvaluacion> {
    const infancia = escenario.infancia;
    if (!infancia) return { peligros: [], fueraDeChecklist: false };

    let peligros: string[] = [];
    if (tipo === "VALORAR_HITO") {
      peligros = evaluarPeligroValorarHito(infancia.nino, accionesPrevias);
    }

    const fueraDeChecklist =
      modo === "DIFICIL" ? estaFueraDeChecklist(tipo, payload ?? null, escenario.pasos) : false;

    return { peligros, fueraDeChecklist };
  },
};
