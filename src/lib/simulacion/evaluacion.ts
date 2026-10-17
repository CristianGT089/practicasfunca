/**
 * Calificación de una atención de jornada presencial (Dispensario), a partir de lo que el
 * estudiante registró (entregas y rechazos) y de la verdad del paciente generado.
 *
 * Puro: sin Prisma. Lo usa `jornada.ts#calificarJornada` y las pruebas.
 */
import { calcularCuotaModeradora } from "./cuotaModeradora";
import { familiaAlergenica } from "./bancos";
import type { CategoriaAfiliado, DecisionRecogida, ModalidadPendiente, TipoRecogida } from "@prisma/client";

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
  | "IDENTIDAD_CORRECTA"
  | "IDENTIDAD_INCORRECTA"
  | "PENDIENTE_CORRECTO"
  | "PENDIENTE_INCORRECTO"
  // Recepción técnica
  | "RECEPCION_CORRECTA"
  | "RECEPCION_DATOS"
  | "RECEPCION_DECISION"
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
  | "ACUDIENTE"
  | "HISTORIA_CORRECTA"
  | "RUBRICA"
  // Enfermería (ronda de medicamentos con hoja de enfermería)
  | "SIGNOS_VITALES"
  | "VALORACION"
  | "ESCALAS"
  | "BALANCE"
  | "MEDICAMENTO_DECISION"
  | "CALCULO_DOSIS";

export type Criterio = { clave: ClaveCriterio; descripcion: string; cumplido: boolean; detalle?: string };

export const ETIQUETA_ERROR: Partial<Record<ClaveCriterio, string>> = {
  SIGNOS_VITALES: "Signos vitales no tomados o mal registrados",
  VALORACION: "Valoración incompleta o con hallazgos de más",
  ESCALAS: "Puntaje de escala (Braden, Glasgow, Downton) equivocado",
  BALANCE: "Balance de líquidos mal calculado",
  MEDICAMENTO_DECISION: "Decisión equivocada al administrar (o sin motivo registrado)",
  CALCULO_DOSIS: "Cálculo de dosis o de goteo equivocado",
  CANTIDAD_INCORRECTA: "Entregó una cantidad distinta a la autorizada",
  RECHAZO_INDEBIDO: "Rechazó un medicamento que sí se debía entregar",
  ENTREGO_VENCIDA: "Entregó una fórmula vencida",
  ENTREGO_CON_ALERGIA: "Entregó un medicamento al que el paciente es alérgico",
  ENTREGO_A_SUPLANTADOR: "Entregó a quien no era el paciente ni venía autorizado",
  ENTREGO_NO_AUTORIZADO: "Entregó un medicamento que no estaba autorizado",
  IDENTIDAD_INCORRECTA: "Verificó mal quién reclamaba (documentos o autorización)",
  PENDIENTE_INCORRECTO: "Manejó mal un pendiente (lo disponible, la constancia o la entrega al volver)",
  RECEPCION_DATOS: "Registró mal los datos de un producto (lote, vencimiento, INVIMA, cantidad o temperatura)",
  RECEPCION_DECISION: "Recibió algo no conforme, rechazó algo conforme, o no firmó el acta",
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
  ACUDIENTE: "No registró bien al acudiente del menor (documento, parentesco o consentimiento)",
  RUBRICA: "No cumplió del todo un criterio de la rúbrica del docente",
};

