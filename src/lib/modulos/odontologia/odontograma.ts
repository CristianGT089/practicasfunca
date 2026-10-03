/**
 * Modelo del odontograma de la historia clínica odontológica FUNCA (sección X).
 *
 * Puro (sin Prisma ni React): lo usan el componente que lo dibuja, la calificación en el
 * servidor y el generador del relato clínico de cada caso.
 *
 * - Numeración FDI: permanentes 11-48, temporales 51-85 (cuadrante + posición).
 * - Cada diente tiene 5 superficies: V (vestibular), L (lingual/palatina), M (mesial),
 *   D (distal) y O (oclusal, o incisal en anteriores).
 * - El odontograma se guarda como una lista plana de `Marca`: un hallazgo en una superficie
 *   (caries, obturaciones) o en el diente completo (ausente, corona, endodoncia...).
 */

export type Superficie = "V" | "L" | "M" | "D" | "O";
export const SUPERFICIES: Superficie[] = ["V", "L", "M", "D", "O"];

export type Denticion = "PERMANENTE" | "TEMPORAL" | "MIXTA";
export const DENTICIONES: { valor: Denticion; etiqueta: string }[] = [
  { valor: "PERMANENTE", etiqueta: "Permanente (adulto)" },
  { valor: "TEMPORAL", etiqueta: "Temporal (niño)" },
  { valor: "MIXTA", etiqueta: "Mixta" },
];

// ---------------------------------------------------------------------------
// Dientes
// ---------------------------------------------------------------------------

/** Filas del odontograma tal como aparecen en el formato en papel, de izquierda a derecha. */
export const FILAS = {
  permanenteSuperior: [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28],
  temporalSuperior: [55, 54, 53, 52, 51, 61, 62, 63, 64, 65],
  temporalInferior: [85, 84, 83, 82, 81, 71, 72, 73, 74, 75],
  permanenteInferior: [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38],
} as const;

export const DIENTES_PERMANENTES: number[] = [...FILAS.permanenteSuperior, ...FILAS.permanenteInferior];
export const DIENTES_TEMPORALES: number[] = [...FILAS.temporalSuperior, ...FILAS.temporalInferior];

export function dientesDeDenticion(denticion: Denticion): number[] {
  if (denticion === "PERMANENTE") return DIENTES_PERMANENTES;
  if (denticion === "TEMPORAL") return DIENTES_TEMPORALES;
  return [...DIENTES_PERMANENTES, ...DIENTES_TEMPORALES];
}

export function esDienteValido(diente: number): boolean {
  return DIENTES_PERMANENTES.includes(diente) || DIENTES_TEMPORALES.includes(diente);
}

export const cuadrante = (diente: number) => Math.floor(diente / 10);
export const posicion = (diente: number) => diente % 10;
export const esTemporal = (diente: number) => cuadrante(diente) >= 5;
/** Superiores: cuadrantes 1, 2, 5, 6. */
export const esSuperior = (diente: number) => [1, 2, 5, 6].includes(cuadrante(diente));
/** Lado derecho del paciente (izquierda de quien mira el odontograma): cuadrantes 1, 4, 5, 8. */
export const esLadoDerecho = (diente: number) => [1, 4, 5, 8].includes(cuadrante(diente));
/** Incisivos y caninos: su cara "oclusal" es el borde incisal. */
export const esAnterior = (diente: number) => posicion(diente) <= 3;

const NOMBRE_PERMANENTE: Record<number, string> = {
  1: "incisivo central",
  2: "incisivo lateral",
  3: "canino",
  4: "primer premolar",
  5: "segundo premolar",
  6: "primer molar",
  7: "segundo molar",
  8: "tercer molar",
};
const NOMBRE_TEMPORAL: Record<number, string> = {
  1: "incisivo central temporal",
  2: "incisivo lateral temporal",
  3: "canino temporal",
  4: "primer molar temporal",
  5: "segundo molar temporal",
};

