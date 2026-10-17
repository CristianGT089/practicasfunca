/**
 * Catálogo de situaciones de una jornada presencial. El docente marca cuáles quiere
 * practicar ese día; el generador garantiza que cada una aparezca y completa con casos
 * normales. Cada paciente guarda sus situaciones (`Paciente.situaciones`): es la
 * "respuesta" del caso, con la que se califica y se explica en el reporte.
 *
 * Puro: se usa en el cliente (formulario, reporte) y en el servidor (generador, evaluación).
 */
import type { TipoSimulacion } from "@prisma/client";

export type CodigoSituacion =
  | "FORMULA_VENCIDA"
  | "SUPLANTACION"
  | "TERCERO_AUTORIZADO"
  | "MENOR_DE_EDAD"
  | "PENDIENTE"
  | "RECLAMA_PENDIENTE"
  | "ALERGIA"
  | "ALTO_COSTO"
  | "SE_NIEGA_CEDULA"
  | "PACIENTE_MOLESTO"
  // Recepción técnica: un producto del pedido llega con esta novedad.
  | "REC_VENCIMIENTO"
  | "REC_LOTE"
  | "REC_INVIMA"
  | "REC_FRIO"
  | "REC_EMPAQUE"
  | "REC_FALTANTE"
  | "REC_NO_SOLICITADO";

export type DefinicionSituacion = {
  codigo: CodigoSituacion;
  nombre: string;
  /** Qué debe notar y hacer el estudiante. Se muestra en el reporte. */
  queHacer: string;
  /** Indicación impresa para el compañero que interpreta al paciente. */
  indicacionActor: string | null;
  /** true = el sistema lo verifica solo con lo que registró el estudiante. */
  verificable: boolean;
  tipos: TipoSimulacion[];
};

export const SITUACIONES: DefinicionSituacion[] = [
  {
    codigo: "FORMULA_VENCIDA",
    nombre: "Fórmula vencida",
    queHacer: "Revisar la vigencia de cada renglón y no entregar los vencidos: el paciente debe renovar la fórmula.",
    indicacionActor: "Insiste en que te la despachen: \"el médico me la dio hace poco\".",
    verificable: true,
    tipos: ["DISPENSARIO", "FARMACIA"],
  },
  {
    codigo: "SUPLANTACION",
    nombre: "Suplantación",
    queHacer:
      "Comparar la cédula de quien se presenta con el documento de la fórmula: no coinciden y no trae autorización, así que no se entrega nada.",
    indicacionActor: null, // la indicación la arma recetaPdf.ts con los nombres del caso
    verificable: true,
    // Solo el dispensario verifica identidad; en el mostrador de farmacia no se pide documento.
    tipos: ["DISPENSARIO"],
  },
  {
    codigo: "TERCERO_AUTORIZADO",
    nombre: "Tercero autorizado",
    queHacer:
      "Reclama otra persona: verificar la autorización escrita del paciente y la cédula de quien reclama, registrar su documento y entregar.",
    indicacionActor: null,
    verificable: true,
    tipos: ["DISPENSARIO"],
  },
  {
    codigo: "MENOR_DE_EDAD",
    nombre: "Paciente menor de edad",
    queHacer:
      "El menor no reclama solo: verificar su registro civil o tarjeta de identidad y que quien lo acompaña sea su padre, madre o acudiente; registrar el documento del adulto y entregar.",
    indicacionActor: null,
    verificable: true,
    tipos: ["DISPENSARIO"],
  },
  {
    codigo: "PENDIENTE",
    nombre: "Medicamento sin existencias suficientes",
    queHacer:
      "Entregar lo que hay, registrar el pendiente preguntando si el paciente vuelve o autoriza domicilio, darle la constancia (máximo 48 horas, Res. 1604 de 2013) y, cuando vuelva, entregar lo que faltaba.",
    indicacionActor: null,
    verificable: true,
    tipos: ["DISPENSARIO"],
  },
  {
    codigo: "RECLAMA_PENDIENTE",
    nombre: "Viene a reclamar un pendiente",
    queHacer: "Buscar el pendiente de su constancia y entregar solo lo que se le quedó debiendo, no la fórmula completa.",
    indicacionActor: null,
    verificable: true,
    tipos: ["DISPENSARIO"],
  },
  {
    codigo: "ALERGIA",
    nombre: "Alergia a un medicamento",
    queHacer: "Cruzar las alergias registradas con cada medicamento y no entregar el que causa alergia: remitir al médico.",
    indicacionActor: null,
    verificable: true,
    tipos: ["DISPENSARIO", "FARMACIA"],
  },
  {
    codigo: "ALTO_COSTO",
    nombre: "Diagnóstico de alto costo",
    queHacer: "Leer el diagnóstico, reconocer que es de alto costo y no cobrar cuota moderadora.",
    indicacionActor: null,
    verificable: true,
    tipos: ["DISPENSARIO"],
  },
  {
    codigo: "SE_NIEGA_CEDULA",
    nombre: "No quiere mostrar la cédula",
    queHacer: "Explicar con calma por qué se necesita el documento y no atender sin verificar la identidad.",
    indicacionActor: "Al principio niégate a mostrar la cédula: \"siempre vengo y nunca me la piden\". Si te lo explican bien, muéstrala.",
    verificable: false,
    tipos: ["DISPENSARIO"],
  },
  {
    codigo: "PACIENTE_MOLESTO",
    nombre: "Paciente molesto por la espera",
    queHacer: "Reconocer la espera, mantener la calma y atender bien sin saltarse ningún paso.",
    indicacionActor: "Llega quejándote de lo mucho que esperaste. Si te atienden con amabilidad, cálmate poco a poco.",
    verificable: false,
    tipos: ["DISPENSARIO", "FARMACIA"],
  },
];

