/**
 * Hoja de enfermería (registro del turno) del Auxiliar en Enfermería FUNCA. Formato con
 * campos estándar, armado sobre lo que el programa enseña: signos vitales y apoyo al
 * diagnóstico (1.er semestre), actividades de la vida diaria y administración de
 * medicamentos (2.º), cuidado por sistemas y ciclo vital (3.º).
 *
 * Puro (sin Prisma ni React): lo usan el formulario, la calificación y las pruebas.
 * Ver docs/enfermeria.md.
 */

export type ItemCatalogo = { codigo: string; etiqueta: string };
export type SiNo = "SI" | "NO" | "";

// ---------------------------------------------------------------------------
// Signos vitales
// ---------------------------------------------------------------------------

export type TomaSignos = {
  hora: string; // "08:00"
  tas: number | null; // tensión arterial sistólica (mmHg)
  tad: number | null; // diastólica (mmHg)
  fc: number | null; // frecuencia cardiaca (lpm)
  fr: number | null; // frecuencia respiratoria (rpm)
  temperatura: number | null; // °C
  satO2: number | null; // %
  glucometria: number | null; // mg/dL
  dolor: number | null; // EVA 0-10
};

export const tomaVacia = (): TomaSignos => ({
  hora: "",
  tas: null,
  tad: null,
  fc: null,
  fr: null,
  temperatura: null,
  satO2: null,
  glucometria: null,
  dolor: null,
});

export type Nivel = "normal" | "alerta" | "critico";
export type Interpretacion = { nivel: Nivel; texto: string };

/**
 * Interpretación con rangos de referencia de adulto en reposo (guías usadas en la formación
 * técnica en Colombia). En menores de 18 años los rangos cambian con la edad: no se interpreta.
 */
export function interpretarSignos(t: TomaSignos, edad: number | null): Partial<Record<keyof TomaSignos, Interpretacion>> {
  if (edad !== null && edad < 18) return {};
  const r: Partial<Record<keyof TomaSignos, Interpretacion>> = {};
  if (t.tas !== null && t.tad !== null) {
    if (t.tas >= 180 || t.tad >= 120) r.tas = { nivel: "critico", texto: "Crisis hipertensiva" };
    else if (t.tas >= 140 || t.tad >= 90) r.tas = { nivel: "alerta", texto: "Hipertensión" };
    else if (t.tas < 90 || t.tad < 60) r.tas = { nivel: "alerta", texto: "Hipotensión" };
    else r.tas = { nivel: "normal", texto: "Normal" };
  }
  if (t.fc !== null)
    r.fc =
      t.fc > 100 ? { nivel: t.fc >= 130 ? "critico" : "alerta", texto: "Taquicardia" }
      : t.fc < 60 ? { nivel: t.fc < 45 ? "critico" : "alerta", texto: "Bradicardia" }
      : { nivel: "normal", texto: "Normal" };
  if (t.fr !== null)
    r.fr =
      t.fr > 20 ? { nivel: t.fr >= 30 ? "critico" : "alerta", texto: "Taquipnea" }
      : t.fr < 12 ? { nivel: t.fr < 8 ? "critico" : "alerta", texto: "Bradipnea" }
      : { nivel: "normal", texto: "Normal" };
  if (t.temperatura !== null)
    r.temperatura =
      t.temperatura >= 38 ? { nivel: t.temperatura >= 39.5 ? "critico" : "alerta", texto: "Fiebre" }
      : t.temperatura > 37.5 ? { nivel: "alerta", texto: "Febrícula" }
      : t.temperatura < 35 ? { nivel: "critico", texto: "Hipotermia" }
      : { nivel: "normal", texto: "Normal" };
  if (t.satO2 !== null)
    r.satO2 =
      t.satO2 < 90 ? { nivel: "critico", texto: "Hipoxemia" }
      : t.satO2 < 95 ? { nivel: "alerta", texto: "Saturación baja" }
      : { nivel: "normal", texto: "Normal" };
  if (t.glucometria !== null)
    r.glucometria =
      t.glucometria < 70 ? { nivel: t.glucometria < 54 ? "critico" : "alerta", texto: "Hipoglucemia" }
      : t.glucometria > 180 ? { nivel: t.glucometria > 250 ? "critico" : "alerta", texto: "Hiperglucemia" }
      : { nivel: "normal", texto: "En rango" };
  if (t.dolor !== null)
    r.dolor =
      t.dolor >= 7 ? { nivel: "critico", texto: "Dolor severo" }
      : t.dolor >= 4 ? { nivel: "alerta", texto: "Dolor moderado" }
      : t.dolor >= 1 ? { nivel: "normal", texto: "Dolor leve" }
      : { nivel: "normal", texto: "Sin dolor" };
  return r;
}

