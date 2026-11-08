/**
 * Textos de la práctica de mecanografía, de menos a más difícil. El nivel 1 no tiene tildes ni
 * mayúsculas (solo la fila guía y palabras cortas) para que se concentren en la posición.
 */
export type NivelMecanografia = { id: string; nombre: string; descripcion: string; textos: string[] };

export const NIVELES_MECANOGRAFIA: NivelMecanografia[] = [
  {
    id: "fila-guia",
    nombre: "Nivel 1 · Fila guía",
    descripcion: "Solo minúsculas, sin tildes. Dedos en A S D F y J K L.",
    textos: [
      "asdf jkl asdf jkl fdsa lkj asdf jkl",
      "la sala las alas da la sal ja ja ja",
      "una sala alta da a la fila de la salud",
      "falla la alarma da dos alas a la sala",
      "jala la falda da la lana a la dama",
    ],
  },
  {
    id: "palabras",
    nombre: "Nivel 2 · Palabras de salud",
    descripcion: "Palabras sueltas del área de la salud, con algunas tildes.",
    textos: [
      "paciente dosis jeringa vacuna turno receta",
      "pulso fiebre glucosa presión oxígeno peso",
      "farmacia enfermera bata guantes tapabocas",
      "inventario lote vencimiento factura cita",
      "computador teclado carpeta archivo nube",
    ],
  },
  {
    id: "frases",
    nombre: "Nivel 3 · Frases",
    descripcion: "Mayúsculas, tildes y punto final.",
    textos: [
      "El paciente llegó a las siete de la mañana.",
      "Lávate las manos antes y después de atender.",
      "La fórmula médica tiene fecha, firma y sello.",
      "Guarda el archivo en tu carpeta de Drive.",
      "Revisa la fecha de vencimiento de cada lote.",
      "Ctrl más C copia y Ctrl más V pega el texto.",
    ],
  },
  {
    id: "parrafos",
    nombre: "Nivel 4 · Párrafos",
    descripcion: "Textos más largos con comas, tildes y números.",
    textos: [
      "La historia clínica es un documento privado y obligatorio. En ella se registran los datos del paciente, su estado de salud y los procedimientos realizados por el equipo.",
      "Para tomar la presión arterial, el paciente debe estar sentado y en reposo durante cinco minutos. El valor normal en un adulto es cercano a 120 sobre 80.",
      "Las TICs nos ayudan a crear, guardar y compartir información. En el área de la salud permiten agendar citas, controlar inventarios y consultar resultados en segundos.",
      "Un buen nombre de archivo es claro y corto. Por ejemplo, Guzman_Inventario_Noviembre se encuentra rápido; documento final final2 no lo encuentra nadie.",
    ],
  },
];

export type IntentoMecanografia = {
  nivel: string;
  texto: number;
  ppm: number;
  precision: number;
  segundos: number;
  fecha: string;
};

/** Palabras por minuto con la convención estándar: 5 caracteres = 1 palabra. */
export function calcularPpm(caracteres: number, milisegundos: number) {
  if (milisegundos <= 0) return 0;
  return Math.round((caracteres / 5) / (milisegundos / 60000));
}