/** "primer molar superior derecho", "canino temporal inferior izquierdo"... */
export function nombreDiente(diente: number): string {
  const base = (esTemporal(diente) ? NOMBRE_TEMPORAL : NOMBRE_PERMANENTE)[posicion(diente)] ?? "diente";
  return `${base} ${esSuperior(diente) ? "superior" : "inferior"} ${esLadoDerecho(diente) ? "derecho" : "izquierdo"}`;
}

/** Nombre clínico de una superficie para un diente concreto (palatina vs lingual, incisal vs oclusal). */
export function nombreSuperficie(diente: number, superficie: Superficie): string {
  switch (superficie) {
    case "V":
      return "vestibular";
    case "L":
      return esSuperior(diente) ? "palatina" : "lingual";
    case "M":
      return "mesial";
    case "D":
      return "distal";
    case "O":
      return esAnterior(diente) ? "incisal" : "oclusal";
  }
}

/** Letra corta de la superficie para ese diente (P en superiores, I en anteriores). */
export function letraSuperficie(diente: number, superficie: Superficie): string {
  if (superficie === "L") return esSuperior(diente) ? "P" : "L";
  if (superficie === "O") return esAnterior(diente) ? "I" : "O";
  return superficie;
}

// ---------------------------------------------------------------------------
// Hallazgos (convenciones del formato FUNCA)
// ---------------------------------------------------------------------------

export type CodigoHallazgo =
  | "SANO"
  | "CARIES"
  | "RESINA"
  | "AMALGAMA"
  | "AUSENTE"
  | "EXODONCIA_SIMPLE_INDICADA"
  | "EXODONCIA_QUIRURGICA_INDICADA"
  | "SIN_ERUPCIONAR"
  | "ENDODONCIA_REALIZADA"
  | "ENDODONCIA_INDICADA"
  | "SELLANTE_POR_HACER"
  | "SELLANTE_REALIZADO"
  | "ROTACION"
  | "CORONA_BUEN_ESTADO"
  | "CORONA_MAL_ESTADO"
  | "PROVISIONAL_MAL_ESTADO"
  | "PROVISIONAL_BUEN_ESTADO"
  | "NUCLEO_MAL_ESTADO"
  | "NUCLEO_BUEN_ESTADO"
  | "RESTO_RADICULAR"
  | "PROTESIS_REMOVIBLE"
  | "IMPLANTE";

export type Color = "ROJO" | "AZUL" | "NEGRO";

/** Cómo se dibuja: relleno de superficie, trazo sobre el diente o letra/símbolo en la franja de marcas. */
export type Simbolo =
  | { tipo: "RELLENO"; halo?: Color }
  | { tipo: "LETRA"; texto: string }
  | { tipo: "LINEA_VERTICAL" }
  | { tipo: "LINEA_HORIZONTAL" }
  | { tipo: "X"; quirurgica?: boolean }
  | { tipo: "TRIANGULO" }
  | { tipo: "CIRCULO" }
  | { tipo: "ROTACION" }
  /** Guion horizontal dentro de la cara (amalgama). */
  | { tipo: "GUION_CARA" }
  /** Guion horizontal en la franja del diente (prótesis removible); seguidos forman una barra. */
  | { tipo: "GUION_FRANJA" };

export type DefinicionHallazgo = {
  codigo: CodigoHallazgo;
  etiqueta: string;
  color: Color;
  simbolo: Simbolo;
  /** SUPERFICIE: se marca cara por cara. DIENTE: aplica al diente completo. */
  nivel: "SUPERFICIE" | "DIENTE";
  /** Solo se puede ver en una radiografía (no en el examen clínico). */
  radiografico?: boolean;
  /**
   * Hallazgos del mismo grupo son excluyentes en un diente (ej. corona en buen vs mal
   * estado). "TOTAL" excluye cualquier otro hallazgo del diente (sano, ausente, sin erupcionar).
   */
  grupo?: string;
  /** Puede ir junto con "Ausente" en el mismo diente (lo que reemplaza al diente perdido). */
  conAusente?: boolean;
};

