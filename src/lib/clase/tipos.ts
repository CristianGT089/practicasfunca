/**
 * Lecciones de la "Clase en vivo": el docente las proyecta y cada estudiante las ve en su
 * computador. El contenido es dato (src/lib/clase/lecciones/*), los componentes lo pintan
 * (src/components/clase/*). Ver docs/clase.md.
 */

export type Tarjeta = {
  icono?: string;
  titulo: string;
  texto?: string;
  items?: string[];
  /** "amarilla" = consejo / dato a resaltar. */
  color?: "azul" | "amarilla" | "navy";
};

export type ItemClasificar = { id: string; texto: string; correcta: string };

export type PasoChecklist = { id: string; texto: string; ayuda?: string };

/** Reto de la interfaz simulada: tocar la parte de la ventana que se pide. */
export type RetoInterfaz = { zona: string; pista: string; explicacion?: string };

/** Retos de la cuadrícula: tocar una celda, escribir dónde está algo o seleccionar un rango. */
export type RetoCeldas =
  | { tipo: "tocar"; celda: string; texto: string }
  | { tipo: "escribir"; celda: string; texto: string; marcar?: boolean }
  | { tipo: "rango"; rango: string; texto: string };

/**
 * Reto de ordenar y filtrar: se cumple cuando la tabla queda así. `filtro: null` = sin filtros;
 * `filtroActivo` = solo pide crear el filtro.
 */
export type RetoOrdenar = {
  texto: string;
  filtroActivo?: boolean;
  orden?: { columna: number; direccion: "asc" | "desc" };
  filtro?: { columna: number; valores: string[] } | null;
};

/** Reto de formato condicional: crear una regla así (o una escala de colores) sobre una columna. */
export type RetoCondicional = {
  texto: string;
  columna: number;
  condicion: "menor" | "mayor" | "igual" | "contiene" | "escala";
  valor?: string | number;
  color?: "rojo" | "amarillo" | "verde";
};

/** Reto de fórmulas: escribir en `celda` una fórmula que dé lo mismo que `solucion`. */
export type RetoFormula = {
  celda: string;
  texto: string;
  solucion: string;
  funcion?: string;
  pista?: string;
  /**
   * Rango hasta donde se copia la fórmula al acertar (como arrastrar el cuadrito azul), p. ej.
   * "E2:E6". Se revisa cada copia: sirve para enseñar las referencias fijas con $.
   */
  copiar?: string;
};

export type TipoGrafico = "columnas" | "barras" | "lineas" | "circular";

/**
 * Reto de gráficos: armar el gráfico pedido escogiendo el tipo, la columna de las etiquetas
 * (eje X / categorías) y la de los valores. `datos` cambia la tabla solo para este reto.
 */
export type RetoGrafico = {
  texto: string;
  tipo: TipoGrafico;
  etiquetas: number;
  serie: number;
  /** Exige escribir un título. */
  titulo?: boolean;
  datos?: (string | number)[][];
  /** Por qué ese tipo es el indicado (se muestra al acertar). */
  porque?: string;
};

export type ResumenDinamica = "SUMA" | "CONTARA" | "PROMEDIO" | "MAX" | "MIN";

/**
 * Reto de tabla dinámica: se cumple cuando el editor queda así. Si trae `respuesta`, además hay
 * que leer el número en la tabla y escribirlo.
 */
export type RetoDinamica = {
  texto: string;
  filas?: number;
  columnas?: number;
  valores?: { columna: number; resumen: ResumenDinamica };
  filtro?: { columna: number; valores: string[] };
  pregunta?: string;
  respuesta?: number;
};

/** Ilustraciones de las diapositivas `visual` (se dibujan en components/clase/Visuales.tsx). */
export type Visual =
  | "caja-negra"
  | "copiar"
  | "decision"
  | "buscar"
  | "tipos-grafico"
  | "partes-grafico"
  | "zonas-dinamica"
  | "cuadricula"
  | "ordenar-filtrar";

export type DiapositivaBase = {
  /** Para la barra de progreso y el índice ("TICs", "El computador"...). */
  seccion?: string;
  /** Notas para el docente: solo se ven en el modo presentador. */
  notas?: string;
  /**
   * Explicación para la clase a tu ritmo: lo que diría el profe en clase. Aparece en un recuadro
   * sobre la diapositiva cuando el estudiante la hace solo.
   */
  guia?: string;
  /** Solo en la clase en vivo, o solo en la clase a tu ritmo. Sin esto, va en las dos. */
  modo?: "vivo" | "ritmo";
};

