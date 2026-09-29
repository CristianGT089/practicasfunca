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
  NOMBRES,
  NOMBRES_FEMENINOS,
  NOMBRES_MASCULINOS,
  PESOS_CATEGORIA_AFILIADO,
  PESOS_GENERO,
  RELACIONES_TERCERO,
  familiaAlergenica,
  type DiagnosticoConEdad,
} from "./bancos";
import type { CodigoSituacion } from "./situaciones";

/** Un nombre puntual que el admin le da al generador — ver `generarPacientes`. */
export type NombreSolicitado = { nombre: string; genero?: Genero | null };

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
  edad: number;
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

async function cedulaDisponible(): Promise<string> {
  for (let intento = 0; intento < 20; intento++) {
    const candidata = String(entero(1_000_000_000, 1_099_999_999));
    const existe = await prisma.paciente.findUnique({ where: { cedula: candidata } });
    if (!existe) return candidata;
  }
  // Extremadamente improbable, pero sin bucle infinito: cae a un sufijo con timestamp.
  return `11${Date.now()}`.slice(0, 10);
}

/**
 * Genera pacientes nuevos, de dos formas:
 * - Con `nombres`: uno por cada nombre dado (y su género, si se sabe) — para armar la
 *   historia clínica alrededor de un nombre puntual que pida el admin.
 * - Con `cantidad`: nombres al azar (género sorteado primero, luego un nombre que le
 *   corresponda) — para cuando no hace falta un nombre en concreto.
 *
 * `probabilidadAltoCosto` es la fracción (0-1) que sale con un diagnóstico de alto costo —
 * más alto que en la vida real a propósito, para que los estudiantes sí se topen con el
 * caso de exención en una tanda normal de práctica.
 */
