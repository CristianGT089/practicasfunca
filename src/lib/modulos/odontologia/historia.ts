/**
 * Estructura de la historia clínica odontológica FUNCA ("Historia Salud Oral"), sección por
 * sección, y la historia "esperada" de cada caso con la que se califica al estudiante.
 *
 * Puro: se usa en el cliente (formulario) y en el servidor (calificación, reglas).
 */
import { normalizarMarcas, type Denticion, type Marca, dientesPresentes, esDienteValido } from "./odontograma";

export type ItemCatalogo = { codigo: string; etiqueta: string };

// ---------- IV. Antecedentes personales y familiares ----------
export const ANTECEDENTES_PERSONALES: ItemCatalogo[] = [
  { codigo: "alergias", etiqueta: "Alergias" },
  { codigo: "presion_arterial", etiqueta: "Alteraciones pres. arterial" },
  { codigo: "cancer", etiqueta: "Cáncer" },
  { codigo: "cardiopatias", etiqueta: "Cardiopatías" },
  { codigo: "cirugias", etiqueta: "Cirugías" },
  { codigo: "diabetes", etiqueta: "Diabetes" },
  { codigo: "discrasias", etiqueta: "Discrasias sanguíneas" },
  { codigo: "embarazo", etiqueta: "Embarazo" },
  { codigo: "gastrointestinales", etiqueta: "Enf. gastrointestinales" },
  { codigo: "respiratorias", etiqueta: "Enf. respiratorias" },
  { codigo: "fiebre_reumatica", etiqueta: "Fiebre reumática" },
  { codigo: "hepatitis", etiqueta: "Hepatitis" },
  { codigo: "vih", etiqueta: "HIV – SIDA" },
  { codigo: "linfoadenopatias", etiqueta: "Linfoadenopatías" },
  { codigo: "renales", etiqueta: "Patologías renales" },
  { codigo: "sinusitis", etiqueta: "Sinusitis" },
  { codigo: "emocionales", etiqueta: "Trastornos emocionales" },
  { codigo: "tratamiento_medico", etiqueta: "Tratamiento médico" },
  { codigo: "medicamentos", etiqueta: "Ingesta medicamentos" },
  { codigo: "otras", etiqueta: "Otras" },
];

// ---------- V. Antecedentes odontológicos ----------
export const ANTECEDENTES_ODONTOLOGICOS: ItemCatalogo[] = [
  { codigo: "operatoria", etiqueta: "Operatoria dental" },
  { codigo: "exodoncias", etiqueta: "Exodoncias" },
  { codigo: "conductos", etiqueta: "Tratamiento de conductos" },
  { codigo: "cirugias_orales", etiqueta: "Cirugías orales" },
  { codigo: "coronas", etiqueta: "Coronas individuales" },
  { codigo: "protesis", etiqueta: "Prótesis" },
  { codigo: "profilaxis", etiqueta: "Profilaxis" },
  { codigo: "periodontales", etiqueta: "Terapias periodontales" },
  { codigo: "blanqueamiento", etiqueta: "Blanqueamiento" },
  { codigo: "ortodoncia", etiqueta: "Ortodoncia" },
  { codigo: "ortopedia", etiqueta: "Ortopedia maxilar" },
  { codigo: "estetica", etiqueta: "Estética dental" },
];

