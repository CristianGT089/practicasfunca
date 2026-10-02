/**
 * Dictado de Odontología: el docente lee un caso en voz alta y todos los estudiantes (cada
 * uno con su cuenta) lo registran a la vez. Aquí está lo puro: generar un caso al azar, el
 * guion que lee el docente, el avance de cada estudiante y el mapa de calor por diente.
 * Ver docs/odontologia.md.
 */
import {
  ALERTAS_MEDICAS,
  ANTECEDENTES_ODONTOLOGICOS,
  ANTECEDENTES_PERSONALES,
  EXAMEN_DENTAL,
  EXAMEN_ESTOMATOLOGICO_NA,
  EXAMEN_ESTOMATOLOGICO_SN,
  esperadoVacio,
  etiquetaDe,
  type EsperadoOdontologia,
} from "./historia";
import {
  claveMarca,
  definicionHallazgo,
  esAnterior,
  nombreDiente,
  nombreSuperficie,
  ordenarMarcas,
  type CodigoHallazgo,
  type Marca,
  type Superficie,
} from "./odontograma";
import { APELLIDOS, NOMBRES_FEMENINOS, NOMBRES_MASCULINOS } from "../../simulacion/bancos";

export type SeccionesDictado = "ODONTOGRAMA" | "COMPLETA";

// ---------------------------------------------------------------------------
// Caso al azar
// ---------------------------------------------------------------------------

export type PacienteDictado = {
  nombres: string;
  primerApellido: string;
  segundoApellido: string;
  tipoDocumento: "CC" | "TI" | "RC";
  documento: string;
  sexo: "M" | "F";
  fechaNacimiento: string;
};

export type CasoGenerado = { paciente: PacienteDictado; esperado: EsperadoOdontologia; motivoConsulta: string };

const MOTIVOS = [
  "Vengo a una revisión general.",
  "Me duele una muela cuando como dulce.",
  "Quiero una limpieza y que me revisen.",
  "Se me partió una calza.",
  "Me sangran las encías al cepillarme.",
];