// Recepción técnica (Res. 1403 de 2007, Manual de condiciones esenciales: recepción
// administrativa y técnica). Cada una le pasa a UN producto del pedido.
SITUACIONES.push(
  {
    codigo: "REC_VENCIMIENTO",
    nombre: "Vencimiento corto o vencido",
    queHacer: "Revisar la fecha de vencimiento: con menos de la vida útil mínima de la política del servicio (6 meses), se rechaza.",
    indicacionActor: null,
    verificable: true,
    tipos: ["RECEPCION"],
  },
  {
    codigo: "REC_LOTE",
    nombre: "El lote no coincide con la factura",
    queHacer: "Comparar el lote de la caja con el de la factura: si no coincide, el producto no es conforme y se rechaza.",
    indicacionActor: null,
    verificable: true,
    tipos: ["RECEPCION"],
  },
  {
    codigo: "REC_INVIMA",
    nombre: "Sin registro sanitario INVIMA",
    queHacer: "Verificar que la etiqueta traiga el registro sanitario INVIMA: sin él no se recibe.",
    indicacionActor: null,
    verificable: true,
    tipos: ["RECEPCION"],
  },
  {
    codigo: "REC_FRIO",
    nombre: "Cadena de frío rota",
    queHacer: "En los refrigerados, revisar el registro de temperatura del transporte: fuera de 2 a 8 °C se rechaza.",
    indicacionActor: "Si te preguntan por la temperatura, muestra el registro del termómetro que viene con la caja.",
    verificable: true,
    tipos: ["RECEPCION"],
  },
  {
    codigo: "REC_EMPAQUE",
    nombre: "Empaque dañado",
    queHacer: "Inspeccionar el empaque: roto, húmedo o abierto, el producto se rechaza.",
    indicacionActor: null,
    verificable: true,
    tipos: ["RECEPCION"],
  },
  {
    codigo: "REC_FALTANTE",
    nombre: "Llegan menos unidades de las facturadas",
    queHacer: "Contar lo que llega: se recibe lo que llegó en buen estado y se deja la novedad del faltante en el acta.",
    indicacionActor: 'Si te dicen que faltan unidades, responde: "así me lo despacharon, que quede en el acta".',
    verificable: true,
    tipos: ["RECEPCION"],
  },
  {
    codigo: "REC_NO_SOLICITADO",
    nombre: "Producto que no se pidió",
    queHacer: "Comparar la factura con la orden de compra: lo que no se pidió no se recibe y se devuelve.",
    indicacionActor: 'Si te dicen que eso no se pidió, insiste un poco: "a mí me dijeron que lo trajera".',
    verificable: true,
    tipos: ["RECEPCION"],
  }
);

const POR_CODIGO = new Map(SITUACIONES.map((s) => [s.codigo, s]));

export function definicionSituacion(codigo: string): DefinicionSituacion | undefined {
  return POR_CODIGO.get(codigo as CodigoSituacion);
}

export function situacionesDeTipo(tipo: TipoSimulacion): DefinicionSituacion[] {
  return SITUACIONES.filter((s) => s.tipos.includes(tipo));
}

/** Proporción de casos normales (sin ninguna situación) que propone el sistema. */
export const PROPORCION_NORMALES_DEFAULT = 0.33;

/** Situaciones que se excluyen entre sí en un mismo paciente. */
/** Las tres dicen quién llega a la ventanilla: un caso trae a lo sumo una. */
export const SITUACIONES_DE_RECOGIDA: CodigoSituacion[] = ["SUPLANTACION", "TERCERO_AUTORIZADO", "MENOR_DE_EDAD"];

const EXCLUYENTES: [CodigoSituacion, CodigoSituacion][] = [
  ["SUPLANTACION", "TERCERO_AUTORIZADO"],
  ["SUPLANTACION", "MENOR_DE_EDAD"],
  ["TERCERO_AUTORIZADO", "MENOR_DE_EDAD"],
  // Un pendiente nuevo y uno de antes en el mismo caso confundirían la constancia.
  ["PENDIENTE", "RECLAMA_PENDIENTE"],
  // Al suplantador no se le entrega nada: no hay pendiente que registrar ni reclamar.
  ["PENDIENTE", "SUPLANTACION"],
  ["RECLAMA_PENDIENTE", "SUPLANTACION"],
  // El pendiente de antes es de un medicamento que ya se entregó en parte: sin otras trampas.
  ["RECLAMA_PENDIENTE", "FORMULA_VENCIDA"],
  ["RECLAMA_PENDIENTE", "ALERGIA"],
];