/** En el mismo orden que la tabla de convenciones del formato en papel. */
export const HALLAZGOS: DefinicionHallazgo[] = [
  { codigo: "SANO", etiqueta: "Sano", color: "NEGRO", simbolo: { tipo: "LETRA", texto: "S" }, nivel: "DIENTE", grupo: "TOTAL" },
  { codigo: "CARIES", etiqueta: "Cariado", color: "ROJO", simbolo: { tipo: "RELLENO" }, nivel: "SUPERFICIE" },
  { codigo: "RESINA", etiqueta: "Resina", color: "AZUL", simbolo: { tipo: "RELLENO" }, nivel: "SUPERFICIE" },
  { codigo: "AMALGAMA", etiqueta: "Amalgama", color: "NEGRO", simbolo: { tipo: "GUION_CARA" }, nivel: "SUPERFICIE" },
  { codigo: "AUSENTE", etiqueta: "Ausente", color: "NEGRO", simbolo: { tipo: "LINEA_VERTICAL" }, nivel: "DIENTE", grupo: "TOTAL" },
  { codigo: "EXODONCIA_SIMPLE_INDICADA", etiqueta: "Exodoncia simple indicada", color: "ROJO", simbolo: { tipo: "X" }, nivel: "DIENTE", grupo: "EXODONCIA" },
  { codigo: "EXODONCIA_QUIRURGICA_INDICADA", etiqueta: "Exodoncia quirúrgica indicada", color: "ROJO", simbolo: { tipo: "X", quirurgica: true }, nivel: "DIENTE", grupo: "EXODONCIA" },
  { codigo: "SIN_ERUPCIONAR", etiqueta: "Sin erupcionar", color: "NEGRO", simbolo: { tipo: "LINEA_HORIZONTAL" }, nivel: "DIENTE", grupo: "TOTAL", radiografico: true },
  { codigo: "ENDODONCIA_REALIZADA", etiqueta: "Endodoncia realizada", color: "AZUL", simbolo: { tipo: "TRIANGULO" }, nivel: "DIENTE", grupo: "ENDODONCIA", radiografico: true },
  { codigo: "ENDODONCIA_INDICADA", etiqueta: "Endodoncia indicada", color: "ROJO", simbolo: { tipo: "TRIANGULO" }, nivel: "DIENTE", grupo: "ENDODONCIA" },
  { codigo: "SELLANTE_POR_HACER", etiqueta: "Sellante por hacer", color: "ROJO", simbolo: { tipo: "LETRA", texto: "S" }, nivel: "DIENTE", grupo: "SELLANTE" },
  { codigo: "SELLANTE_REALIZADO", etiqueta: "Sellante realizado", color: "AZUL", simbolo: { tipo: "LETRA", texto: "S" }, nivel: "DIENTE", grupo: "SELLANTE" },
  { codigo: "ROTACION", etiqueta: "Rotación", color: "ROJO", simbolo: { tipo: "ROTACION" }, nivel: "DIENTE" },
  { codigo: "CORONA_BUEN_ESTADO", etiqueta: "Corona buen estado", color: "AZUL", simbolo: { tipo: "CIRCULO" }, nivel: "DIENTE", grupo: "CORONA" },
  { codigo: "CORONA_MAL_ESTADO", etiqueta: "Corona mal estado", color: "ROJO", simbolo: { tipo: "CIRCULO" }, nivel: "DIENTE", grupo: "CORONA" },
  { codigo: "PROVISIONAL_MAL_ESTADO", etiqueta: "Provisional mal estado", color: "ROJO", simbolo: { tipo: "LETRA", texto: "P" }, nivel: "DIENTE", grupo: "PROVISIONAL" },
  { codigo: "PROVISIONAL_BUEN_ESTADO", etiqueta: "Provisional buen estado", color: "AZUL", simbolo: { tipo: "LETRA", texto: "P" }, nivel: "DIENTE", grupo: "PROVISIONAL" },
  { codigo: "NUCLEO_MAL_ESTADO", etiqueta: "Núcleo mal estado", color: "ROJO", simbolo: { tipo: "LETRA", texto: "N" }, nivel: "DIENTE", grupo: "NUCLEO", radiografico: true },
  { codigo: "NUCLEO_BUEN_ESTADO", etiqueta: "Núcleo buen estado", color: "AZUL", simbolo: { tipo: "LETRA", texto: "N" }, nivel: "DIENTE", grupo: "NUCLEO", radiografico: true },
  { codigo: "RESTO_RADICULAR", etiqueta: "Resto radicular", color: "ROJO", simbolo: { tipo: "LETRA", texto: "RR" }, nivel: "DIENTE" },
  { codigo: "PROTESIS_REMOVIBLE", etiqueta: "Prótesis removible", color: "AZUL", simbolo: { tipo: "GUION_FRANJA" }, nivel: "DIENTE", conAusente: true },
  { codigo: "IMPLANTE", etiqueta: "Implante", color: "AZUL", simbolo: { tipo: "LETRA", texto: "I" }, nivel: "DIENTE", conAusente: true },
];