/** Genera un caso de dictado al azar (dentición permanente o temporal). */
export function generarCasoAleatorio(denticion: "PERMANENTE" | "TEMPORAL", completa: boolean, azar: () => number = Math.random): CasoGenerado {
  const entero = (min: number, max: number) => min + Math.floor(azar() * (max - min + 1));
  const elegir = <T,>(l: readonly T[]) => l[Math.floor(azar() * l.length)];

  const sexo: "M" | "F" = azar() < 0.5 ? "F" : "M";
  const edad = denticion === "TEMPORAL" ? entero(3, 6) : entero(18, 70);
  const hoy = new Date();
  const nacimiento = new Date(Date.UTC(hoy.getUTCFullYear() - edad, entero(0, 11), entero(1, 28)));
  const paciente: PacienteDictado = {
    nombres: elegir(sexo === "F" ? NOMBRES_FEMENINOS : NOMBRES_MASCULINOS),
    primerApellido: elegir(APELLIDOS),
    segundoApellido: elegir(APELLIDOS),
    tipoDocumento: denticion === "TEMPORAL" ? "RC" : "CC",
    documento: String(entero(1_000_000_000, 1_099_999_999)),
    sexo,
    fechaNacimiento: nacimiento.toISOString(),
  };

  const usados = new Set<number>();
  const libre = (lista: number[]) => {
    const opciones = lista.filter((d) => !usados.has(d));
    if (opciones.length === 0) return null;
    const d = elegir(opciones);
    usados.add(d);
    return d;
  };
  const marcas: Marca[] = [];
  const caras = (d: number, cuantas: number): Superficie[] => {
    const base: Superficie[] = esAnterior(d) ? ["M", "D", "V"] : ["O"];
    const extra: Superficie[] = esAnterior(d) ? ["L"] : ["M", "D", "V"];
    const elegidas = new Set<Superficie>([elegir(base)]);
    while (elegidas.size < cuantas) elegidas.add(elegir([...base, ...extra]));
    return [...elegidas];
  };
  const porCara = (h: CodigoHallazgo, d: number | null, n = entero(1, 2)) => {
    if (d !== null) for (const s of caras(d, n)) marcas.push({ diente: d, hallazgo: h, superficie: s });
  };
  const deDiente = (h: CodigoHallazgo, d: number | null) => {
    if (d !== null) marcas.push({ diente: d, hallazgo: h });
  };

  if (denticion === "PERMANENTE") {
    const molares = [16, 17, 26, 27, 36, 37, 46, 47];
    const cordales = [18, 28, 38, 48];
    const premolares = [14, 15, 24, 25, 34, 35, 44, 45];
    const anteriores = [11, 12, 13, 21, 22, 23, 31, 32, 33, 41, 42, 43];
    for (let i = 0; i < entero(1, 3); i++) deDiente("AUSENTE", libre(azar() < 0.6 ? cordales : molares));
    for (let i = 0; i < entero(2, 4); i++) porCara("CARIES", libre(azar() < 0.75 ? [...molares, ...premolares] : anteriores));
    for (let i = 0; i < entero(1, 2); i++) porCara("OBTURADO_BUEN_ESTADO", libre([...molares, ...premolares]));
    if (azar() < 0.6) porCara("OBTURADO_MAL_ESTADO", libre([...molares, ...premolares]));
    if (azar() < 0.4) deDiente(azar() < 0.5 ? "CORONA_BUEN_ESTADO" : "CORONA_MAL_ESTADO", libre([...molares, 11, 21]));
    if (azar() < 0.3) deDiente("ENDODONCIA_INDICADA", libre([...molares, ...premolares]));
    if (azar() < 0.3) deDiente("SELLANTE_POR_HACER", libre(molares));
    if (azar() < 0.25) deDiente("RESTO_RADICULAR", libre([...molares, ...premolares]));
    if (azar() < 0.2) deDiente("ROTACION", libre(anteriores));
  } else {
    const molaresT = [54, 55, 64, 65, 74, 75, 84, 85];
    const anterioresT = [51, 52, 53, 61, 62, 63, 71, 72, 73, 81, 82, 83];
    for (let i = 0; i < entero(2, 4); i++) porCara("CARIES", libre(azar() < 0.8 ? molaresT : anterioresT));
    if (azar() < 0.5) porCara("OBTURADO_BUEN_ESTADO", libre(molaresT));
    for (let i = 0; i < entero(0, 2); i++) deDiente("SELLANTE_POR_HACER", libre([55, 65, 75, 85]));
    if (azar() < 0.4) deDiente("EXODONCIA_SIMPLE_INDICADA", libre(molaresT));
  }

  const esperado = { ...esperadoVacio(), odontograma: ordenarMarcas(marcas) };

  if (completa) {
    const tiene = (h: CodigoHallazgo) => marcas.some((m) => m.hallazgo === h);
    const alertas: [string, string[]][] = [
      ["hipertension", ["presion_arterial", "medicamentos"]],
      ["diabetes", ["diabetes", "medicamentos"]],
      ["alergia_penicilina", ["alergias"]],
      ["asma", ["respiratorias", "medicamentos"]],
    ];
    if (denticion === "PERMANENTE" && azar() < 0.6) {
      const [alerta, ants] = elegir(alertas);
      esperado.alertaMedica = [alerta];
      esperado.antecedentesPersonales = ants;
    }
    const odont = new Set<string>();
    if (tiene("AUSENTE") || tiene("RESTO_RADICULAR")) odont.add("exodoncias");
    if (tiene("OBTURADO_BUEN_ESTADO") || tiene("OBTURADO_MAL_ESTADO")) odont.add("operatoria");
    if (tiene("CORONA_BUEN_ESTADO") || tiene("CORONA_MAL_ESTADO")) odont.add("coronas");
    if (azar() < 0.5) odont.add("profilaxis");
    esperado.antecedentesOdontologicos = [...odont];
    const esto = new Set<string>();
    if (tiene("CARIES") && azar() < 0.5) esto.add("odontalgias");
    if (tiene("CARIES") && azar() < 0.4) esto.add("sensibilidad");
    const encia = azar() < 0.35;
    if (encia) esto.add("mucosa_gingival");
    esperado.examenEstomatologico = [...esto];
    esperado.examenDental = encia ? ["sangrado", "inflamacion"] : [];
  }

  return { paciente, esperado, motivoConsulta: elegir(MOTIVOS) };
}

// ---------------------------------------------------------------------------
// Guion que lee el docente
// ---------------------------------------------------------------------------

export type LineaGuion = {
  id: string;
  seccion: "Paciente" | "Alerta y antecedentes" | "Exámenes" | "Odontograma";
  texto: string;
  /** Marcas del odontograma que corresponden a esta línea (para medir el avance). */
  marcas: string[];
};