export type Diapositiva = DiapositivaBase &
  (
    | { tipo: "portada"; titulo: string; subtitulo?: string; pie?: string; mostrarAcceso?: boolean }
    | { tipo: "seccion"; numero: number; titulo: string; subtitulo?: string; icono?: string }
    | {
        tipo: "agenda";
        titulo: string;
        bloques: { hora: string; tema: string; icono?: string; pausa?: boolean; externo?: boolean }[];
      }
    | {
        tipo: "contenido";
        eyebrow?: string;
        titulo: string;
        intro?: string;
        tarjetas?: Tarjeta[];
        columnas?: 1 | 2 | 3 | 4;
        /** Frase destacada al final. */
        cierre?: string;
      }
    | {
        tipo: "perfil";
        eyebrow?: string;
        nombre: string;
        cargo: string;
        resumen: string;
        datos: { icono: string; titulo: string; texto: string }[];
        frase?: string;
      }
    | {
        tipo: "porcentajes";
        eyebrow?: string;
        titulo: string;
        partes: { valor: number; nombre: string; texto: string; desglose?: { valor: number; nombre: string }[] }[];
        notas_pie?: string[];
      }
    | { tipo: "visual"; eyebrow?: string; titulo: string; intro?: string; visual: Visual; cierre?: string }
    | { tipo: "flujo"; eyebrow?: string; titulo: string; intro?: string; pasos: Tarjeta[]; extra?: Tarjeta }
    | {
        tipo: "tabla";
        eyebrow?: string;
        titulo: string;
        intro?: string;
        columnas: string[];
        filas: string[][];
        cierre?: string;
      }
    | {
        tipo: "arbol";
        eyebrow?: string;
        titulo: string;
        intro?: string;
        raiz: NodoArbol;
        lado?: Tarjeta[];
      }
    | {
        tipo: "externo";
        eyebrow?: string;
        titulo: string;
        plataforma: string;
        duracion: string;
        pasos: string[];
        enlace?: { href: string; texto: string };
        aviso?: string;
      }
    | {
        tipo: "actividad";
        actividad: "atajos" | "mecanografia";
        id: string;
        titulo: string;
        intro?: string;
      }
    | {
        tipo: "actividad";
        actividad: "clasificar";
        id: string;
        titulo: string;
        intro?: string;
        categorias: { id: string; nombre: string; icono?: string }[];
        items: ItemClasificar[];
      }
    | {
        tipo: "actividad";
        actividad: "checklist";
        id: string;
        titulo: string;
        intro?: string;
        pasos: PasoChecklist[];
        enlace?: { href: string; texto: string };
        /** Archivos para descargar (en public/), p. ej. las hojas de práctica. */
        archivos?: { href: string; texto: string }[];
        arbol?: NodoArbol;
      }
    | {
        tipo: "actividad";
        actividad: "interfaz";
        id: string;
        titulo: string;
        intro?: string;
        /** Qué ventana se simula. */
        app: "docs" | "sheets";
        retos: RetoInterfaz[];
      }
    | {
        tipo: "actividad";
        actividad: "celdas";
        id: string;
        titulo: string;
        intro?: string;
        /** Contenido opcional de la cuadrícula, desde A1. */
        datos?: (string | number)[][];
        columnas?: number;
        filas?: number;
        retos: RetoCeldas[];
      }
    | {
        tipo: "actividad";
        actividad: "ordenar";
        id: string;
        titulo: string;
        intro?: string;
        /** La tabla: la primera fila son los encabezados. Fechas como dd/mm/aaaa. */
        datos: (string | number)[][];
        retos: RetoOrdenar[];
      }
    | {
        tipo: "actividad";
        actividad: "condicional";
        id: string;
        titulo: string;
        intro?: string;
        /** La tabla: la primera fila son los encabezados. */
        datos: (string | number)[][];
        retos: RetoCondicional[];
      }
    | {
        tipo: "actividad";
        actividad: "formulas";
        id: string;
        titulo: string;
        intro?: string;
        /** La hoja desde A1 (la fila 1 son los encabezados). */
        datos: (string | number)[][];
        retos: RetoFormula[];
      }
    | {
        tipo: "actividad";
        actividad: "grafico";
        id: string;
        titulo: string;
        intro?: string;
        /** La tabla: la primera fila son los encabezados. */
        datos: (string | number)[][];
        retos: RetoGrafico[];
      }
    | {
        tipo: "actividad";
        actividad: "dinamica";
        id: string;
        titulo: string;
        intro?: string;
        /** Los datos de origen: la primera fila son los encabezados. */
        datos: (string | number)[][];
        retos: RetoDinamica[];
      }
    | {
        tipo: "video";
        eyebrow?: string;
        titulo: string;
        ficha: { etiqueta: string; valor: string }[];
        sinopsis: string;
        observar: Tarjeta[];
        aviso?: string;
      }
    | {
        tipo: "tarea";
        eyebrow?: string;
        titulo: string;
        entrega: string;
        intro: string;
        preguntas: string[];
        formato: string[];
      }
    | {
        tipo: "pregunta";
        /** Id único en la lección: con él se guardan y cuentan las respuestas. */
        id: string;
        pregunta: string;
        opciones: string[];
        /** Índice de la opción correcta (si la hay); el docente la revela cuando quiera. */
        correcta?: number;
        /** Explicación que aparece al revelar la respuesta. */
        explicacion?: string;
      }
    | { tipo: "repaso"; titulo: string; preguntas: { icono: string; tema: string; pregunta: string }[] }
    | { tipo: "gracias"; titulo: string; proxima?: string }
    /** Cierre de la clase a tu ritmo: resumen de lo hecho y botón para enviar el reporte. */
    | { tipo: "terminar"; titulo: string; proxima?: string }
  );

export type NodoArbol = { nombre: string; tipo?: "carpeta" | "archivo"; hijos?: NodoArbol[] };

export type Leccion = {
  slug: string;
  titulo: string;
  descripcion: string;
  diapositivas: Diapositiva[];
};

export type ModoLeccion = "vivo" | "ritmo";

/** La lección con solo las diapositivas de ese modo (los índices cambian entre modos). */
export function vistaDe(leccion: Leccion, modo: ModoLeccion): Leccion {
  return { ...leccion, diapositivas: leccion.diapositivas.filter((d) => !d.modo || d.modo === modo) };
}

/** Ids de las preguntas rápidas (no calificables) de una lección. */
export function preguntasDe(leccion: Leccion) {
  return leccion.diapositivas.flatMap((d) => (d.tipo === "pregunta" ? [d] : []));
}

/** Ids de las actividades de una lección (para el progreso del docente). */
export function actividadesDe(leccion: Leccion) {
  return leccion.diapositivas.flatMap((d, indice) =>
    d.tipo === "actividad" ? [{ id: d.id, titulo: d.titulo, tipo: d.actividad, indice }] : []
  );
}
