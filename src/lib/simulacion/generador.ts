/**
 * Genera un borrador de pacientes (historia clínica + receta) para una Simulación, a
 * partir del catálogo real de medicamentos. Puro respecto a la DB salvo por la lectura del
 * catálogo y el chequeo de cédulas ya usadas — no escribe nada; quien llama decide si
 * guarda el borrador. Ver docs/simulacion.md.
 */
import { prisma } from "@/lib/nucleo/prisma";
import type { CategoriaAfiliado, Genero, TipoRecogida } from "@prisma/client";
import {
  ANTECEDENTES,
  APELLIDOS,
  DIAGNOSTICOS_ALTO_COSTO,
  DIAGNOSTICOS_COMUNES,
  MEDICOS,
  NOMBRES_FEMENINOS,
  NOMBRES_MASCULINOS,
  PESOS_CATEGORIA_AFILIADO,
  familiaAlergenica,
  type DiagnosticoConEdad,
} from "./bancos";
import type { CodigoSituacion } from "./situaciones";

/**
 * El estudiante del grupo que lleva un caso a la ventanilla. Cada caso se arma alrededor
 * de él: es el paciente, o quien reclama por un familiar (ver `generarPacientes`).
 */
export type Interprete = { estudianteId: string | null; nombre: string; genero: Genero | null };

export type RenglonGenerado = {
  medicamentoId: string;
  medicamentoNombre: string;
  cantidadAutorizada: number;
  medico: string;
  fechaEmision: Date;
  fechaVigencia: Date;
};

export type PacienteGenerado = {
  nombre: string;
  cedula: string;
  /** CC | TI | RC, según la edad (ver `tipoDocumentoPorEdad`). */
  tipoDocumento: string;
  edad: number;
  estudianteId: string | null;
  genero: Genero | null;
  alergias: string[];
  antecedentes: string;
  diagnostico: string;
  esAltoCosto: boolean;
  categoriaAfiliado: CategoriaAfiliado;
  renglones: RenglonGenerado[];
  // Fase 5 (ver docs/simulacion.md): quién se presenta realmente en la ventanilla.
  tipoRecogida: TipoRecogida;
  personaRecogeNombre: string | null;
  personaRecogeCedula: string | null;
  personaRecogeRelacion: string | null;
  /** Situaciones de práctica que trae este paciente (vacío = caso normal). */
  situaciones: CodigoSituacion[];
};

function elegir<T>(lista: readonly T[]): T {
  return lista[Math.floor(Math.random() * lista.length)];
}

/**
 * Igual que `elegir`, pero solo entre las opciones cuyo rango de edad incluye a `edad` —
 * evita casos absurdos como "control prenatal" en un niño o "control de crecimiento" en un
 * adulto mayor — y, si se conoce el género del paciente, entre las que le aplican ("control
 * prenatal" solo si es FEMENINO). Sin género conocido (null/OTRO), no se restringe por eso —
 * no se puede filtrar por algo que no se sabe. Si por lo que sea nada calza (no debería
 * pasar con los bancos actuales), cae a la lista completa para no romper la generación.
 */
function elegirPorEdad(lista: readonly DiagnosticoConEdad[], edad: number, genero: Genero | null): string {
  const porEdad = lista.filter((d) => (d.minEdad ?? 0) <= edad && edad <= (d.maxEdad ?? 200));
  const candidatos =
    genero === "FEMENINO" || genero === "MASCULINO"
      ? porEdad.filter((d) => !d.genero || d.genero === genero)
      : porEdad;
  return elegir(candidatos.length > 0 ? candidatos : porEdad.length > 0 ? porEdad : lista).texto;
}