export async function generarPacientes(
  cantidadONombres: number | NombreSolicitado[],
  {
    probabilidadAltoCosto = 0.15,
    probabilidadRecetaVencida = 0.15,
    probabilidadTercero = 0.2,
    probabilidadSuplantacionSiTercero = 0.3,
    plan,
  }: {
    /**
     * Situaciones exactas por paciente (ver `planDeSituaciones`). Con plan, nada se sortea:
     * cada paciente trae justo sus situaciones y ninguna otra, para que la "respuesta" del
     * caso sea la que eligió el docente. Sin plan, se usan las probabilidades (modo libre).
     */
    plan?: CodigoSituacion[][];
    probabilidadAltoCosto?: number;
    probabilidadRecetaVencida?: number;
    /** fracción que trae a alguien distinto del paciente a recoger (tercero o suplantador) */
    probabilidadTercero?: number;
    /** de esos, la fracción que es una suplantación en vez de un tercero autorizado */
    probabilidadSuplantacionSiTercero?: number;
  } = {}
): Promise<PacienteGenerado[]> {
  const catalogo = await prisma.medicamento.findMany({
    where: { origen: "CATALOGO_REAL", stock: { gt: 0 } },
    select: { id: true, nombre: true, principioActivo: true, stock: true },
  });
  // Con plan, los medicamentos de los casos sin alergia se toman de los que no pertenecen a
  // ninguna familia alergénica, y el de alergia de los que sí (para que el caso funcione).
  const conFamilia = catalogo.filter((m) => familiaAlergenica(m.principioActivo) !== null);
  const sinFamilia = catalogo.filter((m) => familiaAlergenica(m.principioActivo) === null);
  if (catalogo.length === 0) {
    throw new Error("No hay medicamentos del catálogo real con stock disponible para generar recetas.");
  }

  const solicitados: (NombreSolicitado | null)[] = Array.isArray(cantidadONombres)
    ? cantidadONombres
    : Array.from({ length: cantidadONombres }, () => null);

  const pacientes: PacienteGenerado[] = [];

  for (const [indice, solicitado] of solicitados.entries()) {
    const situaciones = plan ? [...(plan[indice] ?? [])] : null;
    const tiene = (c: CodigoSituacion) => situaciones?.includes(c) ?? false;
    // Sin nombre puntual: sortea género primero y saca un nombre del banco que corresponda.
    const genero: Genero | null = solicitado?.genero ?? (solicitado ? null : (elegirPesado(PESOS_GENERO) as Genero));
    const bancoNombres = genero === "FEMENINO" ? NOMBRES_FEMENINOS : genero === "MASCULINO" ? NOMBRES_MASCULINOS : NOMBRES;
    const nombre = solicitado?.nombre.trim() || `${elegir(bancoNombres)} ${elegir(APELLIDOS)} ${elegir(APELLIDOS)}`;
    const cedula = await cedulaDisponible();
    const edad = entero(1, 90);

    const esAltoCosto = situaciones ? tiene("ALTO_COSTO") : Math.random() < probabilidadAltoCosto;
    const diagnostico = elegirPorEdad(esAltoCosto ? DIAGNOSTICOS_ALTO_COSTO : DIAGNOSTICOS_COMUNES, edad, genero);
    const categoriaAfiliado = elegirPesado(PESOS_CATEGORIA_AFILIADO) as CategoriaAfiliado;

    // 1-3 renglones, del catálogo real; si alguno cae en una familia alergénica conocida,
    // ese paciente queda alérgico a esa familia (para que el aviso de alergia sí dispare).
    const numRenglones = entero(1, 3);
    const renglones: RenglonGenerado[] = [];
    const alergias = new Set<string>();

    for (let r = 0; r < numRenglones; r++) {
      let medicamento: (typeof catalogo)[number];
      if (!situaciones) {
        medicamento = elegir(catalogo);
        const familia = familiaAlergenica(medicamento.principioActivo);
        // ~30% de las veces que el renglón toca una familia conocida, se marca alérgico a
        // propósito — es el caso de práctica, no todos los pacientes deben serlo.
        if (familia && Math.random() < 0.3) alergias.add(familia);
      } else if (r === 0 && tiene("ALERGIA") && conFamilia.length > 0) {
        medicamento = elegir(conFamilia);
        alergias.add(familiaAlergenica(medicamento.principioActivo)!);
      } else {
        medicamento = elegir(sinFamilia.length > 0 ? sinFamilia : catalogo);
      }

      const fechaEmision = new Date(Date.now() - entero(0, 20) * 86_400_000);
      // Con plan: si el caso es de fórmula vencida, se vence el último renglón (así, con
      // alergia en el primero, cada renglón enseña una sola cosa).
      const vencida = situaciones
        ? tiene("FORMULA_VENCIDA") && r === numRenglones - 1
        : Math.random() < probabilidadRecetaVencida;
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

    // Quién se presenta en la ventanilla: la mayoría de las veces es el paciente mismo; a
    // veces llega un tercero (autorizado o suplantando), para que el estudiante practique
    // verificar identidad además del checklist de la fórmula.
    let tipoRecogida: TipoRecogida = "EL_MISMO";
    let personaRecogeNombre: string | null = null;
    let personaRecogeCedula: string | null = null;
    let personaRecogeRelacion: string | null = null;
    const llegaOtro = situaciones
      ? tiene("SUPLANTACION") || tiene("TERCERO_AUTORIZADO")
      : Math.random() < probabilidadTercero;
    if (llegaOtro) {
      const esSuplantacion = situaciones ? tiene("SUPLANTACION") : Math.random() < probabilidadSuplantacionSiTercero;
      tipoRecogida = esSuplantacion ? "SUPLANTACION" : "TERCERO_AUTORIZADO";
      personaRecogeNombre = `${elegir(NOMBRES)} ${elegir(APELLIDOS)} ${elegir(APELLIDOS)}`;
      personaRecogeCedula = String(entero(1_000_000_000, 1_099_999_999));
      personaRecogeRelacion = esSuplantacion ? null : elegir(RELACIONES_TERCERO);
    }

    pacientes.push({
      nombre,
      cedula,
      edad,
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
      situaciones:
        situaciones?.filter((c) => c !== "ALERGIA" || alergias.size > 0) ??
        situacionesDetectadas({ esAltoCosto, tipoRecogida, alergias: [...alergias], renglones }),
    });
  }

  return pacientes;
}

/** En modo libre (sin plan), deduce las situaciones que salieron al azar. */
function situacionesDetectadas(p: {
  esAltoCosto: boolean;
  tipoRecogida: TipoRecogida;
  alergias: string[];
  renglones: RenglonGenerado[];
}): CodigoSituacion[] {
  const s: CodigoSituacion[] = [];
  if (p.renglones.some((r) => r.fechaVigencia.getTime() < Date.now())) s.push("FORMULA_VENCIDA");
  if (p.tipoRecogida === "SUPLANTACION") s.push("SUPLANTACION");
  if (p.tipoRecogida === "TERCERO_AUTORIZADO") s.push("TERCERO_AUTORIZADO");
  if (p.alergias.length > 0) s.push("ALERGIA");
  if (p.esAltoCosto) s.push("ALTO_COSTO");
  return s;
}