// ---------------------------------------------------------------------------
// Valoración (catálogos de selección)
// ---------------------------------------------------------------------------

export const CONCIENCIA: ItemCatalogo[] = [
  { codigo: "alerta", etiqueta: "Alerta" },
  { codigo: "somnoliento", etiqueta: "Somnoliento" },
  { codigo: "estuporoso", etiqueta: "Estuporoso" },
  { codigo: "comatoso", etiqueta: "Comatoso" },
];

/** Hallazgos de la valoración céfalo-caudal / por necesidades (marcar los presentes). */
export const VALORACION: { grupo: string; items: ItemCatalogo[] }[] = [
  {
    grupo: "Orientación",
    items: [
      { codigo: "orientado_tiempo", etiqueta: "Orientado en tiempo" },
      { codigo: "orientado_espacio", etiqueta: "Orientado en espacio" },
      { codigo: "orientado_persona", etiqueta: "Orientado en persona" },
      { codigo: "agitado", etiqueta: "Agitado / inquieto" },
    ],
  },
  {
    grupo: "Piel y mucosas",
    items: [
      { codigo: "piel_integra", etiqueta: "Piel íntegra" },
      { codigo: "palidez", etiqueta: "Palidez" },
      { codigo: "cianosis", etiqueta: "Cianosis" },
      { codigo: "ictericia", etiqueta: "Ictericia" },
      { codigo: "diaforesis", etiqueta: "Diaforesis" },
      { codigo: "mucosas_secas", etiqueta: "Mucosas secas" },
      { codigo: "edema", etiqueta: "Edema" },
      { codigo: "lesion_presion", etiqueta: "Lesión por presión" },
      { codigo: "herida_quirurgica", etiqueta: "Herida quirúrgica" },
    ],
  },
  {
    grupo: "Respiración",
    items: [
      { codigo: "eupneico", etiqueta: "Respira sin dificultad" },
      { codigo: "disnea", etiqueta: "Disnea" },
      { codigo: "tos", etiqueta: "Tos / secreciones" },
      { codigo: "o2_canula", etiqueta: "Oxígeno por cánula nasal" },
      { codigo: "o2_mascara", etiqueta: "Oxígeno por máscara" },
    ],
  },
  {
    grupo: "Alimentación",
    items: [
      { codigo: "via_oral", etiqueta: "Tolera vía oral" },
      { codigo: "nada_via_oral", etiqueta: "Nada vía oral" },
      { codigo: "nauseas_vomito", etiqueta: "Náuseas / vómito" },
      { codigo: "sonda_alimentacion", etiqueta: "Sonda de alimentación" },
      { codigo: "requiere_ayuda_comer", etiqueta: "Requiere ayuda para comer" },
    ],
  },
  {
    grupo: "Eliminación",
    items: [
      { codigo: "diuresis_espontanea", etiqueta: "Diuresis espontánea" },
      { codigo: "sonda_vesical", etiqueta: "Sonda vesical" },
      { codigo: "panal", etiqueta: "Uso de pañal" },
      { codigo: "deposicion", etiqueta: "Deposición en el turno" },
      { codigo: "estrenimiento", etiqueta: "Estreñimiento" },
      { codigo: "diarrea", etiqueta: "Diarrea" },
    ],
  },
  {
    grupo: "Movilidad y descanso",
    items: [
      { codigo: "deambula", etiqueta: "Deambula solo" },
      { codigo: "deambula_ayuda", etiqueta: "Deambula con ayuda" },
      { codigo: "en_cama", etiqueta: "Permanece en cama" },
      { codigo: "cambios_posicion", etiqueta: "Requiere cambios de posición" },
      { codigo: "barandas", etiqueta: "Barandas arriba" },
      { codigo: "duerme_bien", etiqueta: "Descansa / duerme bien" },
    ],
  },
  {
    grupo: "Dispositivos",
    items: [
      { codigo: "cateter_periferico", etiqueta: "Catéter venoso periférico" },
      { codigo: "liquidos_ev", etiqueta: "Líquidos endovenosos" },
      { codigo: "dren", etiqueta: "Dren" },
      { codigo: "sonda_nasogastrica", etiqueta: "Sonda nasogástrica" },
      { codigo: "ostomia", etiqueta: "Ostomía" },
    ],
  },
];
const TODA_VALORACION = VALORACION.flatMap((g) => g.items);

