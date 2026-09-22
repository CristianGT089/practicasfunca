/**
 * Bancos de datos para generar historias clínicas de práctica. Nada de esto sale de
 * información real de personas — son nombres/diagnósticos comunes para armar casos
 * variados sin tener que escribirlos a mano cada vez. Ver docs/simulacion.md.
 */

// Separados por género para poder sortear primero el género del paciente y luego un nombre
// que le corresponda (o, si el admin da un nombre puntual sin género, se usa tal cual sin
// tocar estos bancos). Ver `generarPacientes` en generador.ts.
export const NOMBRES_FEMENINOS = [
  "María", "Luisa", "Camila", "Valentina", "Daniela", "Mariana", "Laura", "Paula",
  "Natalia", "Carolina", "Isabella", "Sofía", "Gabriela", "Ana", "Catalina",
];

export const NOMBRES_MASCULINOS = [
  "Carlos", "Andrés", "Jorge", "Santiago", "Felipe", "Juan", "Diego", "Alejandro",
  "Sebastián", "Julián", "Nicolás", "David", "Ricardo", "Miguel", "Óscar",
];

/** Todos los nombres juntos — se usa cuando el género del paciente es OTRO o no se sabe. */
export const NOMBRES = [...NOMBRES_FEMENINOS, ...NOMBRES_MASCULINOS];

export const APELLIDOS = [
  "Gómez", "Rodríguez", "Martínez", "López", "García", "Pérez", "Sánchez", "Ramírez",
  "Torres", "Flórez", "Rojas", "Vargas", "Castro", "Ortiz", "Moreno", "Suárez",
  "Jiménez", "Muñoz", "Herrera", "Mendoza", "Restrepo", "Cárdenas", "Salazar", "Ospina",
];

/**
 * Un diagnóstico solo tiene sentido en cierto rango de edad (nadie de 7 años con "control
 * prenatal", nadie de 79 con "control de crecimiento") o para cierto género ("control
 * prenatal" solo si el paciente es FEMENINO) — `minEdad`/`maxEdad`/`genero` filtran el
 * banco antes de elegir uno, ver `elegirPorEdad` en generador.ts. Si el paciente no tiene
 * género fijado (null/no se sabe), `genero` no se aplica — no se restringe por algo que no
 * se sabe. Sin `minEdad`/`maxEdad` aplica a cualquier edad.
 */
export type DiagnosticoConEdad = { texto: string; minEdad?: number; maxEdad?: number; genero?: "FEMENINO" | "MASCULINO" };

/** Motivos comunes, sin ningún peso especial en la simulación (informativos). */
export const DIAGNOSTICOS_COMUNES: DiagnosticoConEdad[] = [
  { texto: "Gripa común" },
  { texto: "Hipertensión arterial controlada", minEdad: 25 },
  { texto: "Diabetes tipo 2 controlada", minEdad: 25 },
  { texto: "Control prenatal de rutina", minEdad: 14, maxEdad: 45, genero: "FEMENINO" },
  { texto: "Dolor lumbar", minEdad: 12 },
  { texto: "Infección urinaria", minEdad: 5 },
  { texto: "Gastritis", minEdad: 10 },
  { texto: "Rinitis alérgica" },
  { texto: "Migraña", minEdad: 8 },
  { texto: "Control de crecimiento y desarrollo", maxEdad: 5 },
];

/**
 * Lista simplificada de "enfermedades de alto costo" (Cuenta de Alto Costo) — exentas de
 * cuota moderadora por ley, sin importar la categoría del afiliado. No es la lista legal
 * completa, es una muestra representativa para la práctica.
 */
export const DIAGNOSTICOS_ALTO_COSTO: DiagnosticoConEdad[] = [
  { texto: "Cáncer de mama", minEdad: 18, genero: "FEMENINO" },
  { texto: "VIH/SIDA" },
  { texto: "Insuficiencia renal crónica", minEdad: 5 },
  { texto: "Artritis reumatoide", minEdad: 8 },
  { texto: "Epilepsia" },
  { texto: "Enfermedad de Parkinson", minEdad: 40 },
];

/**
 * Familias de alergia que sí se pueden verificar contra el catálogo real: se detectan por
 * palabras clave en `Medicamento.principioActivo` (el catálogo real no trae `tags`, a
 * diferencia de los medicamentos de práctica).
 */
export const FAMILIAS_ALERGENICAS: { tag: string; palabrasClave: string[] }[] = [
  { tag: "penicilina", palabrasClave: ["penicilina", "amoxicilina", "ampicilina"] },
  { tag: "aine", palabrasClave: ["ibuprofeno", "naproxeno", "diclofenaco", "aspirina", "acido acetilsalicilico"] },
  { tag: "sulfa", palabrasClave: ["sulfa", "trimetoprim"] },
];

export function familiaAlergenica(principioActivo: string): string | null {
  const normalizado = principioActivo.toLowerCase();
  const familia = FAMILIAS_ALERGENICAS.find((f) => f.palabrasClave.some((p) => normalizado.includes(p)));
  return familia?.tag ?? null;
}

export const ANTECEDENTES: DiagnosticoConEdad[] = [
  { texto: "Ninguno relevante" },
  { texto: "Ninguno relevante" },
  { texto: "Ninguno relevante" },
  { texto: "Hipertensión arterial", minEdad: 20 },
  { texto: "Diabetes tipo 2", minEdad: 20 },
  { texto: "Asma bronquial" },
  { texto: "Cirugía previa sin complicaciones" },
  { texto: "Tabaquismo", minEdad: 15 },
];

/** Cuando no se pide un género puntual, se sortea con esta distribución. */
export const PESOS_GENERO: { categoria: "FEMENINO" | "MASCULINO" | "OTRO"; peso: number }[] = [
  { categoria: "FEMENINO", peso: 49 },
  { categoria: "MASCULINO", peso: 49 },
  { categoria: "OTRO", peso: 2 },
];

/** Distribución aproximada de la afiliación en Colombia (subsidiado es el grupo más grande). */
export const PESOS_CATEGORIA_AFILIADO: { categoria: "SUBSIDIADO" | "CONTRIBUTIVO_A" | "CONTRIBUTIVO_B" | "CONTRIBUTIVO_C"; peso: number }[] = [
  { categoria: "SUBSIDIADO", peso: 55 },
  { categoria: "CONTRIBUTIVO_A", peso: 30 },
  { categoria: "CONTRIBUTIVO_B", peso: 10 },
  { categoria: "CONTRIBUTIVO_C", peso: 5 },
];

export const MEDICOS = [
  "Dr. Óscar Rivera", "Dra. Claudia Ariza", "Dra. Marcela Ospina", "Dr. Julián González",
  "Dr. Fabián Nieto", "Dra. Liliana Parra", "Dra. Patricia León", "Dr. Andrés Cortés",
];

/** Relaciones típicas de quien recoge por otra persona — solo para el caso TERCERO_AUTORIZADO. */
export const RELACIONES_TERCERO = [
  "esposo(a)", "hijo(a)", "madre", "padre", "cuidador(a) a cargo", "hermano(a)", "nieto(a)",
];
