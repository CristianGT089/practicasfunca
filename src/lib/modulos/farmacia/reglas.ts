import { Accion, Medicamento, Paciente } from "@prisma/client";
import { estaFueraDeChecklist as estaFueraDeChecklistGenerico } from "../checklist";
import { PasoEsperado } from "@prisma/client";

export { coincideParametrosConMotivos, contarPasosCumplidos } from "../checklist";

export type ContextoEscenario = {
  recetaPresentada: boolean;
  paciente: Paciente | null;
};

/**
 * Acciones de "investigar" (buscar, consultar, verificar) que un técnico cuidadoso puede
 * hacer siempre, aunque este caso puntual no las necesite para resolverse — nunca cuestan
 * un corazón en modo difícil, sin importar si aparecen o no en el checklist esperado.
 */
export const ACCIONES_SIEMPRE_PERMITIDAS: string[] = [
  "BUSCAR_MEDICAMENTO",
  "VER_FICHA_PACIENTE",
  "VERIFICAR_RECETA",
  "SOLICITAR_CEDULA",
  "BUSCAR_RECETA_ONLINE",
];

export function estaFueraDeChecklist(
  tipo: string,
  payload: Record<string, unknown> | null | undefined,
  pasosEsperados: PasoEsperado[]
): boolean {
  return estaFueraDeChecklistGenerico(tipo, payload, pasosEsperados, ACCIONES_SIEMPRE_PERMITIDAS);
}

/**
 * Evalúa si agregar `medicamento` a la venta es una decisión clínicamente peligrosa,
 * sin importar el modo de juego. Devuelve la lista de razones (vacía si no hay peligro).
 */
export function evaluarPeligroAgregar(
  medicamento: Medicamento,
  contexto: ContextoEscenario,
  accionesPrevias: Accion[]
): string[] {
  const razones: string[] = [];

  if (contexto.paciente) {
    const tagAlergico = medicamento.tags.find((t) => contexto.paciente!.alergias.includes(t));
    if (tagAlergico) {
      razones.push(`El paciente es alérgico a este medicamento (${tagAlergico}).`);
    }
  }

  if (medicamento.stock <= 0) {
    razones.push("No hay stock disponible de este medicamento.");
  }

  if (medicamento.loteVencimiento && new Date(medicamento.loteVencimiento) < new Date()) {
    razones.push("El lote de este medicamento está vencido.");
  }

  if (medicamento.esControlado) {
    const registrado = accionesPrevias.some(
      (a) =>
        a.tipo === "REGISTRAR_CONTROLADO" &&
        (a.payload as { medicamentoId?: string } | null)?.medicamentoId === medicamento.id
    );
    if (!registrado) {
      razones.push("Es un medicamento controlado y no lo registraste como tal antes de venderlo.");
    }
  }

  if (medicamento.requiereReceta && !contexto.recetaPresentada && !recetaValidadaOnline(medicamento.id, accionesPrevias)) {
    razones.push("Este medicamento requiere receta médica y el cliente no presentó una válida (ni física ni en línea).");
  }

  return razones;
}

/** ¿Hay una acción previa de búsqueda en línea que haya encontrado una receta VIGENTE para este medicamento? */
function recetaValidadaOnline(medicamentoId: string, accionesPrevias: Accion[]): boolean {
  return accionesPrevias.some((a) => {
    if (a.tipo !== "BUSCAR_RECETA_ONLINE") return false;
    const payload = a.payload as { resultados?: { medicamentoId?: string; estado?: string }[] } | null;
    return !!payload?.resultados?.some((r) => r.medicamentoId === medicamentoId && r.estado === "VIGENTE");
  });
}