const POR_CODIGO = new Map(HALLAZGOS.map((h) => [h.codigo, h]));

/**
 * Convenciones que ya no existen y cómo se leen hoy. "Obturado buen/mal estado" se cambió
 * por Resina y Amalgama (octubre 2026): lo guardado antes se lee como Resina (buen estado) o
 * Amalgama (mal estado), igual que quedaron los casos de ejemplo.
 */
const CODIGOS_ANTERIORES: Record<string, CodigoHallazgo> = {
  OBTURADO_BUEN_ESTADO: "RESINA",
  OBTURADO_MAL_ESTADO: "AMALGAMA",
};

export function definicionHallazgo(codigo: string): DefinicionHallazgo | undefined {
  return POR_CODIGO.get((CODIGOS_ANTERIORES[codigo] ?? codigo) as CodigoHallazgo);
}

export const COLORES_HEX: Record<Color, string> = { ROJO: "#dc2626", AZUL: "#2563eb", NEGRO: "#111827" };

// ---------------------------------------------------------------------------
// Marcas
// ---------------------------------------------------------------------------

export type Marca = { diente: number; hallazgo: CodigoHallazgo; superficie?: Superficie };

export function claveMarca(m: Marca): string {
  return `${m.diente}:${m.hallazgo}:${m.superficie ?? "-"}`;
}

/** Descarta marcas mal formadas y duplicadas (datos que llegan del cliente o de JSON). */
export function normalizarMarcas(raw: unknown): Marca[] {
  if (!Array.isArray(raw)) return [];
  const vistas = new Set<string>();
  const salida: Marca[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const { diente, hallazgo, superficie } = item as Record<string, unknown>;
    const def = typeof hallazgo === "string" ? definicionHallazgo(hallazgo) : undefined;
    if (typeof diente !== "number" || !esDienteValido(diente) || !def) continue;
    let marca: Marca;
    if (def.nivel === "SUPERFICIE") {
      if (typeof superficie !== "string" || !SUPERFICIES.includes(superficie as Superficie)) continue;
      marca = { diente, hallazgo: def.codigo, superficie: superficie as Superficie };
    } else {
      marca = { diente, hallazgo: def.codigo };
    }
    const clave = claveMarca(marca);
    if (vistas.has(clave)) continue;
    vistas.add(clave);
    salida.push(marca);
  }
  return salida;
}

export function ordenarMarcas(marcas: Marca[]): Marca[] {
  const ordenHallazgo = new Map(HALLAZGOS.map((h, i) => [h.codigo, i]));
  return [...marcas].sort(
    (a, b) =>
      a.diente - b.diente ||
      (ordenHallazgo.get(a.hallazgo) ?? 0) - (ordenHallazgo.get(b.hallazgo) ?? 0) ||
      SUPERFICIES.indexOf(a.superficie ?? "V") - SUPERFICIES.indexOf(b.superficie ?? "V")
  );
}