export type PacienteEvaluado = {
  esAltoCosto: boolean;
  categoriaAfiliado: CategoriaAfiliado | null;
  tipoRecogida: TipoRecogida;
  /** Documento de quien reclama por el paciente (tercero o suplantador); null si es él mismo. */
  personaRecogeCedula: string | null;
  /** Lo que registró el estudiante sobre quién reclamaba; null = no lo registró. */
  recogida: { decision: DecisionRecogida; documentoQuienReclama: string | null } | null;
  alergias: string[];
  /** Situaciones del caso (para saber si viene por un pendiente de antes). */
  situaciones?: string[];
  /** Caso de pendiente: cómo quería recibir lo que faltaba. */
  pendientePrefiere?: ModalidadPendiente | null;
  recetas: {
    id: string;
    cantidadAutorizada: number;
    cantidadRedimida: number;
    fechaVigencia: Date;
    medicamento: { id: string; nombre: string; principioActivo: string };
    /** Caso de pendiente: unidades que faltaban en el dispensario al atenderlo. */
    deficitJornada?: number;
    /** La constancia de pendiente de este renglón (null = no se registró). */
    pendiente?: {
      cantidad: number;
      modalidad: ModalidadPendiente;
      direccion: string | null;
      telefono: string | null;
      creadoEn: Date;
    } | null;
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
  /** Cuándo se registró: separa lo entregado antes y después de una constancia de pendiente. */
  creadoEn?: Date;
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
  const entregas = esFarmacia ? agruparVentas(entregasCrudas) : agruparEntregas(entregasCrudas);
  // En el dispensario, registrar "no se entrega" equivale a rechazar todo lo de la fórmula.
  const noEntrega = !esFarmacia && paciente.recogida?.decision === "NO_ENTREGA";
  if (!esFarmacia) criterios.push(criterioRecogida(paciente));

  for (const receta of paciente.recetas) {
    const nombre = receta.medicamento.nombre;
    // Ya se había entregado completo antes de la jornada (caso que reclama un pendiente).
    if (receta.cantidadAutorizada - receta.cantidadRedimida <= 0) continue;
    // Caso de pendiente: se califica el proceso completo de ese renglón.
    if (!esFarmacia && (receta.deficitJornada ?? 0) > 0 && !suplantacion && !noEntrega) {
      criterios.push(...criteriosPendiente(paciente, receta, entregasCrudas));
      continue;
    }
    const registrado = entregas.find((e) => e.recetaElectronicaId === receta.id);
    // En farmacia, no vender = no entregar (es la forma de rechazar en el mostrador).
    const hecho: EntregaEvaluada | undefined =
      registrado ??
      (esFarmacia || noEntrega
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
        detalle: bien
          ? esFarmacia
            ? "No lo vendió."
            : noEntrega
              ? "No lo entregó."
              : "Lo rechazó."
          : `${esFarmacia ? "Vendió" : "Entregó"} ${hecho.cantidad}.`,
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
          : noEntrega
            ? "No entregó nada, pero quien reclamaba sí podía recibirlo."
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
  // Viene por un pendiente de antes: la cuota se cobró aquella vez.
  if (paciente.situaciones?.includes("RECLAMA_PENDIENTE")) return resultado(criterios);
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

const ESPERADO_RECOGIDA: Record<TipoRecogida, DecisionRecogida> = {
  EL_MISMO: "PACIENTE",
  TERCERO_AUTORIZADO: "TERCERO",
  SUPLANTACION: "NO_ENTREGA",
};

const soloDigitos = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

/**
 * Quién reclama: el paciente en persona, alguien autorizado (con su cédula bien registrada)
 * o, en una suplantación, nadie (no se entrega). Lo decide el estudiante comparando los
 * documentos con la fórmula; el sistema no se lo dice durante la jornada.
 */
function criterioRecogida(paciente: PacienteEvaluado): Criterio {
  const esperado = ESPERADO_RECOGIDA[paciente.tipoRecogida];
  const descripcion =
    esperado === "PACIENTE"
      ? "Quién reclama: el paciente en persona"
      : esperado === "TERCERO"
        ? `Quién reclama: otra persona autorizada, CC ${paciente.personaRecogeCedula ?? "—"}`
        : "Quién reclama: los documentos no corresponden al paciente y no hay autorización; no se entrega";
  const r = paciente.recogida;
  if (!r) {
    return { clave: "IDENTIDAD_INCORRECTA", descripcion, cumplido: false, detalle: "No registró quién reclamaba." };
  }
  const documentoBien = esperado !== "TERCERO" || soloDigitos(r.documentoQuienReclama) === soloDigitos(paciente.personaRecogeCedula);
  const cumplido = r.decision === esperado && documentoBien;
  const registrado =
    r.decision === "PACIENTE"
      ? "el paciente en persona"
      : r.decision === "TERCERO"
        ? `otra persona autorizada, CC ${r.documentoQuienReclama ?? "—"}`
        : "que no se entregaba";
  return {
    clave: cumplido ? "IDENTIDAD_CORRECTA" : "IDENTIDAD_INCORRECTA",
    descripcion,
    cumplido,
    detalle: `Registró ${registrado}.${r.decision === esperado && !documentoBien ? " La cédula no es la de quien reclamaba." : ""}`,
  };
}

/**
 * Un renglón sin existencias suficientes (Res. 1604 de 2013): entregar lo que había,
 * registrar el pendiente por lo que faltaba con la modalidad que eligió el paciente y, si
 * volvió durante la jornada, entregarle lo pendiente.
 */
function criteriosPendiente(
  paciente: PacienteEvaluado,
  receta: PacienteEvaluado["recetas"][number],
  entregas: EntregaEvaluada[]
): Criterio[] {
  const nombre = receta.medicamento.nombre;
  const saldo = receta.cantidadAutorizada - receta.cantidadRedimida;
  const deficit = receta.deficitJornada ?? 0;
  const habia = saldo - deficit;
  const p = receta.pendiente ?? null;
  const delRenglon = entregas.filter((e) => e.recetaElectronicaId === receta.id && e.resultado === "ENTREGADO");
  const suma = (lista: EntregaEvaluada[]) => lista.reduce((s, e) => s + e.cantidad, 0);
  const antes = suma(p ? delRenglon.filter((e) => !e.creadoEn || e.creadoEn <= p.creadoEn) : delRenglon);
  const despues = p ? suma(delRenglon.filter((e) => e.creadoEn && e.creadoEn > p.creadoEn)) : 0;
  const criterios: Criterio[] = [];

  criterios.push({
    clave: antes === habia ? "PENDIENTE_CORRECTO" : "PENDIENTE_INCORRECTO",
    descripcion: habia > 0 ? `${nombre}: entregar lo que había (${habia})` : `${nombre}: no había existencias; no se entrega nada en la primera atención`,
    cumplido: antes === habia,
    detalle: `Entregó ${antes}.`,
  });
  criterios.push({
    clave: p?.cantidad === deficit ? "PENDIENTE_CORRECTO" : "PENDIENTE_INCORRECTO",
    descripcion: `${nombre}: registrar el pendiente de ${deficit} y dar la constancia`,
    cumplido: p?.cantidad === deficit,
    detalle: p ? `Registró un pendiente de ${p.cantidad}.` : "No registró el pendiente.",
  });
  if (p) {
    const quiere = paciente.pendientePrefiere ?? null;
    const datosDomicilio = p.modalidad !== "DOMICILIO" || Boolean(p.direccion?.trim() && p.telefono?.trim());
    const bien = (quiere === null || p.modalidad === quiere) && datosDomicilio;
    criterios.push({
      clave: bien ? "PENDIENTE_CORRECTO" : "PENDIENTE_INCORRECTO",
      descripcion:
        quiere === "DOMICILIO"
          ? `${nombre}: el paciente autoriza domicilio; registrar dirección y teléfono`
          : `${nombre}: el paciente prefiere volver a reclamarlo`,
      cumplido: bien,
      detalle: p.modalidad === "DOMICILIO" ? "Registró entrega a domicilio." : "Registró que vuelve a reclamarlo.",
    });
    // Si volvió durante la jornada: se le entrega justo lo que faltaba.
    if (p.modalidad === "ESTABLECIMIENTO" && despues > 0) {
      criterios.push({
        clave: despues === p.cantidad ? "PENDIENTE_CORRECTO" : "PENDIENTE_INCORRECTO",
        descripcion: `${nombre}: al volver, entregar lo pendiente (${p.cantidad})`,
        cumplido: despues === p.cantidad,
        detalle: `Entregó ${despues}.`,
      });
    }
  }
  return criterios;
}

/**
 * Dispensario: un renglón puede entregarse en varias visitas (pendientes). Se suman las
 * entregas; si solo hubo rechazos, cuenta como rechazado.
 */
function agruparEntregas(entregas: EntregaEvaluada[]): EntregaEvaluada[] {
  const porClave = new Map<string, EntregaEvaluada>();
  for (const e of entregas) {
    const clave = e.recetaElectronicaId ?? `m:${e.medicamentoId}`;
    const previa = porClave.get(clave);
    if (!previa) porClave.set(clave, { ...e });
    else if (e.resultado === "ENTREGADO" && previa.resultado === "ENTREGADO") porClave.set(clave, { ...previa, cantidad: previa.cantidad + e.cantidad });
    else if (e.resultado === "ENTREGADO") porClave.set(clave, { ...e, altoCostoMarcado: previa.altoCostoMarcado ?? e.altoCostoMarcado });
  }
  // La marca de cuota puede venir en cualquiera de las entregas: se conserva en la agrupada.
  for (const e of entregas) {
    if (e.altoCostoMarcado === null) continue;
    const g = porClave.get(e.recetaElectronicaId ?? `m:${e.medicamentoId}`);
    if (g && g.altoCostoMarcado === null) porClave.set(e.recetaElectronicaId ?? `m:${e.medicamentoId}`, { ...g, altoCostoMarcado: e.altoCostoMarcado, cuotaModeradora: e.cuotaModeradora });
  }
  return [...porClave.values()];
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