// ---------------------------------------------------------------------------
// Escalas
// ---------------------------------------------------------------------------

export type OpcionEscala = { valor: number; etiqueta: string };
export type ItemEscala = { codigo: string; etiqueta: string; opciones: OpcionEscala[] };

/** Braden: riesgo de lesión por presión (6–23; menor puntaje = más riesgo). */
export const BRADEN: ItemEscala[] = [
  {
    codigo: "percepcion",
    etiqueta: "Percepción sensorial",
    opciones: [
      { valor: 1, etiqueta: "Completamente limitada" },
      { valor: 2, etiqueta: "Muy limitada" },
      { valor: 3, etiqueta: "Levemente limitada" },
      { valor: 4, etiqueta: "Sin limitación" },
    ],
  },
  {
    codigo: "humedad",
    etiqueta: "Exposición a la humedad",
    opciones: [
      { valor: 1, etiqueta: "Constantemente húmeda" },
      { valor: 2, etiqueta: "A menudo húmeda" },
      { valor: 3, etiqueta: "Ocasionalmente húmeda" },
      { valor: 4, etiqueta: "Raramente húmeda" },
    ],
  },
  {
    codigo: "actividad",
    etiqueta: "Actividad",
    opciones: [
      { valor: 1, etiqueta: "Encamado" },
      { valor: 2, etiqueta: "En silla" },
      { valor: 3, etiqueta: "Deambula ocasionalmente" },
      { valor: 4, etiqueta: "Deambula frecuentemente" },
    ],
  },
  {
    codigo: "movilidad",
    etiqueta: "Movilidad",
    opciones: [
      { valor: 1, etiqueta: "Completamente inmóvil" },
      { valor: 2, etiqueta: "Muy limitada" },
      { valor: 3, etiqueta: "Ligeramente limitada" },
      { valor: 4, etiqueta: "Sin limitaciones" },
    ],
  },
  {
    codigo: "nutricion",
    etiqueta: "Nutrición",
    opciones: [
      { valor: 1, etiqueta: "Muy pobre" },
      { valor: 2, etiqueta: "Probablemente inadecuada" },
      { valor: 3, etiqueta: "Adecuada" },
      { valor: 4, etiqueta: "Excelente" },
    ],
  },
  {
    codigo: "friccion",
    etiqueta: "Fricción y cizallamiento",
    opciones: [
      { valor: 1, etiqueta: "Es un problema" },
      { valor: 2, etiqueta: "Problema potencial" },
      { valor: 3, etiqueta: "Sin problema aparente" },
    ],
  },
];

/** Glasgow: nivel de conciencia (3–15). */
export const GLASGOW: ItemEscala[] = [
  {
    codigo: "ocular",
    etiqueta: "Apertura ocular",
    opciones: [
      { valor: 4, etiqueta: "Espontánea" },
      { valor: 3, etiqueta: "A la voz" },
      { valor: 2, etiqueta: "Al dolor" },
      { valor: 1, etiqueta: "Ninguna" },
    ],
  },
  {
    codigo: "verbal",
    etiqueta: "Respuesta verbal",
    opciones: [
      { valor: 5, etiqueta: "Orientada" },
      { valor: 4, etiqueta: "Confusa" },
      { valor: 3, etiqueta: "Palabras inapropiadas" },
      { valor: 2, etiqueta: "Sonidos incomprensibles" },
      { valor: 1, etiqueta: "Ninguna" },
    ],
  },
  {
    codigo: "motora",
    etiqueta: "Respuesta motora",
    opciones: [
      { valor: 6, etiqueta: "Obedece órdenes" },
      { valor: 5, etiqueta: "Localiza el dolor" },
      { valor: 4, etiqueta: "Retira al dolor" },
      { valor: 3, etiqueta: "Flexión anormal" },
      { valor: 2, etiqueta: "Extensión" },
      { valor: 1, etiqueta: "Ninguna" },
    ],
  },
];

