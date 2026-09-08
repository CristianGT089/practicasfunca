import type { ContextoEvaluacion, ModuloSimulacion, ResultadoEvaluacion } from "../contrato";
import { escenarioBaseSeguro } from "../contrato";
import { estaFueraDeChecklist, evaluarPeligroAdministrar } from "./reglas";

export const simulacionEnfermeria: ModuloSimulacion = {
  slug: "enfermeria",

  proyectarEscenario(escenario, modo) {
    const base = escenarioBaseSeguro(escenario, modo);
    const e = escenario.enfermeria;
    return { ...base, enfermeria: e ? { paciente: e.paciente, contexto: e.contexto } : null };
  },
  async evaluarAccion({
    tipo,
    payload,
    modo,
    escenario,
    accionesPrevias,
  }: ContextoEvaluacion): Promise<ResultadoEvaluacion> {
    void accionesPrevias;
    const enfermeria = escenario.enfermeria;
    if (!enfermeria) return { peligros: [], fueraDeChecklist: false };

    let peligros: string[] = [];
    if (tipo === "REGISTRAR_ADMINISTRACION" && payload?.medicamento) {
      peligros = evaluarPeligroAdministrar(
        payload.medicamento as string,
        (payload.dosis as string) ?? "",
        (payload.via as string) ?? "",
        { paciente: enfermeria.paciente, ordenMedica: enfermeria.ordenMedica }
      );
    }

    const fueraDeChecklist =
      modo === "DIFICIL" ? estaFueraDeChecklist(tipo, payload ?? null, escenario.pasos) : false;

    return { peligros, fueraDeChecklist };
  },
};