/**
 * Aplica la herramienta seleccionada a un diente (y superficie, si el hallazgo es de
 * superficie). Hacer clic de nuevo con el mismo hallazgo lo quita. Respeta las
 * exclusiones: una superficie tiene un solo hallazgo; sano/ausente/sin erupcionar excluyen
 * todo lo demás; buen vs mal estado del mismo elemento se reemplazan entre sí; un resto
 * radicular no tiene corona, así que borra las superficies.
 */
export function aplicarHallazgo(
  marcas: Marca[],
  diente: number,
  hallazgo: CodigoHallazgo,
  superficie?: Superficie
): Marca[] {
  const def = definicionHallazgo(hallazgo);
  if (!def) return marcas;
  const delDiente = (m: Marca) => m.diente === diente;
  const grupoDe = (m: Marca) => definicionHallazgo(m.hallazgo)?.grupo;

  if (def.nivel === "SUPERFICIE") {
    if (!superficie) return marcas;
    const yaEstaba = marcas.some((m) => delDiente(m) && m.superficie === superficie && m.hallazgo === hallazgo);
    const resto = marcas.filter(
      (m) =>
        !(delDiente(m) && m.superficie === superficie) &&
        !(delDiente(m) && (grupoDe(m) === "TOTAL" || m.hallazgo === "RESTO_RADICULAR"))
    );
    return yaEstaba ? resto : [...resto, { diente, hallazgo, superficie }];
  }

  const yaEstaba = marcas.some((m) => delDiente(m) && m.hallazgo === hallazgo);
  if (yaEstaba) return marcas.filter((m) => !(delDiente(m) && m.hallazgo === hallazgo));

  const vaConAusente = (m: Marca) => definicionHallazgo(m.hallazgo)?.conAusente === true;
  let resto: Marca[];
  if (def.grupo === "TOTAL") {
    // Ausente deja lo que reemplaza al diente (prótesis removible, implante); lo demás se borra.
    resto = marcas.filter((m) => !delDiente(m) || (hallazgo === "AUSENTE" && vaConAusente(m)));
  } else {
    resto = marcas.filter(
      (m) =>
        !(delDiente(m) && grupoDe(m) === "TOTAL" && !(def.conAusente && m.hallazgo === "AUSENTE")) &&
        !(delDiente(m) && def.grupo !== undefined && grupoDe(m) === def.grupo) &&
        !(delDiente(m) && hallazgo === "RESTO_RADICULAR" && m.superficie !== undefined)
    );
  }
  return [...resto, { diente, hallazgo }];
}

export function limpiarDiente(marcas: Marca[], diente: number): Marca[] {
  return marcas.filter((m) => m.diente !== diente);
}

/** Dientes que cuentan como presentes en boca (para el índice de O'Leary). */
export function dientesPresentes(denticion: Denticion, marcas: Marca[]): number[] {
  const fuera = new Set(
    marcas.filter((m) => m.hallazgo === "AUSENTE" || m.hallazgo === "SIN_ERUPCIONAR" || m.hallazgo === "PROTESIS_REMOVIBLE").map((m) => m.diente)
  );
  return dientesDeDenticion(denticion).filter((d) => !fuera.has(d));
}

// ---------------------------------------------------------------------------
// Relato clínico: lo que el estudiante "ve" al examinar al paciente
// ---------------------------------------------------------------------------

/**
 * Cómo se describe cada hallazgo en el examen, sin nombrar la convención: el estudiante
 * tiene que reconocer qué convención corresponde. `clinico` es lo que se ve en boca;
 * `radiografico`, lo que aparece en la radiografía (si el hallazgo solo es radiográfico,
 * no tiene descripción clínica).
 */