/** Downton: riesgo de caídas (cada factor presente suma 1; 3 o más = alto riesgo). */
export const DOWNTON: { grupo: string; items: ItemCatalogo[] }[] = [
  { grupo: "Caídas previas", items: [{ codigo: "caidas_previas", etiqueta: "Sí ha tenido caídas" }] },
  {
    grupo: "Medicamentos",
    items: [
      { codigo: "med_sedantes", etiqueta: "Tranquilizantes / sedantes" },
      { codigo: "med_diureticos", etiqueta: "Diuréticos" },
      { codigo: "med_hipotensores", etiqueta: "Hipotensores (no diuréticos)" },
      { codigo: "med_antiparkinsonianos", etiqueta: "Antiparkinsonianos" },
      { codigo: "med_antidepresivos", etiqueta: "Antidepresivos" },
      { codigo: "med_otros", etiqueta: "Otros medicamentos" },
    ],
  },
  {
    grupo: "Déficits sensoriales",
    items: [
      { codigo: "def_visual", etiqueta: "Alteraciones visuales" },
      { codigo: "def_auditivo", etiqueta: "Alteraciones auditivas" },
      { codigo: "def_extremidades", etiqueta: "Extremidades (ictus, etc.)" },
    ],
  },
  { grupo: "Estado mental", items: [{ codigo: "confuso", etiqueta: "Confuso" }] },
  {
    grupo: "Deambulación",
    items: [
      { codigo: "deamb_ayuda", etiqueta: "Segura con ayuda" },
      { codigo: "deamb_insegura", etiqueta: "Insegura con o sin ayuda" },
      { codigo: "deamb_imposible", etiqueta: "Imposible" },
    ],
  },
];
const TODO_DOWNTON = DOWNTON.flatMap((g) => g.items);

export type Escalas = {
  braden: Record<string, number>;
  glasgow: Record<string, number>;
  downton: string[];
};

const suma = (r: Record<string, number>, escala: ItemEscala[]) =>
  escala.every((i) => typeof r[i.codigo] === "number") ? escala.reduce((a, i) => a + r[i.codigo], 0) : null;

export function puntajeBraden(r: Record<string, number>) {
  const total = suma(r, BRADEN);
  if (total === null) return null;
  const riesgo = total <= 12 ? "Riesgo alto" : total <= 14 ? "Riesgo moderado" : total <= 18 ? "Riesgo bajo" : "Sin riesgo";
  return { total, riesgo, nivel: (total <= 12 ? "critico" : total <= 18 ? "alerta" : "normal") as Nivel };
}

export function puntajeGlasgow(r: Record<string, number>) {
  const total = suma(r, GLASGOW);
  if (total === null) return null;
  const riesgo = total <= 8 ? "Grave" : total <= 12 ? "Moderado" : total <= 14 ? "Leve" : "Normal";
  return { total, riesgo, nivel: (total <= 8 ? "critico" : total <= 14 ? "alerta" : "normal") as Nivel };
}

/** Downton: la deambulación cuenta una sola vez aunque se marque más de una opción. */
export function puntajeDownton(marcados: string[]) {
  const s = new Set(marcados);
  const deambulacion = ["deamb_ayuda", "deamb_insegura", "deamb_imposible"].some((c) => s.has(c)) ? 1 : 0;
  const total = [...s].filter((c) => !c.startsWith("deamb_")).length + deambulacion;
  return { total, riesgo: total >= 3 ? "Riesgo alto de caída" : "Riesgo bajo", nivel: (total >= 3 ? "alerta" : "normal") as Nivel };
}

// ---------------------------------------------------------------------------
// Balance de líquidos
// ---------------------------------------------------------------------------

export const INGRESOS: ItemCatalogo[] = [
  { codigo: "via_oral", etiqueta: "Vía oral" },
  { codigo: "endovenosos", etiqueta: "Líquidos endovenosos" },
  { codigo: "medicamentos", etiqueta: "Medicamentos diluidos" },
  { codigo: "sonda", etiqueta: "Sonda / nutrición enteral" },
];
export const EGRESOS: ItemCatalogo[] = [
  { codigo: "diuresis", etiqueta: "Diuresis" },
  { codigo: "deposiciones", etiqueta: "Deposiciones" },
  { codigo: "vomito", etiqueta: "Vómito" },
  { codigo: "drenajes", etiqueta: "Drenajes" },
  { codigo: "otros", etiqueta: "Otros (sangrado, succión…)" },
];

