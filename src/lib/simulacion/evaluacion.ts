/**
 * Calificación de una atención de jornada presencial (Dispensario), a partir de lo que el
 * estudiante registró (entregas y rechazos) y de la verdad del paciente generado.
 *
 * Puro: sin Prisma. Lo usa `jornada.ts#calificarJornada` y las pruebas.
 */
import { calcularCuotaModeradora } from "./cuotaModeradora";
import { familiaAlergenica } from "./bancos";
import type { CategoriaAfiliado, TipoRecogida } from "@prisma/client";

/** Tipo de acierto o error, para agrupar los errores comunes de la jornada. */
export type ClaveCriterio =
  | "ENTREGA_CORRECTA"
  | "CANTIDAD_INCORRECTA"
  | "RECHAZO_INDEBIDO"
  | "RECHAZO_CORRECTO"
  | "ENTREGO_VENCIDA"
  | "ENTREGO_CON_ALERGIA"
  | "ENTREGO_A_SUPLANTADOR"
  | "ENTREGO_NO_AUTORIZADO"
  | "NO_REGISTRADO"
  | "CUOTA_CORRECTA"
  | "CUOTA_INCORRECTA"
  // Odontología (historia clínica y odontograma)
  | "ODONTOGRAMA_CORRECTO"
  | "ODONTOGRAMA_FALTANTE"
  | "ODONTOGRAMA_SOBRANTE"
  | "ODONTOGRAMA_CARA"
  | "ALERTA_MEDICA"
  | "ANTECEDENTES"
  | "EXAMENES"
  | "INDICE_PLACA"
  | "REMISION"
  | "HISTORIA_CORRECTA"
  | "RUBRICA";

export type Criterio = { clave: ClaveCriterio; descripcion: string; cumplido: boolean; detalle?: string };

export const ETIQUETA_ERROR: Partial<Record<ClaveCriterio, string>> = {
  CANTIDAD_INCORRECTA: "Entregó una cantidad distinta a la autorizada",
  RECHAZO_INDEBIDO: "Rechazó un medicamento que sí se debía entregar",
  ENTREGO_VENCIDA: "Entregó una fórmula vencida",
  ENTREGO_CON_ALERGIA: "Entregó un medicamento al que el paciente es alérgico",
  ENTREGO_A_SUPLANTADOR: "Entregó a quien no era el paciente ni venía autorizado",
  ENTREGO_NO_AUTORIZADO: "Entregó un medicamento que no estaba autorizado",
  NO_REGISTRADO: "No registró en el sistema lo que hizo con un medicamento",
  CUOTA_INCORRECTA: "Cobró mal la cuota moderadora (alto costo)",
  ODONTOGRAMA_FALTANTE: "Le faltó marcar hallazgos en el odontograma",
  ODONTOGRAMA_SOBRANTE: "Marcó hallazgos que el paciente no tenía",
  ODONTOGRAMA_CARA: "Marcó el hallazgo en la cara equivocada del diente",
  ALERTA_MEDICA: "Alerta médica incompleta o con datos de más",
  ANTECEDENTES: "Antecedentes mal registrados",
  EXAMENES: "Examen estomatológico o dental mal registrado",
  INDICE_PLACA: "Índice de placa mal pintado o mal calculado",
  REMISION: "Eligió mal la conducta (remisión)",
  RUBRICA: "No cumplió del todo un criterio de la rúbrica del docente",
};

export type PacienteEvaluado = {
  esAltoCosto: boolean;
  categoriaAfiliado: CategoriaAfiliado | null;
  tipoRecogida: TipoRecogida;
  alergias: string[];
  recetas: {
    id: string;
    cantidadAutorizada: number;
    cantidadRedimida: number;
    fechaVigencia: Date;
    medicamento: { id: string; nombre: string; principioActivo: string };
  }[];
};

export type EntregaEvaluada = {
  recetaElectronicaId: string | null;
  medicamentoId: string | null;
  medicamentoNombre: string;
  cantidad: number;
  resultado: "ENTREGADO" | "RECHAZADO";
  altoCostoMarcado: boolean | null;
  cuotaModeradora: number;
};