// ---------- VI. Examen estomatológico ----------
/** 1-10 se marcan Normal/Anormal: en la historia se guardan los ANORMALES. */
export const EXAMEN_ESTOMATOLOGICO_NA: ItemCatalogo[] = [
  { codigo: "carrillos", etiqueta: "Carrillos" },
  { codigo: "frenillos", etiqueta: "Frenillos" },
  { codigo: "mucosa_gingival", etiqueta: "Mucosa gingival" },
  { codigo: "labios", etiqueta: "Labios" },
  { codigo: "lengua", etiqueta: "Lengua" },
  { codigo: "amigdalas", etiqueta: "Amígdalas" },
  { codigo: "paladar_duro", etiqueta: "Paladar duro" },
  { codigo: "paladar_blando", etiqueta: "Paladar blando" },
  { codigo: "reborde_alveolar", etiqueta: "Reborde alveolar" },
  { codigo: "surco_vestibular", etiqueta: "Surco vestibular" },
];
/** 11-20 se marcan Sí/No: en la historia se guardan los SÍ. */
export const EXAMEN_ESTOMATOLOGICO_SN: ItemCatalogo[] = [
  { codigo: "xerostomia", etiqueta: "Xerostomía" },
  { codigo: "alteracion_movimiento", etiqueta: "Alteración de movimiento" },
  { codigo: "desarmonias_oclusales", etiqueta: "Desarmonías oclusales" },
  { codigo: "dolor_atm", etiqueta: "Dolor ATM" },
  { codigo: "dolor_muscular", etiqueta: "Dolor muscular al masticar" },
  { codigo: "ruido_atm", etiqueta: "Ruido ATM" },
  { codigo: "habitos", etiqueta: "Hábitos" },
  { codigo: "halitosis", etiqueta: "Halitosis" },
  { codigo: "odontalgias", etiqueta: "Odontalgias" },
  { codigo: "sensibilidad", etiqueta: "Sensibilidad" },
];

// ---------- VII. Examen pulpar, dental y periodontal ----------
export const EXAMEN_DENTAL: { grupo: string; items: ItemCatalogo[] }[] = [
  {
    grupo: "Examen pulpar",
    items: [
      { codigo: "cuellos_sensibles", etiqueta: "Cuellos sensibles" },
      { codigo: "abscesos", etiqueta: "Abscesos" },
      { codigo: "exposicion_pulpar", etiqueta: "Exposición pulpar" },
      { codigo: "cambio_color_pulpar", etiqueta: "Cambio de color" },
    ],
  },
  {
    grupo: "Tejidos dentarios y oclusión",
    items: [
      { codigo: "supernumerarios", etiqueta: "Supernumerarios" },
      { codigo: "cambio_color_dental", etiqueta: "Cambio de color" },
      { codigo: "descalcificacion", etiqueta: "Descalcificación" },
      { codigo: "facetas_desgaste", etiqueta: "Facetas de desgaste, abrasión y/o erosión" },
    ],
  },
  {
    grupo: "Alteraciones periodontales",
    items: [
      { codigo: "sangrado", etiqueta: "Sangrado" },
      { codigo: "exudacion", etiqueta: "Exudación" },
      { codigo: "supuracion", etiqueta: "Supuración" },
      { codigo: "calculos", etiqueta: "Cálculos" },
      { codigo: "inflamacion", etiqueta: "Inflamación" },
      { codigo: "retracciones", etiqueta: "Retracciones" },
      { codigo: "bolsas", etiqueta: "Presencia de bolsas" },
    ],
  },
];

// ---------- Alerta médica ----------
/**
 * La alerta médica va en el encabezado de la historia: condiciones que cambian cómo se
 * atiende al paciente. Se eligen de una lista (calificable) más una nota libre.
 */
export const ALERTAS_MEDICAS: ItemCatalogo[] = [
  { codigo: "anticoagulado", etiqueta: "Toma anticoagulantes o antiagregantes (riesgo de sangrado)" },
  { codigo: "discrasia", etiqueta: "Trastorno de la coagulación / discrasia sanguínea" },
  { codigo: "hipertension", etiqueta: "Hipertensión arterial" },
  { codigo: "diabetes", etiqueta: "Diabetes" },
  { codigo: "cardiopatia", etiqueta: "Cardiopatía con riesgo de endocarditis (profilaxis antibiótica)" },
  { codigo: "alergia_penicilina", etiqueta: "Alergia a la penicilina" },
  { codigo: "alergia_anestesico", etiqueta: "Alergia a anestésicos locales" },
  { codigo: "alergia_latex", etiqueta: "Alergia al látex" },
  { codigo: "embarazo", etiqueta: "Embarazo" },
  { codigo: "bifosfonatos", etiqueta: "Tratamiento con bifosfonatos" },
  { codigo: "epilepsia", etiqueta: "Epilepsia / convulsiones" },
  { codigo: "asma", etiqueta: "Asma" },
];