export type BalanceLiquidos = { ingresos: Record<string, number>; egresos: Record<string, number>; horas: number };

export function calcularBalance(b: BalanceLiquidos) {
  const ingresos = Object.values(b.ingresos).reduce((a, v) => a + v, 0);
  const egresos = Object.values(b.egresos).reduce((a, v) => a + v, 0);
  return { ingresos, egresos, balance: ingresos - egresos };
}

// ---------------------------------------------------------------------------
// Administración de medicamentos y nota
// ---------------------------------------------------------------------------

export const VIAS = ["Oral", "Intravenosa", "Intramuscular", "Subcutánea", "Sublingual", "Tópica", "Inhalada", "Rectal", "Oftálmica", "Ótica"] as const;

export type RegistroMedicamento = {
  medicamento: string;
  dosis: string;
  via: string;
  frecuencia: string;
  hora: string;
  administrado: SiNo;
  /** Por qué no se administró o qué se observó (reacción, rechazo…). */
  observacion: string;
};

export const medicamentoVacio = (): RegistroMedicamento => ({
  medicamento: "",
  dosis: "",
  via: "",
  frecuencia: "",
  hora: "",
  administrado: "",
  observacion: "",
});

/** Nota de enfermería en formato SOAPIE. */
export type NotaSoapie = { s: string; o: string; a: string; p: string; i: string; e: string };

export const SOAPIE: { campo: keyof NotaSoapie; titulo: string; ayuda: string }[] = [
  { campo: "s", titulo: "S — Subjetivo", ayuda: "Lo que refiere el paciente o el familiar, con sus palabras." },
  { campo: "o", titulo: "O — Objetivo", ayuda: "Lo que observas y mides: signos vitales, hallazgos de la valoración." },
  { campo: "a", titulo: "A — Análisis", ayuda: "Qué significa lo encontrado (ej. riesgo de caída, dolor no controlado)." },
  { campo: "p", titulo: "P — Plan", ayuda: "Qué se va a hacer según la orden médica y los protocolos." },
  { campo: "i", titulo: "I — Intervención", ayuda: "Lo que hiciste (con hora): medicamento aplicado, curación, aviso al médico…" },
  { campo: "e", titulo: "E — Evaluación", ayuda: "Cómo respondió el paciente a la intervención." },
];

// ---------------------------------------------------------------------------
// Hoja completa
// ---------------------------------------------------------------------------

export type HojaEnfermeria = {
  servicio: string;
  cama: string;
  turno: "MANANA" | "TARDE" | "NOCHE" | "";
  diagnosticoMedico: string;
  alergias: string;
  signos: TomaSignos[];
  conciencia: string;
  valoracion: string[];
  escalas: Escalas;
  balance: BalanceLiquidos;
  medicamentos: RegistroMedicamento[];
  nota: NotaSoapie;
  /** Respuestas a los cálculos que pide un caso (dosis en ml, gotas por minuto…), por clave. */
  calculos: Record<string, number>;
};

export function hojaVacia(): HojaEnfermeria {
  return {
    servicio: "",
    cama: "",
    turno: "",
    diagnosticoMedico: "",
    alergias: "",
    signos: [tomaVacia()],
    conciencia: "",
    valoracion: [],
    escalas: { braden: {}, glasgow: {}, downton: [] },
    balance: { ingresos: {}, egresos: {}, horas: 6 },
    medicamentos: [],
    nota: { s: "", o: "", a: "", p: "", i: "", e: "" },
    calculos: {},
  };
}

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const texto = (v: unknown, max = 4000) => (typeof v === "string" ? v.slice(0, max) : "");
const siNo = (v: unknown): SiNo => (v === "SI" || v === "NO" ? v : "");
const numeroONulo = (v: unknown, max = 1000) => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max ? v : null);
const codigos = (v: unknown, catalogo: ItemCatalogo[]) => {
  const validos = new Set(catalogo.map((c) => c.codigo));
  return Array.isArray(v) ? [...new Set(v.filter((c): c is string => typeof c === "string" && validos.has(c)))] : [];
};
const respuestas = (v: unknown, escala: ItemEscala[]) => {
  const o = obj(v);
  const salida: Record<string, number> = {};
  for (const item of escala) {
    const valor = o[item.codigo];
    if (typeof valor === "number" && item.opciones.some((op) => op.valor === valor)) salida[item.codigo] = valor;
  }
  return salida;
};
const mililitros = (v: unknown, catalogo: ItemCatalogo[]) => {
  const o = obj(v);
  const salida: Record<string, number> = {};
  for (const c of catalogo) {
    const n = numeroONulo(o[c.codigo], 20000);
    if (n !== null && n > 0) salida[c.codigo] = Math.round(n);
  }
  return salida;
};