const DESCRIPCION: Record<CodigoHallazgo, { clinico?: string; radiografico?: string }> = {
  SANO: {},
  CARIES: { clinico: "lesión cavitada con tejido reblandecido y oscuro" },
  RESINA: { clinico: "restauración del color del diente (resina)" },
  AMALGAMA: { clinico: "restauración metálica plateada (amalgama)" },
  AUSENTE: { clinico: "no se observa en boca; el paciente refiere que se lo extrajeron" },
  EXODONCIA_SIMPLE_INDICADA: {
    clinico: "destrucción coronal extensa, no restaurable, con raíces accesibles; se indica extraerlo",
  },
  EXODONCIA_QUIRURGICA_INDICADA: {
    clinico: "parcialmente cubierto por encía, con dolor e inflamación recurrente; su extracción requiere técnica quirúrgica",
  },
  SIN_ERUPCIONAR: {
    clinico: "no se observa en boca y el paciente no recuerda que se lo hayan extraído",
    radiografico: "está presente dentro del hueso, sin erupcionar",
  },
  ENDODONCIA_REALIZADA: { radiografico: "conductos radiculares obturados (tratamiento de conductos ya realizado)" },
  ENDODONCIA_INDICADA: {
    clinico: "dolor espontáneo e intenso, que se prolonga después de retirar el frío; necesita tratamiento de conductos",
  },
  SELLANTE_POR_HACER: { clinico: "fosas y fisuras profundas, sin caries; se recomienda sellarlas" },
  SELLANTE_REALIZADO: { clinico: "fosas y fisuras cubiertas con sellante, bien retenido" },
  ROTACION: { clinico: "girado sobre su propio eje respecto a los dientes vecinos" },
  CORONA_BUEN_ESTADO: { clinico: "corona completa bien adaptada" },
  CORONA_MAL_ESTADO: { clinico: "corona completa desadaptada, con el margen abierto" },
  PROVISIONAL_MAL_ESTADO: { clinico: "corona provisional fracturada y desadaptada" },
  PROVISIONAL_BUEN_ESTADO: { clinico: "corona provisional bien adaptada" },
  NUCLEO_MAL_ESTADO: { radiografico: "poste intrarradicular desadaptado, con espacio entre el poste y el conducto" },
  NUCLEO_BUEN_ESTADO: { radiografico: "poste intrarradicular bien adaptado" },
  RESTO_RADICULAR: { clinico: "solo quedan restos de la raíz, sin corona clínica" },
  PROTESIS_REMOVIBLE: { clinico: "lo reemplaza un diente de una prótesis removible, que el paciente se quita para la higiene" },
  IMPLANTE: {
    clinico: "corona fija sobre un implante; el paciente refiere que se lo pusieron",
    radiografico: "tornillo de titanio dentro del hueso (implante)",
  },
};

const ORDEN_RELATO: Superficie[] = ["O", "M", "D", "V", "L"];

