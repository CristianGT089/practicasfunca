/**
 * Rúbrica del docente para la jornada de Odontología con pacientes reales (compañeros
 * examinados de verdad): no hay respuesta previa contra la cual comparar, así que califica
 * el docente. Puro: se usa en el cliente y en el servidor.
 */

export type NivelRubrica = 0 | 1 | 2;

export const CRITERIOS_RUBRICA = [
  {
    codigo: "historia",
    etiqueta: "Historia completa y bien diligenciada",
    ayuda: "Anamnesis, antecedentes, exámenes, diagnóstico y plan; sin siglas ni espacios en blanco.",
  },
  {
    codigo: "odontograma",
    etiqueta: "Odontograma coherente con lo que se ve en boca",
    ayuda: "Revisa tú la boca del compañero: hallazgos, caras y convenciones correctas.",
  },
  {
    codigo: "alerta",
    etiqueta: "Alerta médica y antecedentes bien indagados",
    ayuda: "Preguntó lo necesario y dejó registrado lo que cambia la atención.",
  },
  {
    codigo: "bioseguridad",
    etiqueta: "Bioseguridad y trato al paciente",
    ayuda: "Guantes, tapabocas, campo; presentación, explicación y respeto.",
  },
] as const;

export type CodigoCriterioRubrica = (typeof CRITERIOS_RUBRICA)[number]["codigo"];
export type Rubrica = Partial<Record<CodigoCriterioRubrica, NivelRubrica>>;

export const NIVELES: { valor: NivelRubrica; etiqueta: string }[] = [
  { valor: 2, etiqueta: "Cumple" },
  { valor: 1, etiqueta: "Parcial" },
  { valor: 0, etiqueta: "No cumple" },
];

export function normalizarRubrica(raw: unknown): Rubrica {
  const r: Rubrica = {};
  if (!raw || typeof raw !== "object") return r;
  for (const c of CRITERIOS_RUBRICA) {
    const v = (raw as Record<string, unknown>)[c.codigo];
    if (v === 0 || v === 1 || v === 2) r[c.codigo] = v;
  }
  return r;
}

/** 0-100 si todos los criterios están calificados; null si falta alguno. */
export function puntajeRubrica(r: Rubrica): number | null {
  const valores = CRITERIOS_RUBRICA.map((c) => r[c.codigo]);
  if (valores.some((v) => v === undefined)) return null;
  const suma = valores.reduce<number>((a, v) => a + (v ?? 0), 0);
  return Math.round((suma / (CRITERIOS_RUBRICA.length * 2)) * 100);
}
