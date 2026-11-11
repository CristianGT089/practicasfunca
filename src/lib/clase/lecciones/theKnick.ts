import type { Diapositiva } from "../tipos";

/**
 * The Knick, capítulo 1, y su actividad reflexiva. Salió de la clase 1 porque no alcanzó el
 * tiempo: va en la clase 2 (agregar estas diapositivas a esa lección).
 */
export const DIAPOSITIVAS_THE_KNICK: Diapositiva[] = [
    { tipo: "seccion", seccion: "The Knick", numero: 8, titulo: "The Knick · Capítulo 1", subtitulo: "La medicina de hace 125 años", icono: "🎬" },
    {
      tipo: "video",
      seccion: "The Knick",
      eyebrow: "Lo que vamos a ver",
      titulo: "The Knick — «Method and Madness»",
      ficha: [
        { etiqueta: "Año", valor: "2014" },
        { etiqueta: "Dirección", valor: "Steven Soderbergh" },
        { etiqueta: "Época", valor: "Nueva York, 1900" },
        { etiqueta: "Duración", valor: "≈ 50 minutos" },
      ],
      sinopsis:
        "En el hospital Knickerbocker, el cirujano John Thackery intenta abrirse camino en una medicina que apenas empieza a usar electricidad, anestesia y asepsia, mientras enfrenta sus propios límites.",
      observar: [
        { icono: "💡", titulo: "La tecnología", texto: "¿Qué aparatos, inventos o registros usan? ¿Qué les falta que hoy damos por hecho?" },
        { icono: "🧼", titulo: "La higiene", texto: "Fíjense en las manos, los instrumentos y las salas. ¿Qué harían distinto hoy?" },
        { icono: "⚖️", titulo: "La ética", texto: "El trato a los pacientes, al personal y entre colegas. ¿Qué les incomoda?" },
        { icono: "📋", titulo: "La información", texto: "¿Cómo guardan y comparten los datos del paciente? Compárenlo con una historia clínica electrónica." },
      ],
      aviso: "Tiene escenas quirúrgicas explícitas, consumo de drogas y el racismo de la época. Si alguna escena les afecta, pueden mirar a otro lado o salir un momento.",
    },
    {
      tipo: "tarea",
      seccion: "The Knick",
      eyebrow: "Actividad reflexiva · Hacer",
      titulo: "Reflexión sobre The Knick",
      entrega: "Próximo domingo, antes de las 7:00 a. m.",
      intro: "En el documento que creaste hoy en Drive, responde con tus palabras (media página a una página):",
      preguntas: [
        "¿Qué tecnologías (o la falta de ellas) viste en el hospital de 1900 y cómo afectaban la atención de los pacientes?",
        "Escoge una escena y cuenta cómo se haría hoy con las TICs: historia clínica electrónica, imágenes diagnósticas, comunicación entre el equipo.",
        "¿Qué situación ética te impactó más y por qué?",
        "¿Qué te llevas para tu futuro trabajo en el área de la salud?",
      ],
      formato: [
        "Documento de Google Docs: TICs_Salud › Fundamentos",
        "Nombre: Apellido_Nombre_Reflexion_TheKnick",
        "Con título, tu nombre, programa y fecha",
        "Compartido con el profe (ya lo está si compartiste la carpeta)",
      ],
    },
];