/** Condiciones de la alerta médica que hacen peligrosa una extracción si no se registraron. */
export const ALERTAS_RIESGO_SANGRADO = ["anticoagulado", "discrasia"];

// ---------- XI. Remisión (decisión final del caso) ----------
export const REMISIONES = [
  { codigo: "ATENCION_EN_CONSULTA", etiqueta: "Se atiende en la consulta, sin remisión" },
  { codigo: "REMISION_ESPECIALISTA", etiqueta: "Remitir a especialista odontológico" },
  { codigo: "INTERCONSULTA_MEDICA", etiqueta: "Interconsulta médica antes de iniciar el tratamiento" },
] as const;

// ---------- XIII. Índice de placa bacteriana (O'Leary) ----------
/** O'Leary usa 4 superficies por diente (la oclusal no cuenta). */
export type SuperficiePlaca = "V" | "L" | "M" | "D";
export const SUPERFICIES_PLACA: SuperficiePlaca[] = ["V", "L", "M", "D"];
export type MarcaPlaca = { diente: number; superficie: SuperficiePlaca };

export const clavePlaca = (m: MarcaPlaca) => `${m.diente}:${m.superficie}`;

export function normalizarPlaca(raw: unknown): MarcaPlaca[] {
  if (!Array.isArray(raw)) return [];
  const vistas = new Set<string>();
  const salida: MarcaPlaca[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const { diente, superficie } = item as Record<string, unknown>;
    if (typeof diente !== "number" || !esDienteValido(diente)) continue;
    if (typeof superficie !== "string" || !SUPERFICIES_PLACA.includes(superficie as SuperficiePlaca)) continue;
    const m = { diente, superficie: superficie as SuperficiePlaca };
    if (vistas.has(clavePlaca(m))) continue;
    vistas.add(clavePlaca(m));
    salida.push(m);
  }
  return salida;
}

/** Índice de O'Leary = superficies teñidas × 100 / superficies presentes (4 por diente presente). */
export function calcularIndicePlaca(denticion: Denticion, odontograma: Marca[], placa: MarcaPlaca[]) {
  const presentes = new Set(dientesPresentes(denticion, odontograma));
  const tenidas = placa.filter((m) => presentes.has(m.diente)).length;
  const superficiesPresentes = presentes.size * 4;
  const indice = superficiesPresentes > 0 ? Math.round((tenidas * 1000) / superficiesPresentes) / 10 : 0;
  return { tenidas, superficiesPresentes, indice };
}

// ---------------------------------------------------------------------------
// Historia diligenciada por el estudiante
// ---------------------------------------------------------------------------

export type SiNo = "SI" | "NO" | "";

export type RenglonTratamiento = { tratamiento: string; valorUnitario: number; cantidad: number };
export type RenglonEvolucion = { fecha: string; horaEntrada: string; horaSalida: string; descripcion: string };

export type HistoriaOdontologica = {
  alertaMedica: string[];
  alertaMedicaNota: string;
  motivoConsulta: string;
  enfermedadActual: string;
  antecedentesPersonales: string[]; // códigos marcados "Sí"
  antecedentesPersonalesObs: string;
  antecedentesOdontologicos: string[];
  antecedentesOdontologicosObs: string;
  examenEstomatologico: string[]; // anormales (1-10) + "Sí" (11-20)
  examenEstomatologicoObs: string;
  examenDental: string[]; // "Sí"
  dientesAfectados: string;
  examenDentalObs: string;
  radiografia: { requiere: SiNo; periapical: boolean; panoramica: boolean; dientes: string; observaciones: string };
  odontograma: Marca[];
  placa: MarcaPlaca[];
  /** Lo que el estudiante calcula a mano, como en el papel. */
  indicePlaca: string;
  higiene: {
    ultimaVisita: string;
    motivoUltimaVisita: string;
    seCepilla: SiNo;
    vecesDia: string;
    sedaDental: SiNo;
    enjuague: SiNo;
    fluor: SiNo;
    ultimaFluor: string;
    ortodoncia: SiNo;
    cepilloInterproximal: SiNo;
    ultimaLimpieza: string;
  };
  diagnostico: { articular: string; pulpar: string; periodontal: string; dental: string; remision: string };
  pronostico: { favorable: string; desfavorable: string };
  planTratamiento: RenglonTratamiento[];
  evolucion: RenglonEvolucion[];
};