function entero(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function elegirPesado<T extends string>(opciones: { categoria: T; peso: number }[]): T {
  const total = opciones.reduce((s, o) => s + o.peso, 0);
  let r = Math.random() * total;
  for (const o of opciones) {
    if (r < o.peso) return o.categoria;
    r -= o.peso;
  }
  return opciones[opciones.length - 1].categoria;
}

/** Número de documento de 10 dígitos que no use ningún paciente ni otro caso de esta tanda. */
async function cedulaDisponible(usadas: Set<string>): Promise<string> {
  for (let intento = 0; intento < 20; intento++) {
    const candidata = String(entero(1_000_000_000, 1_099_999_999));
    if (usadas.has(candidata)) continue;
    const existe = await prisma.paciente.findUnique({ where: { cedula: candidata } });
    if (!existe) {
      usadas.add(candidata);
      return candidata;
    }
  }
  // Extremadamente improbable, pero sin bucle infinito: cae a un sufijo con timestamp.
  const respaldo = `11${Date.now()}`.slice(0, 10);
  usadas.add(respaldo);
  return respaldo;
}

/** Documento de identidad colombiano según la edad: registro civil, tarjeta de identidad o cédula. */
export function tipoDocumentoPorEdad(edad: number): "RC" | "TI" | "CC" {
  if (edad < 7) return "RC";
  if (edad < 18) return "TI";
  return "CC";
}

/**
 * El apellido que el estudiante comparte con su familiar del caso. El nombre viene en un
 * solo campo, así que se adivina: con 4 palabras o más ("María Fernanda Gómez Ruiz") el
 * primer apellido es la penúltima; con menos ("Laura Torres", "Juan Pérez Gómez"), la última.
 */
export function apellidoDeFamilia(nombreCompleto: string): string {
  const palabras = nombreCompleto.trim().split(/\s+/);
  if (palabras.length < 2) return elegir(APELLIDOS);
  return palabras.length >= 4 ? palabras[palabras.length - 2] : palabras[palabras.length - 1];
}

/** "hijo"/"hija" según el género del estudiante; sin género conocido, la forma neutra "hijo(a)". */
function enGenero(base: { m: string; f: string; n: string }, genero: Genero | null) {
  return genero === "FEMENINO" ? base.f : genero === "MASCULINO" ? base.m : base.n;
}

const PARENTESCOS_TERCERO = [
  { m: "hijo", f: "hija", n: "hijo(a)", edad: [55, 90] as const },
  { m: "nieto", f: "nieta", n: "nieto(a)", edad: [70, 95] as const },
  { m: "cuidador", f: "cuidadora", n: "cuidador(a)", edad: [60, 95] as const },
];

/**
 * Genera un caso por cada estudiante del grupo, siempre con su nombre: él es quien va a la
 * ventanilla. Según las situaciones del caso:
 * - Normal: el estudiante es el paciente (adulto, con cédula).
 * - Menor de edad: el paciente es su hijo(a) (registro civil o tarjeta de identidad) y el
 *   estudiante va como su padre, madre o acudiente.
 * - Tercero autorizado: reclama por un familiar mayor (o por quien cuida), con autorización.
 * - Suplantación: lleva la fórmula de un familiar y dice ser él, sin autorización.
 * El familiar es la única persona que no es un estudiante: lleva un nombre del banco y el
 * apellido del estudiante, para que el parentesco se vea en los documentos.
 *
 * `plan[i]` son las situaciones exactas del caso i (ver `planDeSituaciones` / `planAlAzar`):
 * cada caso trae justo esas y ninguna otra, porque son la "respuesta" con la que se califica.
 */
export async function generarPacientes(interpretes: Interprete[], plan: CodigoSituacion[][]): Promise<PacienteGenerado[]> {
  const catalogo = await prisma.medicamento.findMany({
    where: { origen: "CATALOGO_REAL", stock: { gt: 0 } },
    select: { id: true, nombre: true, principioActivo: true, stock: true },
  });
  // Los medicamentos de los casos sin alergia se toman de los que no pertenecen a ninguna
  // familia alergénica, y el de alergia de los que sí (para que el caso funcione).
  const conFamilia = catalogo.filter((m) => familiaAlergenica(m.principioActivo) !== null);
  const sinFamilia = catalogo.filter((m) => familiaAlergenica(m.principioActivo) === null);
  if (catalogo.length === 0) {
    throw new Error("No hay medicamentos del catálogo real con stock disponible para generar recetas.");
  }

  const pacientes: PacienteGenerado[] = [];
  const usadas = new Set<string>();

  for (const [indice, interprete] of interpretes.entries()) {
    const situaciones = [...(plan[indice] ?? [])];
    const tiene = (c: CodigoSituacion) => situaciones.includes(c);
    // Cédula (ficticia) del estudiante: la del paciente si es él mismo, o la que presenta.
    const cedulaEstudiante = await cedulaDisponible(usadas);

    let nombre = interprete.nombre;
    let cedula = cedulaEstudiante;
    let genero = interprete.genero;
    let edad = entero(18, 80);
    let tipoRecogida: TipoRecogida = "EL_MISMO";
    let personaRecogeNombre: string | null = null;
    let personaRecogeCedula: string | null = null;
    let personaRecogeRelacion: string | null = null;

    if (tiene("MENOR_DE_EDAD") || tiene("TERCERO_AUTORIZADO") || tiene("SUPLANTACION")) {
      // El paciente es un familiar; el estudiante es quien se presenta.
      genero = Math.random() < 0.5 ? "FEMENINO" : "MASCULINO";
      const apellido = apellidoDeFamilia(interprete.nombre);
      const nombrePila = elegir(genero === "FEMENINO" ? NOMBRES_FEMENINOS : NOMBRES_MASCULINOS);
      cedula = await cedulaDisponible(usadas);
      personaRecogeNombre = interprete.nombre;
      personaRecogeCedula = cedulaEstudiante;

      if (tiene("MENOR_DE_EDAD")) {
        edad = entero(0, 17);
        tipoRecogida = "TERCERO_AUTORIZADO";
        personaRecogeRelacion = enGenero({ m: "padre", f: "madre", n: "acudiente" }, interprete.genero);
        // Primer apellido del padre, primero de la madre: el del estudiante va donde le toca.
        nombre =
          interprete.genero === "FEMENINO"
            ? `${nombrePila} ${elegir(APELLIDOS)} ${apellido}`
            : `${nombrePila} ${apellido} ${elegir(APELLIDOS)}`;
      } else if (tiene("TERCERO_AUTORIZADO")) {
        const parentesco = elegir(PARENTESCOS_TERCERO);
        edad = entero(parentesco.edad[0], parentesco.edad[1]);
        tipoRecogida = "TERCERO_AUTORIZADO";
        personaRecogeRelacion = enGenero(parentesco, interprete.genero);
        nombre =
          parentesco.m === "cuidador"
            ? `${nombrePila} ${elegir(APELLIDOS)} ${elegir(APELLIDOS)}`
            : `${nombrePila} ${apellido} ${elegir(APELLIDOS)}`;
      } else {
        edad = entero(25, 85);
        tipoRecogida = "SUPLANTACION";
        nombre = `${nombrePila} ${apellido} ${elegir(APELLIDOS)}`;
      }
    }

    const esAltoCosto = tiene("ALTO_COSTO");
    const diagnostico = elegirPorEdad(esAltoCosto ? DIAGNOSTICOS_ALTO_COSTO : DIAGNOSTICOS_COMUNES, edad, genero);
    const categoriaAfiliado = elegirPesado(PESOS_CATEGORIA_AFILIADO) as CategoriaAfiliado;

    // 1-3 renglones, del catálogo real. Si el caso es de alergia, el primero es de una familia
    // alergénica y el paciente queda alérgico a ella; los demás, de ninguna familia.
    const numRenglones = entero(1, 3);
    const renglones: RenglonGenerado[] = [];
    const alergias = new Set<string>();

    for (let r = 0; r < numRenglones; r++) {
      let medicamento: (typeof catalogo)[number];
      if (r === 0 && tiene("ALERGIA") && conFamilia.length > 0) {
        medicamento = elegir(conFamilia);
        alergias.add(familiaAlergenica(medicamento.principioActivo)!);
      } else {
        medicamento = elegir(sinFamilia.length > 0 ? sinFamilia : catalogo);
      }

      const fechaEmision = new Date(Date.now() - entero(0, 20) * 86_400_000);
      // Si el caso es de fórmula vencida, se vence el último renglón (así, con alergia en el
      // primero, cada renglón enseña una sola cosa).
      const vencida = tiene("FORMULA_VENCIDA") && r === numRenglones - 1;
      const diasVigencia = vencida ? -entero(1, 15) : entero(20, 35);
      const fechaVigencia = new Date(fechaEmision.getTime() + diasVigencia * 86_400_000);

      renglones.push({
        medicamentoId: medicamento.id,
        medicamentoNombre: medicamento.nombre,
        // Nunca más de lo que hay en inventario: si no, el caso sería imposible de atender.
        cantidadAutorizada: Math.min(entero(5, 30), medicamento.stock),
        medico: elegir(MEDICOS),
        fechaEmision,
        fechaVigencia,
      });
    }

    pacientes.push({
      nombre,
      cedula,
      tipoDocumento: tipoDocumentoPorEdad(edad),
      edad,
      estudianteId: interprete.estudianteId,
      genero,
      alergias: [...alergias],
      antecedentes: elegirPorEdad(ANTECEDENTES, edad, genero),
      diagnostico,
      esAltoCosto,
      categoriaAfiliado,
      renglones,
      tipoRecogida,
      personaRecogeNombre,
      personaRecogeCedula,
      personaRecogeRelacion,
      // Sin medicamento de familia alergénica en el catálogo, el caso no puede ser de alergia.
      situaciones: situaciones.filter((c) => c !== "ALERGIA" || alergias.size > 0),
    });
  }

  return pacientes;
}