const lista = (items: string[]) => (items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`);

/** Guion del dictado, en el orden de la historia. Con secciones ODONTOGRAMA, solo los dientes. */
export function guionDictado(esperado: EsperadoOdontologia, secciones: SeccionesDictado, motivoConsulta?: string): LineaGuion[] {
  const lineas: LineaGuion[] = [];
  if (secciones === "COMPLETA") {
    if (motivoConsulta) lineas.push({ id: "motivo", seccion: "Paciente", texto: `Motivo de consulta: "${motivoConsulta}"`, marcas: [] });
    lineas.push({
      id: "alerta",
      seccion: "Alerta y antecedentes",
      texto: esperado.alertaMedica.length
        ? `Alerta médica: ${lista(esperado.alertaMedica.map((c) => etiquetaDe(ALERTAS_MEDICAS, c).toLowerCase()))}.`
        : "Alerta médica: ninguna.",
      marcas: [],
    });
    lineas.push({
      id: "ant-personales",
      seccion: "Alerta y antecedentes",
      texto: esperado.antecedentesPersonales.length
        ? `Antecedentes personales: ${lista(esperado.antecedentesPersonales.map((c) => etiquetaDe(ANTECEDENTES_PERSONALES, c).toLowerCase()))}.`
        : "Antecedentes personales: no refiere.",
      marcas: [],
    });
    lineas.push({
      id: "ant-odontologicos",
      seccion: "Alerta y antecedentes",
      texto: esperado.antecedentesOdontologicos.length
        ? `Antecedentes odontológicos: ${lista(esperado.antecedentesOdontologicos.map((c) => etiquetaDe(ANTECEDENTES_ODONTOLOGICOS, c).toLowerCase()))}.`
        : "Antecedentes odontológicos: no refiere.",
      marcas: [],
    });
    const estomatologico = esperado.examenEstomatologico.map((c) => etiquetaDe([...EXAMEN_ESTOMATOLOGICO_NA, ...EXAMEN_ESTOMATOLOGICO_SN], c).toLowerCase());
    lineas.push({
      id: "ex-estomatologico",
      seccion: "Exámenes",
      texto: estomatologico.length ? `Examen estomatológico, con alteración en: ${lista(estomatologico)}.` : "Examen estomatológico: todo normal.",
      marcas: [],
    });
    const dental = esperado.examenDental.map((c) => etiquetaDe(EXAMEN_DENTAL.flatMap((g) => g.items), c).toLowerCase());
    lineas.push({
      id: "ex-dental",
      seccion: "Exámenes",
      texto: dental.length ? `Examen pulpar, dental y periodontal: ${lista(dental)}.` : "Examen pulpar, dental y periodontal: sin hallazgos.",
      marcas: [],
    });
  }

  const porDiente = new Map<number, Marca[]>();
  for (const m of ordenarMarcas(esperado.odontograma)) porDiente.set(m.diente, [...(porDiente.get(m.diente) ?? []), m]);
  // Orden de dictado habitual: superior derecho → superior izquierdo → inferior izquierdo → inferior derecho.
  const orden = (d: number) => {
    const q = Math.floor(d / 10);
    const pos = d % 10;
    const cuadrante = [1, 5].includes(q) ? 0 : [2, 6].includes(q) ? 1 : [3, 7].includes(q) ? 2 : 3;
    const dentro = cuadrante === 0 || cuadrante === 2 ? -pos : pos; // 18→11, 21→28, 38→31, 41→48
    return cuadrante * 100 + dentro + (q >= 5 ? 50 : 0);
  };
  for (const [diente, ms] of [...porDiente.entries()].sort(([a], [b]) => orden(a) - orden(b))) {
    const porHallazgo = new Map<string, Marca[]>();
    for (const m of ms) porHallazgo.set(m.hallazgo, [...(porHallazgo.get(m.hallazgo) ?? []), m]);
    const partes = [...porHallazgo.entries()].map(([h, grupo]) => {
      const etiqueta = definicionHallazgo(h)?.etiqueta.toLowerCase() ?? h;
      const carasTexto = grupo.filter((g) => g.superficie).map((g) => nombreSuperficie(diente, g.superficie!));
      return carasTexto.length ? `${etiqueta} en ${lista(carasTexto)}` : etiqueta;
    });
    lineas.push({
      id: `d${diente}`,
      seccion: "Odontograma",
      texto: `Diente ${diente} (${nombreDiente(diente)}): ${lista(partes)}.`,
      marcas: ms.map(claveMarca),
    });
  }
  return lineas;
}

/** Cuántas marcas dictadas hasta ahora tiene bien el estudiante. */
export function avanceEstudiante(guion: LineaGuion[], dictadas: Set<string>, marcasEstudiante: Marca[]) {
  const propias = new Set(marcasEstudiante.map(claveMarca));
  const esperadas = guion.filter((l) => dictadas.has(l.id)).flatMap((l) => l.marcas);
  return { esperadas: esperadas.length, bien: esperadas.filter((k) => propias.has(k)).length };
}

// ---------------------------------------------------------------------------
// Mapa de calor
// ---------------------------------------------------------------------------

export type CeldaMapa = { diente: number; bien: number; total: number; porcentaje: number };

/**
 * Por cada diente del caso, cuántos estudiantes lo registraron completo y exacto (todas sus
 * marcas, sin nada de más). Es lo que hay que repasar: "el 36 lo tuvo bien el 30 %".
 */
export function mapaCalor(esperado: Marca[], odontogramas: Marca[][]): CeldaMapa[] {
  const dientes = [...new Set(esperado.filter((m) => m.hallazgo !== "SANO").map((m) => m.diente))];
  return dientes
    .map((diente) => {
      const claves = (ms: Marca[]) =>
        ms
          .filter((m) => m.diente === diente && m.hallazgo !== "SANO")
          .map(claveMarca)
          .sort()
          .join("|");
      const correcta = claves(esperado);
      const bien = odontogramas.filter((o) => claves(o) === correcta).length;
      const total = odontogramas.length;
      return { diente, bien, total, porcentaje: total ? Math.round((bien / total) * 100) : 0 };
    })
    .sort((a, b) => a.porcentaje - b.porcentaje || a.diente - b.diente);
}