/**
 * Reparte las situaciones elegidas entre `total` pacientes: garantiza que cada situación
 * aparezca al menos una vez, deja `normales` pacientes sin ninguna y reparte el resto.
 * Algunos pacientes pueden traer dos situaciones compatibles (ej. alergia + molesto), pero
 * nunca dos excluyentes. Devuelve una lista de `total` conjuntos de códigos, en orden
 * aleatorio.
 */
export function planDeSituaciones(
  total: number,
  seleccion: CodigoSituacion[],
  proporcionNormales: number = PROPORCION_NORMALES_DEFAULT,
  azar: () => number = Math.random
): CodigoSituacion[][] {
  const elegidas = [...new Set(seleccion)].filter((c) => POR_CODIGO.has(c));
  if (total <= 0) return [];
  if (elegidas.length === 0) return Array.from({ length: total }, () => []);

  const normales = Math.min(total - 1, Math.max(0, Math.round(total * proporcionNormales)));
  const conSituacion = total - normales;
  const plan: CodigoSituacion[][] = Array.from({ length: conSituacion }, () => []);

  // Cada situación al menos una vez; si hay más situaciones que cupos, se combinan.
  elegidas.forEach((codigo, i) => {
    const intentos = conSituacion;
    for (let k = 0; k < intentos; k++) {
      const slot = plan[(i + k) % conSituacion];
      if (!slot.some((c) => sonExcluyentes(c, codigo))) {
        slot.push(codigo);
        return;
      }
    }
  });

  // Cupos que quedaron vacíos: una situación al azar de las elegidas.
  for (const slot of plan) {
    if (slot.length === 0) slot.push(elegidas[Math.floor(azar() * elegidas.length)]);
  }

  const resultado = [...plan, ...Array.from({ length: normales }, () => [] as CodigoSituacion[])];
  for (let i = resultado.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [resultado[i], resultado[j]] = [resultado[j], resultado[i]];
  }
  return resultado;
}

function sonExcluyentes(a: CodigoSituacion, b: CodigoSituacion) {
  return a === b || EXCLUYENTES.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

/**
 * Cuando el docente no elige situaciones: cada caso se sortea por separado, con más
 * frecuencia que en la vida real para que en una jornada sí aparezcan. Solo usa las
 * situaciones verificables del tipo de jornada; las de actuación (molesto, se niega) las
 * elige el docente a propósito.
 */
export function planAlAzar(total: number, tipo: TipoSimulacion, azar: () => number = Math.random): CodigoSituacion[][] {
  const aplica = (c: CodigoSituacion) => POR_CODIGO.get(c)?.tipos.includes(tipo) ?? false;
  // Recepción: cada pedido trae una o dos novedades al azar (y uno de cada cuatro, ninguna).
  if (tipo === "RECEPCION") {
    const novedades = SITUACIONES.filter((s) => s.tipos.includes("RECEPCION")).map((s) => s.codigo);
    return Array.from({ length: Math.max(0, total) }, () => {
      if (azar() < 0.25) return [];
      const caso = [novedades[Math.floor(azar() * novedades.length)]];
      if (azar() < 0.4) {
        const otra = novedades[Math.floor(azar() * novedades.length)];
        if (!caso.includes(otra)) caso.push(otra);
      }
      return caso;
    });
  }
  return Array.from({ length: Math.max(0, total) }, () => {
    const caso: CodigoSituacion[] = [];
    if (aplica("FORMULA_VENCIDA") && azar() < 0.15) caso.push("FORMULA_VENCIDA");
    if (aplica("ALERGIA") && azar() < 0.15) caso.push("ALERGIA");
    if (aplica("ALTO_COSTO") && azar() < 0.15) caso.push("ALTO_COSTO");
    // Pendientes: 12% se queda corto de existencias, 8% viene a reclamar uno de antes.
    const p = azar();
    const pendiente: CodigoSituacion | null = p < 0.12 ? "PENDIENTE" : p < 0.2 ? "RECLAMA_PENDIENTE" : null;
    if (pendiente && aplica(pendiente)) caso.push(pendiente);
    // Quién llega: 10% menor con su acudiente, 10% tercero autorizado, 6% suplantación.
    const r = azar();
    const recogida: CodigoSituacion | null = r < 0.1 ? "MENOR_DE_EDAD" : r < 0.2 ? "TERCERO_AUTORIZADO" : r < 0.26 ? "SUPLANTACION" : null;
    if (recogida && aplica(recogida)) caso.push(recogida);
    // Lo que no se puede combinar: gana la primera situación sorteada.
    return caso.filter((c, i) => !caso.slice(0, i).some((previa) => sonExcluyentes(previa, c)));
  });
}
