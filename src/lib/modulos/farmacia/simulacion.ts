import type { ContextoEvaluacion, ModuloSimulacion, ResultadoEvaluacion } from "../contrato";
import { escenarioBaseSeguro } from "../contrato";
import { estaFueraDeChecklist, evaluarPeligroAgregar } from "./reglas";

export const simulacionFarmacia: ModuloSimulacion = {
  slug: "farmacia",

  proyectarEscenario(escenario, modo) {
    const base = escenarioBaseSeguro(escenario, modo);
    const f = escenario.farmacia;
    if (!f) return base;
    // La receta física se renderiza como documento; se envían sus campos pero nunca la
    // ficha del paciente (identidad/alergias): eso se revela al solicitar la cédula.
    const { id, escenarioId, pacienteId, paciente, ...recetaFisica } = f;
    void id;
    void escenarioId;
    void paciente;
    return {
      ...base,
      ...recetaFisica,
      mostrarIdentidad: pacienteId !== null || f.actitudCedula !== null,
    };
  },

  async cargarDatosIniciales(prisma) {
    return { medicamentos: await prisma.medicamento.findMany({ orderBy: { nombre: "asc" } }) };
  },
  async evaluarAccion({
    tipo,
    payload,
    modo,
    escenario,
    accionesPrevias,
    prisma,
  }: ContextoEvaluacion): Promise<ResultadoEvaluacion> {
    const farmacia = escenario.farmacia;
    if (!farmacia) return { peligros: [], fueraDeChecklist: false };

    let peligros: string[] = [];
    if (tipo === "AGREGAR_A_VENTA" && payload?.medicamentoId) {
      const medicamento = await prisma.medicamento.findUnique({
        where: { id: payload.medicamentoId as string },
      });
      if (medicamento) {
        peligros = evaluarPeligroAgregar(
          medicamento,
          { recetaPresentada: farmacia.recetaPresentada, paciente: farmacia.paciente },
          accionesPrevias
        );
      }
    }

    const fueraDeChecklist =
      modo === "DIFICIL" ? estaFueraDeChecklist(tipo, payload ?? null, escenario.pasos) : false;

    return { peligros, fueraDeChecklist };
  },
};