const pesos = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`;

/**
 * Qué se esperaba con cada medicamento autorizado y qué hizo el estudiante. Devuelve los
 * criterios y el puntaje (0-100 = porcentaje de criterios cumplidos).
 *
 * - DISPENSARIO: cada renglón se entrega o se rechaza explícitamente en el sistema, y se
 *   cobra (o no) la cuota moderadora.
 * - FARMACIA (mostrador): se registran solo las ventas; no vender es la forma de "rechazar",
 *   y no hay cuota moderadora.
 */
export function evaluarAtencionDispensario(
  paciente: PacienteEvaluado,
  entregasCrudas: EntregaEvaluada[],
  momento: Date,
  tipo: "DISPENSARIO" | "FARMACIA" = "DISPENSARIO"
): { criterios: Criterio[]; puntaje: number } {
  const criterios: Criterio[] = [];
  const suplantacion = paciente.tipoRecogida === "SUPLANTACION";
  const esFarmacia = tipo === "FARMACIA";
  const entregas = esFarmacia ? agruparVentas(entregasCrudas) : entregasCrudas;

  for (const receta of paciente.recetas) {
    const nombre = receta.medicamento.nombre;
    const registrado = entregas.find((e) => e.recetaElectronicaId === receta.id);
    // En farmacia, no vender = no entregar (es la forma de rechazar en el mostrador).
    const hecho: EntregaEvaluada | undefined =
      registrado ??
      (esFarmacia
        ? { recetaElectronicaId: receta.id, medicamentoId: null, medicamentoNombre: nombre, cantidad: 0, resultado: "RECHAZADO", altoCostoMarcado: null, cuotaModeradora: 0 }
        : undefined);
    const familia = familiaAlergenica(receta.medicamento.principioActivo);
    const vencida = receta.fechaVigencia.getTime() < momento.getTime();
    const alergico = familia !== null && paciente.alergias.includes(familia);

    const motivo = suplantacion
      ? { clave: "ENTREGO_A_SUPLANTADOR" as const, texto: "quien reclama no es el paciente ni viene autorizado" }
      : vencida
        ? { clave: "ENTREGO_VENCIDA" as const, texto: "la fórmula está vencida" }
        : alergico
          ? { clave: "ENTREGO_CON_ALERGIA" as const, texto: `el paciente es alérgico (${familia})` }
          : null;

    if (!hecho) {
      criterios.push({
        clave: "NO_REGISTRADO",
        descripcion: motivo ? `${nombre}: no entregar, porque ${motivo.texto}` : `${nombre}: entregar lo autorizado`,
        cumplido: false,
        detalle: "No quedó registrado en el sistema (ni entregado ni rechazado).",
      });
      continue;
    }

    if (motivo) {
      const bien = hecho.resultado === "RECHAZADO";
      criterios.push({
        clave: bien ? "RECHAZO_CORRECTO" : motivo.clave,
        descripcion: `${nombre}: no entregar, porque ${motivo.texto}`,
        cumplido: bien,
        detalle: bien ? (esFarmacia ? "No lo vendió." : "Lo rechazó.") : `${esFarmacia ? "Vendió" : "Entregó"} ${hecho.cantidad}.`,
      });
      continue;
    }

    const saldo = Math.max(0, receta.cantidadAutorizada - receta.cantidadRedimida);
    if (hecho.resultado === "RECHAZADO") {
      criterios.push({
        clave: "RECHAZO_INDEBIDO",
        descripcion: `${nombre}: entregar ${saldo}`,
        cumplido: false,
        detalle: esFarmacia
          ? "No lo vendió, pero la fórmula estaba vigente y sin alergia."
          : "Lo rechazó, pero estaba vigente, autorizado y sin alergia.",
      });
    } else {
      const bien = hecho.cantidad === saldo;
      criterios.push({
        clave: bien ? "ENTREGA_CORRECTA" : "CANTIDAD_INCORRECTA",
        descripcion: `${nombre}: entregar ${saldo}`,
        cumplido: bien,
        detalle: `${esFarmacia ? "Vendió" : "Entregó"} ${hecho.cantidad}${bien ? "" : ` de ${saldo}`}.`,
      });
    }
  }

  // Medicamentos entregados que el paciente no tenía autorizados.
  for (const e of entregas) {
    if (e.recetaElectronicaId !== null || e.resultado !== "ENTREGADO") continue;
    criterios.push({
      clave: "ENTREGO_NO_AUTORIZADO",
      descripcion: `${e.medicamentoNombre}: no estaba autorizado`,
      cumplido: false,
      detalle: `Entregó ${e.cantidad}.`,
    });
  }

  // Cuota moderadora: se decide una vez por atención (la marca queda en una sola entrega).
  // Si no entregó nada no hay cuota que evaluar (y cobrarla sería un error). En farmacia no
  // hay cuota moderadora.
  if (esFarmacia) return resultado(criterios);
  const conCuota = entregas.find((e) => e.altoCostoMarcado !== null);
  const entregoAlgo = entregas.some((e) => e.resultado === "ENTREGADO");
  if (!entregoAlgo && conCuota && conCuota.cuotaModeradora > 0) {
    criterios.push({
      clave: "CUOTA_INCORRECTA",
      descripcion: "Cuota moderadora: no se cobra si no se entrega nada",
      cumplido: false,
      detalle: `Cobró ${pesos(conCuota.cuotaModeradora)}.`,
    });
  } else if (!suplantacion && entregoAlgo && conCuota) {
    const bien = conCuota.altoCostoMarcado === paciente.esAltoCosto;
    const correcta = calcularCuotaModeradora(paciente.categoriaAfiliado, paciente.esAltoCosto);
    criterios.push({
      clave: bien ? "CUOTA_CORRECTA" : "CUOTA_INCORRECTA",
      descripcion: paciente.esAltoCosto
        ? "Cuota moderadora: exento por diagnóstico de alto costo"
        : `Cuota moderadora: ${pesos(correcta)}`,
      cumplido: bien,
      detalle: `Cobró ${pesos(conCuota.cuotaModeradora)}.`,
    });
  }

  return resultado(criterios);
}

function resultado(criterios: Criterio[]) {
  const cumplidos = criterios.filter((c) => c.cumplido).length;
  const puntaje = criterios.length > 0 ? Math.round((cumplidos / criterios.length) * 100) : 0;
  return { criterios, puntaje };
}

/** Varias ventas del mismo medicamento a un paciente cuentan como una sola (se suman). */
function agruparVentas(entregas: EntregaEvaluada[]): EntregaEvaluada[] {
  const porClave = new Map<string, EntregaEvaluada>();
  for (const e of entregas) {
    if (e.resultado !== "ENTREGADO") continue;
    const clave = e.recetaElectronicaId ?? `m:${e.medicamentoId}`;
    const previa = porClave.get(clave);
    porClave.set(clave, previa ? { ...previa, cantidad: previa.cantidad + e.cantidad } : { ...e });
  }
  return [...porClave.values()];
}