function listaNatural(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

/**
 * Convierte el odontograma esperado de un caso en el relato que el estudiante lee al
 * examinar (fuente CLINICO) o al leer la radiografía (fuente RADIOGRAFICO). En modo fácil
 * cada línea trae el número FDI; en difícil solo el nombre anatómico, y el estudiante debe
 * ubicar el diente.
 */
export function relatoOdontograma(
  marcas: Marca[],
  fuente: "CLINICO" | "RADIOGRAFICO",
  conNumero: boolean
): string[] {
  const porDienteHallazgo = new Map<string, { diente: number; hallazgo: CodigoHallazgo; superficies: Superficie[] }>();
  for (const m of ordenarMarcas(marcas)) {
    if (m.hallazgo === "SANO") continue;
    const clave = `${m.diente}:${m.hallazgo}`;
    const grupo = porDienteHallazgo.get(clave) ?? { diente: m.diente, hallazgo: m.hallazgo, superficies: [] };
    if (m.superficie) grupo.superficies.push(m.superficie);
    porDienteHallazgo.set(clave, grupo);
  }

  const lineas: string[] = [];
  for (const { diente, hallazgo, superficies } of porDienteHallazgo.values()) {
    const texto = fuente === "CLINICO" ? DESCRIPCION[hallazgo].clinico : DESCRIPCION[hallazgo].radiografico;
    if (!texto) continue;
    const caras = ORDEN_RELATO.filter((s) => superficies.includes(s)).map((s) => nombreSuperficie(diente, s));
    const enCaras = caras.length ? `, ${caras.length > 1 ? "caras" : "cara"} ${listaNatural(caras)}` : "";
    const nombre = nombreDiente(diente);
    const sujeto = conNumero ? `Diente ${diente} (${nombre})` : nombre.charAt(0).toUpperCase() + nombre.slice(1);
    lineas.push(`${sujeto}${enCaras}: ${texto}.`);
  }
  return lineas;
}

export function tieneHallazgosRadiograficos(marcas: Marca[]): boolean {
  return marcas.some((m) => DESCRIPCION[m.hallazgo]?.radiografico);
}

// ---------------------------------------------------------------------------
// Dentición mixta y acciones rápidas
// ---------------------------------------------------------------------------

/**
 * El diente "par" en la dentición mixta: el permanente que reemplaza a un temporal
 * (55 → 15) o el temporal que ocupa el sitio de un permanente (15 → 55). Los molares
 * permanentes (6, 7, 8) no reemplazan a ningún temporal: no tienen par.
 */
export function parMixto(diente: number): number | null {
  const q = cuadrante(diente);
  const p = posicion(diente);
  if (q >= 5 && q <= 8) return (q - 4) * 10 + p;
  if (q >= 1 && q <= 4 && p <= 5) return (q + 4) * 10 + p;
  return null;
}

// La prótesis y el implante reemplazan al diente natural: tampoco cuenta como presente.
const NO_ESTA_EN_BOCA = new Set<CodigoHallazgo>(["AUSENTE", "SIN_ERUPCIONAR", "PROTESIS_REMOVIBLE", "IMPLANTE"]);

/**
 * ¿El diente está en boca según lo marcado? true = tiene algo que implica que está (caries,
 * corona, sano…); false = ausente o sin erupcionar; null = no se ha marcado nada.
 */
export function presenteEnBoca(marcas: Marca[], diente: number): boolean | null {
  const delDiente = marcas.filter((m) => m.diente === diente);
  if (delDiente.length === 0) return null;
  return !delDiente.some((m) => NO_ESTA_EN_BOCA.has(m.hallazgo));
}

/**
 * Dentición mixta: un temporal y su permanente no pueden estar los dos en boca. Devuelve
 * los pares donde ambos tienen marcas que dicen que están (ej. caries en el 55 y en el 15).
 */
export function contradiccionesMixta(marcas: Marca[]): { temporal: number; permanente: number }[] {
  return DIENTES_TEMPORALES.flatMap((temporal) => {
    const permanente = parMixto(temporal)!;
    return presenteEnBoca(marcas, temporal) === true && presenteEnBoca(marcas, permanente) === true
      ? [{ temporal, permanente }]
      : [];
  });
}

/**
 * "Marcar el resto como sano": pone Sano en los dientes sin ninguna marca. En la mixta, un
 * diente con par solo se marca si su par ya consta como ausente o sin erupcionar (si no, no
 * se sabe cuál de los dos está en boca y se deja sin marcar). Sano no se califica.
 */
export function marcarRestoSano(marcas: Marca[], denticion: Denticion): Marca[] {
  const conMarca = new Set(marcas.map((m) => m.diente));
  const nuevos = dientesDeDenticion(denticion).filter((d) => {
    if (conMarca.has(d)) return false;
    if (denticion !== "MIXTA") return true;
    const par = parMixto(d);
    return par === null || presenteEnBoca(marcas, par) === false;
  });
  return [...marcas, ...nuevos.map((diente) => ({ diente, hallazgo: "SANO" as const }))];
}
