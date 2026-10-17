/**
 * Qué artículos del catálogo real son medicamentos que se dispensan con fórmula, y cuáles
 * son dispositivos médicos e insumos (equipos, sondas, gasas, caretas, antisépticos en
 * frasco...). El inventario importado no los distingue por un campo propio: se reconoce el
 * medicamento por su forma farmacéutica. Los insumos sí sirven en la recepción técnica.
 *
 * Puro respecto a la DB: devuelve filtros de Prisma y una función para probarlos.
 */
import type { Prisma } from "@prisma/client";

/** Comienzos de las formas farmacéuticas dispensables (el catálogo trae variantes y errores: "JAREBE"). */
const FORMAS_DISPENSABLES = [
  "TABLETA",
  "COMPRIMID",
  "CAPSULA",
  "GRAGEA",
  "JARABE",
  "JAREBE",
  "SUSPENSI",
  "INHALADOR",
  "AEROSOL",
  "SACHET",
  "NASAL",
  "INYECTABLE",
];

export function esMedicamentoDispensable(formaFarmaceutica: string | null | undefined): boolean {
  const forma = (formaFarmaceutica ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toUpperCase();
  return FORMAS_DISPENSABLES.some((f) => forma.startsWith(f));
}

/** Filtro de Prisma equivalente a `esMedicamentoDispensable`. */
export const filtroMedicamentosDispensables: Prisma.MedicamentoWhereInput = {
  OR: FORMAS_DISPENSABLES.flatMap((f) => [
    { formaFarmaceutica: { startsWith: f, mode: "insensitive" as const } },
    // "SUSPENSIÓN" con tilde
    ...(f === "SUSPENSI" ? [{ formaFarmaceutica: { startsWith: "SUSPENSIÓ", mode: "insensitive" as const } }] : []),
  ]),
};

/** Dispositivos médicos e insumos: lo que no es medicamento dispensable (y no es basura del inventario). */
export const filtroDispositivosMedicos: Prisma.MedicamentoWhereInput = {
  NOT: filtroMedicamentosDispensables,
  registroInvima: { not: null },
};