/** Sanea una hoja que llega del cliente o de JSON guardado: nunca confía en la forma. */
export function normalizarHoja(raw: unknown): HojaEnfermeria {
  const h = obj(raw);
  const escalas = obj(h.escalas);
  const balance = obj(h.balance);
  const nota = obj(h.nota);
  const signos = Array.isArray(h.signos)
    ? h.signos.slice(0, 12).map((t) => {
        const o = obj(t);
        return {
          hora: texto(o.hora, 5),
          tas: numeroONulo(o.tas, 300),
          tad: numeroONulo(o.tad, 200),
          fc: numeroONulo(o.fc, 300),
          fr: numeroONulo(o.fr, 80),
          temperatura: numeroONulo(o.temperatura, 45),
          satO2: numeroONulo(o.satO2, 100),
          glucometria: numeroONulo(o.glucometria, 900),
          dolor: numeroONulo(o.dolor, 10),
        };
      })
    : [];
  const turno = h.turno === "MANANA" || h.turno === "TARDE" || h.turno === "NOCHE" ? h.turno : "";
  return {
    servicio: texto(h.servicio, 120),
    cama: texto(h.cama, 20),
    turno,
    diagnosticoMedico: texto(h.diagnosticoMedico, 500),
    alergias: texto(h.alergias, 300),
    signos: signos.length ? signos : [tomaVacia()],
    conciencia: CONCIENCIA.some((c) => c.codigo === h.conciencia) ? (h.conciencia as string) : "",
    valoracion: codigos(h.valoracion, TODA_VALORACION),
    escalas: {
      braden: respuestas(escalas.braden, BRADEN),
      glasgow: respuestas(escalas.glasgow, GLASGOW),
      downton: codigos(escalas.downton, TODO_DOWNTON),
    },
    balance: {
      ingresos: mililitros(balance.ingresos, INGRESOS),
      egresos: mililitros(balance.egresos, EGRESOS),
      horas: [6, 8, 12, 24].includes(balance.horas as number) ? (balance.horas as number) : 6,
    },
    medicamentos: Array.isArray(h.medicamentos)
      ? h.medicamentos.slice(0, 30).map((m) => {
          const o = obj(m);
          return {
            medicamento: texto(o.medicamento, 120),
            dosis: texto(o.dosis, 60),
            via: texto(o.via, 40),
            frecuencia: texto(o.frecuencia, 60),
            hora: texto(o.hora, 5),
            administrado: siNo(o.administrado),
            observacion: texto(o.observacion, 500),
          };
        })
      : [],
    nota: Object.fromEntries(SOAPIE.map(({ campo }) => [campo, texto(nota[campo])])) as NotaSoapie,
    calculos: Object.fromEntries(
      Object.entries(obj(h.calculos))
        .filter(([k, v]) => /^[a-z_]{1,40}$/.test(k) && typeof v === "number" && Number.isFinite(v))
        .slice(0, 10)
    ) as Record<string, number>,
  };
}

// ---------------------------------------------------------------------------
// Calificación: hoja esperada (la del caso) contra la del estudiante
// ---------------------------------------------------------------------------

/**
 * Lo que debe quedar registrado en un caso. Solo se califica lo que el caso define (un campo
 * vacío o nulo = no se evalúa). La nota SOAPIE no se califica sola: la revisa el docente.
 */