export function historiaVacia(): HistoriaOdontologica {
  return {
    alertaMedica: [],
    alertaMedicaNota: "",
    motivoConsulta: "",
    enfermedadActual: "",
    antecedentesPersonales: [],
    antecedentesPersonalesObs: "",
    antecedentesOdontologicos: [],
    antecedentesOdontologicosObs: "",
    examenEstomatologico: [],
    examenEstomatologicoObs: "",
    examenDental: [],
    dientesAfectados: "",
    examenDentalObs: "",
    radiografia: { requiere: "", periapical: false, panoramica: false, dientes: "", observaciones: "" },
    odontograma: [],
    placa: [],
    indicePlaca: "",
    higiene: {
      ultimaVisita: "",
      motivoUltimaVisita: "",
      seCepilla: "",
      vecesDia: "",
      sedaDental: "",
      enjuague: "",
      fluor: "",
      ultimaFluor: "",
      ortodoncia: "",
      cepilloInterproximal: "",
      ultimaLimpieza: "",
    },
    diagnostico: { articular: "", pulpar: "", periodontal: "", dental: "", remision: "" },
    pronostico: { favorable: "", desfavorable: "" },
    planTratamiento: [],
    evolucion: [],
  };
}

const texto = (v: unknown, max = 4000) => (typeof v === "string" ? v.slice(0, max) : "");
const siNo = (v: unknown): SiNo => (v === "SI" || v === "NO" ? v : "");
const codigos = (v: unknown, catalogo: ItemCatalogo[]) => {
  const validos = new Set(catalogo.map((c) => c.codigo));
  return Array.isArray(v) ? [...new Set(v.filter((c): c is string => typeof c === "string" && validos.has(c)))] : [];
};
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const numero = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);

