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
  | "ALERGIA"
  | "ALTO_COSTO"
  | "SE_NIEGA_CEDULA"
  | "PACIENTE_MOLESTO";

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
    queHacer: "Pedir el documento, notar que no es del titular ni viene autorizado, y no entregar nada.",
    indicacionActor: "Preséntate como si fueras el paciente y muestra la cédula que dice \"quien se presenta\".",
    verificable: true,
    tipos: ["DISPENSARIO", "FARMACIA"],
  },
  {
    codigo: "TERCERO_AUTORIZADO",
    nombre: "Tercero autorizado",
    queHacer: "Verificar el parentesco o la autorización de quien reclama y, si todo está en regla, entregar.",
    indicacionActor: "Di que vienes a reclamar por el paciente y explica tu parentesco si te lo preguntan.",
    verificable: true,
    tipos: ["DISPENSARIO", "FARMACIA"],
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
    tipos: ["DISPENSARIO", "FARMACIA"],
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
const EXCLUYENTES: [CodigoSituacion, CodigoSituacion][] = [["SUPLANTACION", "TERCERO_AUTORIZADO"]];

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
