import { calificarIntento } from "../../nucleo/calificacion";
import type { ContextoEvaluacion, ModuloSimulacion, ResultadoEvaluacion } from "../contrato";
import { escenarioBaseSeguro } from "../contrato";
import { PESOS, ponderar, revisarHistoria } from "./calificacion";
import { denticionDe } from "./consultorio";
import { historiaVacia, normalizarEsperado, normalizarHistoria } from "./historia";
import { estaFueraDeChecklist, evaluarPeligrosHistoria, ultimaHistoria } from "./reglas";

export const simulacionOdontologia: ModuloSimulacion = {
  slug: "odontologia",

  /**
   * Solo la identificación del paciente (viene de admisiones) y qué dentición dibujar.
   * Nada de `esperado` ni de los relatos: eso se revela con /api/modulos/odontologia/...
   */
  proyectarEscenario(escenario, modo) {
    const base = escenarioBaseSeguro(escenario, modo);
    const o = escenario.odontologia;
    return {
      ...base,
      odontologia: o ? { paciente: o.paciente, denticion: denticionDe(o.denticion) } : null,
    };
  },

  async evaluarAccion({ tipo, payload, modo, escenario, accionesPrevias }: ContextoEvaluacion): Promise<ResultadoEvaluacion> {
    const o = escenario.odontologia;
    if (!o) return { peligros: [], fueraDeChecklist: false };

    let peligros: string[] = [];
    // Solo al cerrar: guardar un borrador a mitad de camino no debe costar corazones.
    if (tipo === "CERRAR_HISTORIA") {
      const historia = normalizarHistoria(payload?.historia);
      peligros = evaluarPeligrosHistoria(tipo, historia, normalizarEsperado(o.esperado), accionesPrevias);
    }
    const fueraDeChecklist = modo === "DIFICIL" ? estaFueraDeChecklist(tipo, payload ?? null, escenario.pasos) : false;
    return { peligros, fueraDeChecklist };
  },

  calificar({ escenario, acciones, resultadoObtenido }) {
    const base = calificarIntento(escenario.pasos, acciones, escenario.resultadoEsperado, resultadoObtenido);
    const o = escenario.odontologia;
    if (!o) {
      return {
        ...base,
        detallePasos: base.detallePasos.map((d) => ({ descripcion: d.paso.descripcion, obligatorio: d.paso.obligatorio, cumplido: d.cumplido })),
      };
    }

    const esperado = normalizarEsperado(o.esperado);
    const historia = ultimaHistoria(acciones) ?? historiaVacia();
    const denticion = denticionDe(o.denticion);
    const revision = revisarHistoria(esperado, historia, denticion, escenario.resultadoEsperado, resultadoObtenido);
    const puntajes = { ...revision.puntajes, proceso: base.puntajeProceso };
    const { proceso, ...contenido } = puntajes;
    void proceso;

    return {
      puntajeProceso: base.puntajeProceso,
      puntajeResultado: ponderar(contenido),
      puntajeFinal: ponderar(puntajes),
      detallePasos: [
        ...base.detallePasos.map((d) => ({ descripcion: d.paso.descripcion, obligatorio: d.paso.obligatorio, cumplido: d.cumplido })),
        ...revision.lineas,
      ],
      accionesEvaluadas: base.accionesEvaluadas,
      extra: {
        revisionOdontologia: {
          puntajes,
          pesos: PESOS,
          denticion,
          odontogramaEsperado: esperado.odontograma,
          odontogramaObtenido: historia.odontograma,
          comparacion: revision.odontograma,
          placaEsperada: esperado.placa,
          remisionEsperada: escenario.resultadoEsperado,
          remisionObtenida: resultadoObtenido,
        },
      },
    };
  },
};