export type EsperadoEnfermeria = {
  signos: Partial<Omit<TomaSignos, "hora">> | null;
  conciencia: string | null;
  valoracion: string[] | null;
  braden: number | null;
  glasgow: number | null;
  downton: number | null;
  balance: { ingresos: number; egresos: number } | null;
  /** Por medicamento (nombre en minúsculas): si se debía administrar o no. */
  medicamentos: { medicamento: string; administrar: boolean }[] | null;
  /** Cálculos con respuesta numérica (ej. 10 ml, 42 gotas/min) y su tolerancia. */
  calculos?: { clave: string; pregunta: string; unidad: string; valor: number; tolerancia: number }[] | null;
};

export type LineaRevisionHoja = { componente: string; descripcion: string; cumplido: boolean };

const ETIQUETA_SIGNO: Record<string, string> = {
  tas: "TA sistólica",
  tad: "TA diastólica",
  fc: "Frecuencia cardiaca",
  fr: "Frecuencia respiratoria",
  temperatura: "Temperatura",
  satO2: "Saturación de oxígeno",
  glucometria: "Glucometría",
  dolor: "Dolor (EVA)",
};

const etiquetaValoracion = (c: string) => TODA_VALORACION.find((i) => i.codigo === c)?.etiqueta ?? c;
const normalizarNombre = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/**
 * Revisa la hoja contra lo esperado. Devuelve líneas (para el reporte) y un puntaje 0–100 por
 * componente; los componentes que el caso no define quedan en null y no cuentan.
 */