/** Sanea una historia que llega del cliente (o de una Accion guardada): nunca confía en la forma. */
export function normalizarHistoria(raw: unknown): HistoriaOdontologica {
  const h = obj(raw);
  const radiografia = obj(h.radiografia);
  const higiene = obj(h.higiene);
  const diagnostico = obj(h.diagnostico);
  const pronostico = obj(h.pronostico);
  return {
    alertaMedica: codigos(h.alertaMedica, ALERTAS_MEDICAS),
    alertaMedicaNota: texto(h.alertaMedicaNota, 500),
    motivoConsulta: texto(h.motivoConsulta),
    enfermedadActual: texto(h.enfermedadActual),
    antecedentesPersonales: codigos(h.antecedentesPersonales, ANTECEDENTES_PERSONALES),
    antecedentesPersonalesObs: texto(h.antecedentesPersonalesObs),
    antecedentesOdontologicos: codigos(h.antecedentesOdontologicos, ANTECEDENTES_ODONTOLOGICOS),
    antecedentesOdontologicosObs: texto(h.antecedentesOdontologicosObs),
    examenEstomatologico: codigos(h.examenEstomatologico, [...EXAMEN_ESTOMATOLOGICO_NA, ...EXAMEN_ESTOMATOLOGICO_SN]),
    examenEstomatologicoObs: texto(h.examenEstomatologicoObs),
    examenDental: codigos(h.examenDental, EXAMEN_DENTAL.flatMap((g) => g.items)),
    dientesAfectados: texto(h.dientesAfectados, 500),
    examenDentalObs: texto(h.examenDentalObs),
    radiografia: {
      requiere: siNo(radiografia.requiere),
      periapical: radiografia.periapical === true,
      panoramica: radiografia.panoramica === true,
      dientes: texto(radiografia.dientes, 500),
      observaciones: texto(radiografia.observaciones),
    },
    odontograma: normalizarMarcas(h.odontograma),
    placa: normalizarPlaca(h.placa),
    indicePlaca: texto(h.indicePlaca, 20),
    higiene: {
      ultimaVisita: texto(higiene.ultimaVisita, 200),
      motivoUltimaVisita: texto(higiene.motivoUltimaVisita, 500),
      seCepilla: siNo(higiene.seCepilla),
      vecesDia: texto(higiene.vecesDia, 50),
      sedaDental: siNo(higiene.sedaDental),
      enjuague: siNo(higiene.enjuague),
      fluor: siNo(higiene.fluor),
      ultimaFluor: texto(higiene.ultimaFluor, 200),
      ortodoncia: siNo(higiene.ortodoncia),
      cepilloInterproximal: siNo(higiene.cepilloInterproximal),
      ultimaLimpieza: texto(higiene.ultimaLimpieza, 200),
    },
    diagnostico: {
      articular: texto(diagnostico.articular),
      pulpar: texto(diagnostico.pulpar),
      periodontal: texto(diagnostico.periodontal),
      dental: texto(diagnostico.dental),
      remision: texto(diagnostico.remision),
    },
    pronostico: { favorable: texto(pronostico.favorable), desfavorable: texto(pronostico.desfavorable) },
    planTratamiento: (Array.isArray(h.planTratamiento) ? h.planTratamiento : []).slice(0, 40).map((r) => {
      const o = obj(r);
      return { tratamiento: texto(o.tratamiento, 300), valorUnitario: numero(o.valorUnitario), cantidad: numero(o.cantidad) || 1 };
    }),
    evolucion: (Array.isArray(h.evolucion) ? h.evolucion : []).slice(0, 60).map((r) => {
      const o = obj(r);
      return {
        fecha: texto(o.fecha, 20),
        horaEntrada: texto(o.horaEntrada, 10),
        horaSalida: texto(o.horaSalida, 10),
        descripcion: texto(o.descripcion),
      };
    }),
  };
}

// ---------------------------------------------------------------------------
// Historia esperada de un caso (lo que define el docente)
// ---------------------------------------------------------------------------

export type EsperadoOdontologia = {
  alertaMedica: string[];
  antecedentesPersonales: string[];
  antecedentesOdontologicos: string[];
  examenEstomatologico: string[];
  examenDental: string[];
  odontograma: Marca[];
  /** Superficies teñidas con el revelador. Vacío = el caso no incluye índice de placa. */
  placa: MarcaPlaca[];
  requiereRadiografia: boolean;
};

export function esperadoVacio(): EsperadoOdontologia {
  return {
    alertaMedica: [],
    antecedentesPersonales: [],
    antecedentesOdontologicos: [],
    examenEstomatologico: [],
    examenDental: [],
    odontograma: [],
    placa: [],
    requiereRadiografia: false,
  };
}

export function normalizarEsperado(raw: unknown): EsperadoOdontologia {
  const e = obj(raw);
  return {
    alertaMedica: codigos(e.alertaMedica, ALERTAS_MEDICAS),
    antecedentesPersonales: codigos(e.antecedentesPersonales, ANTECEDENTES_PERSONALES),
    antecedentesOdontologicos: codigos(e.antecedentesOdontologicos, ANTECEDENTES_ODONTOLOGICOS),
    examenEstomatologico: codigos(e.examenEstomatologico, [...EXAMEN_ESTOMATOLOGICO_NA, ...EXAMEN_ESTOMATOLOGICO_SN]),
    examenDental: codigos(e.examenDental, EXAMEN_DENTAL.flatMap((g) => g.items)),
    odontograma: normalizarMarcas(e.odontograma),
    placa: normalizarPlaca(e.placa),
    requiereRadiografia: e.requiereRadiografia === true,
  };
}

export const etiquetaDe = (catalogo: ItemCatalogo[], codigo: string) =>
  catalogo.find((c) => c.codigo === codigo)?.etiqueta ?? codigo;
