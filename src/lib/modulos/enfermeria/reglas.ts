import { PasoEsperado } from "@prisma/client";
import { estaFueraDeChecklist as estaFueraDeChecklistGenerico } from "../../nucleo/checklist";

export { coincideParametrosConMotivos, contarPasosCumplidos } from "../../nucleo/checklist";

/** Verbos de "consultar/verificar" que en modo difícil nunca cuestan un corazón. */
export const ACCIONES_SIEMPRE_PERMITIDAS: string[] = [
  "VER_FICHA_PACIENTE",
  "VERIFICAR_ORDEN_MEDICA",
  "VERIFICAR_ALERGIA",
  "TOMAR_SIGNOS_VITALES",
];

export function estaFueraDeChecklist(
  tipo: string,
  payload: Record<string, unknown> | null | undefined,
  pasosEsperados: PasoEsperado[]
): boolean {
  return estaFueraDeChecklistGenerico(tipo, payload, pasosEsperados, ACCIONES_SIEMPRE_PERMITIDAS);
}

export type OrdenMedicaLike = {
  medicamento: string;
  dosis: string;
  via: string;
  fechaVigencia: Date;
};

export type ContextoEnfermeria = {
  paciente: { alergias: string[] } | null;
  ordenMedica: OrdenMedicaLike | null;
};

/**
 * Evalúa si registrar la administración de `medicamentoAdministrado` (con la dosis/vía
 * indicadas) es una decisión peligrosa: los "5 correctos" — paciente, medicamento, dosis,
 * vía y vigencia de la orden — más alergias.
 */
export function evaluarPeligroAdministrar(
  medicamentoAdministrado: string,
  dosisAdministrada: string,
  viaAdministrada: string,
  contexto: ContextoEnfermeria
): string[] {
  const razones: string[] = [];
  const { paciente, ordenMedica } = contexto;

  if (!ordenMedica) {
    razones.push("No hay una orden médica verificada que autorice esta administración.");
    return razones;
  }

  if (ordenMedica.medicamento.toLowerCase() !== medicamentoAdministrado.toLowerCase()) {
    razones.push("El medicamento no coincide con el autorizado en la orden médica.");
  }
  if (ordenMedica.dosis !== dosisAdministrada) {
    razones.push("La dosis no coincide con la orden médica.");
  }
  if (ordenMedica.via !== viaAdministrada) {
    razones.push("La vía de administración no coincide con la orden médica.");
  }
  if (new Date(ordenMedica.fechaVigencia) < new Date()) {
    razones.push("La orden médica ya no está vigente.");
  }
  if (paciente?.alergias.some((a) => medicamentoAdministrado.toLowerCase().includes(a.toLowerCase()))) {
    razones.push("El paciente tiene una alergia registrada relacionada con este medicamento.");
  }

  return razones;
}