export function revisarHoja(esperado: EsperadoEnfermeria, hoja: HojaEnfermeria) {
  const lineas: LineaRevisionHoja[] = [];
  const puntajes: Record<"signos" | "valoracion" | "escalas" | "balance" | "medicamentos" | "calculos", number | null> = {
    calculos: null,
    signos: null,
    valoracion: null,
    escalas: null,
    balance: null,
    medicamentos: null,
  };
  const porcentaje = (bien: number, total: number) => (total === 0 ? null : Math.round((bien / total) * 100));

  // Signos: se toma la primera toma registrada. Temperatura con tolerancia de 0,1 °C.
  if (esperado.signos) {
    const toma = hoja.signos[0] ?? tomaVacia();
    let bien = 0;
    const campos = Object.entries(esperado.signos).filter(([, v]) => v !== null && v !== undefined) as [keyof TomaSignos, number][];
    for (const [campo, valor] of campos) {
      const anotado = toma[campo] as number | null;
      const ok = anotado !== null && Math.abs(anotado - valor) <= (campo === "temperatura" ? 0.1 : 0);
      if (ok) bien++;
      lineas.push({
        componente: "signos",
        descripcion: ok ? `${ETIQUETA_SIGNO[campo]}: ${valor}` : `${ETIQUETA_SIGNO[campo]}: registraste ${anotado ?? "—"}, era ${valor}`,
        cumplido: ok,
      });
    }
    puntajes.signos = porcentaje(bien, campos.length);
  }

  // Valoración: conciencia + hallazgos (marcar de más también descuenta).
  if (esperado.conciencia || esperado.valoracion) {
    let bien = 0;
    let total = 0;
    if (esperado.conciencia) {
      total++;
      const ok = hoja.conciencia === esperado.conciencia;
      if (ok) bien++;
      lineas.push({
        componente: "valoracion",
        descripcion: `Estado de conciencia: ${CONCIENCIA.find((c) => c.codigo === esperado.conciencia)?.etiqueta}`,
        cumplido: ok,
      });
    }
    if (esperado.valoracion) {
      const esp = new Set(esperado.valoracion);
      const obt = new Set(hoja.valoracion);
      for (const c of esp) {
        total++;
        if (obt.has(c)) bien++;
        lineas.push({ componente: "valoracion", descripcion: `${obt.has(c) ? "" : "Faltó: "}${etiquetaValoracion(c)}`, cumplido: obt.has(c) });
      }
      for (const c of obt) {
        if (esp.has(c)) continue;
        total++;
        lineas.push({ componente: "valoracion", descripcion: `Sobra: ${etiquetaValoracion(c)}`, cumplido: false });
      }
    }
    puntajes.valoracion = porcentaje(bien, total);
  }

  // Escalas: el puntaje total exacto.
  {
    const revisiones: [string, number | null, number | null][] = [
      ["Braden", esperado.braden, puntajeBraden(hoja.escalas.braden)?.total ?? null],
      ["Glasgow", esperado.glasgow, puntajeGlasgow(hoja.escalas.glasgow)?.total ?? null],
      ["Downton", esperado.downton, esperado.downton === null ? null : puntajeDownton(hoja.escalas.downton).total],
    ];
    let bien = 0;
    let total = 0;
    for (const [nombre, esp, obt] of revisiones) {
      if (esp === null) continue;
      total++;
      const ok = obt === esp;
      if (ok) bien++;
      lineas.push({ componente: "escalas", descripcion: ok ? `${nombre}: ${esp}` : `${nombre}: obtuviste ${obt ?? "sin calcular"}, era ${esp}`, cumplido: ok });
    }
    puntajes.escalas = porcentaje(bien, total);
  }

  // Balance de líquidos: ingresos, egresos y balance exactos.
  if (esperado.balance) {
    const c = calcularBalance(hoja.balance);
    const balanceEsperado = esperado.balance.ingresos - esperado.balance.egresos;
    const items: [string, number, number][] = [
      ["Total de ingresos", esperado.balance.ingresos, c.ingresos],
      ["Total de egresos", esperado.balance.egresos, c.egresos],
      ["Balance", balanceEsperado, c.balance],
    ];
    let bien = 0;
    for (const [nombre, esp, obt] of items) {
      const ok = esp === obt;
      if (ok) bien++;
      lineas.push({ componente: "balance", descripcion: ok ? `${nombre}: ${esp} ml` : `${nombre}: registraste ${obt} ml, era ${esp} ml`, cumplido: ok });
    }
    puntajes.balance = porcentaje(bien, items.length);
  }

  // Medicamentos: la decisión de administrar o no (y que haya motivo si no se administró).
  if (esperado.medicamentos) {
    let bien = 0;
    for (const m of esperado.medicamentos) {
      const registro = hoja.medicamentos.find((r) => normalizarNombre(r.medicamento).includes(normalizarNombre(m.medicamento)));
      const decision = registro?.administrado === "SI" ? true : registro?.administrado === "NO" ? false : null;
      const conMotivo = m.administrar || (registro?.observacion.trim().length ?? 0) > 0;
      const ok = decision === m.administrar && conMotivo;
      if (ok) bien++;
      // Con el nombre tal como quedó en la hoja (el de la orden), no el de la clave de búsqueda.
      const nombre = registro?.medicamento.trim() || m.medicamento;
      lineas.push({
        componente: "medicamentos",
        descripcion: !registro
          ? `${nombre}: no quedó registrado`
          : decision === null
            ? `${nombre}: no se marcó si se administró`
            : decision !== m.administrar
              ? `${nombre}: ${m.administrar ? "debía administrarse" : "NO debía administrarse"}`
              : !conMotivo
                ? `${nombre}: falta escribir por qué no se administró`
                : `${nombre}: ${m.administrar ? "administrado" : "no administrado, con motivo"}`,
        cumplido: ok,
      });
    }
    puntajes.medicamentos = porcentaje(bien, esperado.medicamentos.length);
  }

  if (esperado.calculos?.length) {
    let bien = 0;
    for (const c of esperado.calculos) {
      const r = hoja.calculos[c.clave];
      const ok = typeof r === "number" && Math.abs(r - c.valor) <= c.tolerancia;
      if (ok) bien++;
      lineas.push({
        componente: "calculos",
        descripcion: ok ? `${c.pregunta} ${c.valor} ${c.unidad}` : `${c.pregunta} respondiste ${r ?? "—"}, era ${c.valor} ${c.unidad}`,
        cumplido: ok,
      });
    }
    puntajes.calculos = porcentaje(bien, esperado.calculos.length);
  }

  return { lineas, puntajes };
}

/** Pesos de cada componente en la nota (se reparten entre los que el caso evalúa). */
export const PESOS_HOJA = { signos: 20, valoracion: 15, escalas: 20, balance: 15, medicamentos: 30, calculos: 20 } as const;

export function notaHoja(puntajes: ReturnType<typeof revisarHoja>["puntajes"]): number | null {
  let peso = 0;
  let total = 0;
  for (const [k, v] of Object.entries(puntajes)) {
    if (v === null) continue;
    const p = PESOS_HOJA[k as keyof typeof PESOS_HOJA];
    peso += p;
    total += v * p;
  }
  return peso ? Math.round(total / peso) : null;
}
