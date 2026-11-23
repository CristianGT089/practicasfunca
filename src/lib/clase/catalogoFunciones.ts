/**
 * Las funciones del curso con su ayuda, como la que muestra Google Sheets al escribir una fórmula:
 * sintaxis, ejemplo, resumen y qué es cada argumento. Lo usa el asistente de la barra de fórmulas
 * (autocompletar y tarjeta de ayuda) y cualquier diapositiva que quiera listar funciones.
 * Los nombres son los canónicos de `formulas.ts` (en español) y su equivalente en inglés.
 */

export type Argumento = {
  nombre: string;
  descripcion: string;
  /** Va entre corchetes en la sintaxis: se puede omitir. */
  opcional?: boolean;
  /** Se puede repetir (valor2, valor3…): en la sintaxis aparece «…». */
  repetible?: boolean;
};

export type CategoriaFuncion = "Resumen" | "Condicionales" | "Lógicas" | "Texto y números" | "Fechas" | "Búsqueda" | "Errores";

export type FuncionCatalogo = {
  nombre: string;
  ingles: string;
  categoria: CategoriaFuncion;
  /** Una línea: lo que se ve en la lista del autocompletar. */
  resumen: string;
  argumentos: Argumento[];
  /** Ejemplo con letras de celda, como el de la ayuda de Sheets. */
  ejemplo: string;
  /** Ejemplo del área de la salud y qué responde. */
  enSalud: { formula: string; explicacion: string };
  /** Un consejo o error común. */
  ojo?: string;
};

export const CATALOGO: FuncionCatalogo[] = [
  {
    nombre: "SUMA",
    ingles: "SUM",
    categoria: "Resumen",
    resumen: "Suma una serie de números o celdas.",
    argumentos: [
      { nombre: "valor1", descripcion: "El primer número o rango que se va a sumar, por ejemplo B2:B20." },
      { nombre: "valor2", descripcion: "Más números o rangos para sumar.", opcional: true, repetible: true },
    ],
    ejemplo: "=SUMA(A2:A100; 101; A102:A105)",
    enSalud: { formula: "=SUMA(D2:D13)", explicacion: "Unidades que hay en bodega." },
    ojo: "El texto («Agotado») no se suma: lo ignora.",
  },
  {
    nombre: "PROMEDIO",
    ingles: "AVERAGE",
    categoria: "Resumen",
    resumen: "El promedio de los números: los suma y divide entre cuántos hay.",
    argumentos: [
      { nombre: "valor1", descripcion: "El primer número o rango que se tiene en cuenta." },
      { nombre: "valor2", descripcion: "Más números o rangos.", opcional: true, repetible: true },
    ],
    ejemplo: "=PROMEDIO(A2:A100; B2:B100)",
    enSalud: { formula: "=PROMEDIO(F2:F31)", explicacion: "La temperatura promedio de los pacientes del turno." },
  },
  {
    nombre: "MAX",
    ingles: "MAX",
    categoria: "Resumen",
    resumen: "El número más alto.",
    argumentos: [
      { nombre: "valor1", descripcion: "El primer número o rango donde se busca el mayor." },
      { nombre: "valor2", descripcion: "Más números o rangos.", opcional: true, repetible: true },
    ],
    ejemplo: "=MAX(A2:A100)",
    enSalud: { formula: "=MAX(E2:E13)", explicacion: "El medicamento más caro del inventario." },
  },
  {
    nombre: "MIN",
    ingles: "MIN",
    categoria: "Resumen",
    resumen: "El número más bajo.",
    argumentos: [
      { nombre: "valor1", descripcion: "El primer número o rango donde se busca el menor." },
      { nombre: "valor2", descripcion: "Más números o rangos.", opcional: true, repetible: true },
    ],
    ejemplo: "=MIN(A2:A100)",
    enSalud: { formula: "=MIN(D2:D13)", explicacion: "El medicamento con menos unidades: el que se está agotando." },
  },
  {
    nombre: "CONTAR",
    ingles: "COUNT",
    categoria: "Resumen",
    resumen: "Cuenta cuántas celdas tienen números.",
    argumentos: [
      { nombre: "valor1", descripcion: "El primer rango donde se cuentan los números." },
      { nombre: "valor2", descripcion: "Más rangos.", opcional: true, repetible: true },
    ],
    ejemplo: "=CONTAR(A2:A100)",
    enSalud: { formula: "=CONTAR(E2:E13)", explicacion: "Cuántos medicamentos tienen precio registrado." },
    ojo: "Los nombres son texto: CONTAR no los cuenta. Para eso, CONTARA.",
  },
  {
    nombre: "CONTARA",
    ingles: "COUNTA",
    categoria: "Resumen",
    resumen: "Cuenta las celdas que no están vacías (con texto o con números).",
    argumentos: [
      { nombre: "valor1", descripcion: "El primer rango donde se cuentan las celdas llenas." },
      { nombre: "valor2", descripcion: "Más rangos.", opcional: true, repetible: true },
    ],
    ejemplo: "=CONTARA(A2:A100)",
    enSalud: { formula: "=CONTARA(A2:A40)", explicacion: "Cuántos pacientes hay en la lista del día." },
  },
  {
    nombre: "SI",
    ingles: "IF",
    categoria: "Condicionales",
    resumen: "Devuelve un valor si la condición se cumple y otro si no.",
    argumentos: [
      { nombre: "condición", descripcion: "Una comparación que da VERDADERO o FALSO, por ejemplo D2=\"Cancelado\" o F2>38." },
      { nombre: "valor_si_verdadero", descripcion: "Lo que muestra si la condición se cumple. Si es texto, va entre comillas." },
      { nombre: "valor_si_falso", descripcion: "Lo que muestra si no se cumple. Si lo omites, muestra FALSO.", opcional: true },
    ],
    ejemplo: '=SI(A2>100; "Alto"; "Bajo")',
    enSalud: { formula: '=SI(F2>=38; "Fiebre"; "Normal")', explicacion: "Marca a los pacientes con fiebre." },
    ojo: "Los textos van entre comillas; los números y las celdas, no.",
  },
  {
    nombre: "Y",
    ingles: "AND",
    categoria: "Lógicas",
    resumen: "VERDADERO solo si se cumplen todas las condiciones.",
    argumentos: [
      { nombre: "condición1", descripcion: "La primera comparación." },
      { nombre: "condición2", descripcion: "Más comparaciones: todas tienen que cumplirse.", opcional: true, repetible: true },
    ],
    ejemplo: "=Y(A2>1; A2<100)",
    enSalud: { formula: '=SI(Y(B2="Enfermería"; C2="Urgente"); "Atender ya"; "")', explicacion: "Urgentes de Enfermería." },
  },
  {
    nombre: "O",
    ingles: "OR",
    categoria: "Lógicas",
    resumen: "VERDADERO si se cumple al menos una de las condiciones.",
    argumentos: [
      { nombre: "condición1", descripcion: "La primera comparación." },
      { nombre: "condición2", descripcion: "Más comparaciones: basta con que una se cumpla.", opcional: true, repetible: true },
    ],
    ejemplo: '=O(A2="Sí"; B2>10)',
    enSalud: { formula: '=SI(O(F2>=38; G2>100); "Revisar"; "OK")', explicacion: "Fiebre o pulso alto: revisar." },
  },
  {
    nombre: "CONTAR.SI",
    ingles: "COUNTIF",
    categoria: "Condicionales",
    resumen: "Cuenta las celdas de un rango que cumplen un criterio.",
    argumentos: [
      { nombre: "rango", descripcion: "Las celdas donde se busca, por ejemplo D2:D31." },
      { nombre: "criterio", descripcion: 'Lo que tienen que cumplir: "Cancelado", ">50", "<>Atendido" o "Enf*". Va entre comillas.' },
    ],
    ejemplo: '=CONTAR.SI(A1:A10; "Pagado")',
    enSalud: { formula: '=CONTAR.SI(E2:E31; "Cancelado")', explicacion: "Cuántos turnos se cancelaron." },
    ojo: 'Para comparar números, el operador va dentro de las comillas: ">30000" (sin punto de miles).',
  },
  {
    nombre: "SUMAR.SI",
    ingles: "SUMIF",
    categoria: "Condicionales",
    resumen: "Suma las celdas que cumplen un criterio.",
    argumentos: [
      { nombre: "rango", descripcion: "Donde se busca el criterio, por ejemplo B2:B13 (la categoría)." },
      { nombre: "criterio", descripcion: 'Lo que se busca: "Analgésico", ">100"…' },
      { nombre: "rango_suma", descripcion: "Lo que se suma. Debe tener las mismas filas que «rango». Si lo omites, suma el mismo «rango».", opcional: true },
    ],
    ejemplo: '=SUMAR.SI(A1:A10; "Pagado"; B1:B10)',
    enSalud: { formula: '=SUMAR.SI(B2:B13; "Analgésico"; D2:D13)', explicacion: "Unidades de analgésicos: busca en B y suma lo de D." },
  },
  {
    nombre: "PROMEDIO.SI",
    ingles: "AVERAGEIF",
    categoria: "Condicionales",
    resumen: "El promedio de las celdas que cumplen un criterio.",
    argumentos: [
      { nombre: "rango", descripcion: "Donde se busca el criterio." },
      { nombre: "criterio", descripcion: 'Lo que se busca: "Enfermería", ">0"…' },
      { nombre: "rango_promedio", descripcion: "Lo que se promedia. Si lo omites, promedia el mismo «rango».", opcional: true },
    ],
    ejemplo: '=PROMEDIO.SI(A1:A10; "Norte"; B1:B10)',
    enSalud: { formula: '=PROMEDIO.SI(B2:B31; "Odontología"; E2:E31)', explicacion: "Valor promedio de las citas de Odontología." },
  },
  {
    nombre: "CONTAR.SI.CONJUNTO",
    ingles: "COUNTIFS",
    categoria: "Condicionales",
    resumen: "Cuenta las filas que cumplen varios criterios a la vez.",
    argumentos: [
      { nombre: "rango1", descripcion: "Donde se busca el primer criterio." },
      { nombre: "criterio1", descripcion: "El primer criterio." },
      { nombre: "rango2", descripcion: "Donde se busca el segundo criterio (mismas filas que rango1).", opcional: true, repetible: true },
      { nombre: "criterio2", descripcion: "El segundo criterio. Se pueden agregar más parejas rango; criterio.", opcional: true, repetible: true },
    ],
    ejemplo: '=CONTAR.SI.CONJUNTO(A1:A10; "Norte"; B1:B10; ">5")',
    enSalud: { formula: '=CONTAR.SI.CONJUNTO(B2:B9; "Enfermería"; C2:C9; "Urgente")', explicacion: "Turnos urgentes de Enfermería." },
    ojo: "Todos los rangos deben tener las mismas filas; si no, da #¡VALOR!.",
  },
  {
    nombre: "SUMAR.SI.CONJUNTO",
    ingles: "SUMIFS",
    categoria: "Condicionales",
    resumen: "Suma las celdas de las filas que cumplen varios criterios.",
    argumentos: [
      { nombre: "rango_suma", descripcion: "Lo que se suma. ¡Ojo!: aquí va primero, al revés que en SUMAR.SI." },
      { nombre: "rango1", descripcion: "Donde se busca el primer criterio." },
      { nombre: "criterio1", descripcion: "El primer criterio." },
      { nombre: "rango2", descripcion: "Donde se busca el segundo criterio.", opcional: true, repetible: true },
      { nombre: "criterio2", descripcion: "El segundo criterio. Se pueden agregar más parejas.", opcional: true, repetible: true },
    ],
    ejemplo: '=SUMAR.SI.CONJUNTO(C1:C10; A1:A10; "Norte"; B1:B10; "Pagado")',
    enSalud: { formula: '=SUMAR.SI.CONJUNTO(E2:E9; B2:B9; "Enfermería"; D2:D9; "Atendido")', explicacion: "Lo atendido en Enfermería." },
  },
  {
    nombre: "CONCATENAR",
    ingles: "CONCATENATE",
    categoria: "Texto y números",
    resumen: "Une varios textos en uno. También se puede con &.",
    argumentos: [
      { nombre: "texto1", descripcion: "El primer texto o celda." },
      { nombre: "texto2", descripcion: 'Más textos o celdas. Los separadores van entre comillas: " - ".', opcional: true, repetible: true },
    ],
    ejemplo: '=CONCATENAR(A2; " "; B2)',
    enSalud: { formula: '=CONCATENAR(A2; " - "; B2)', explicacion: "«Ana Ruiz - Enfermería». Igual que =A2&\" - \"&B2." },
  },
  {
    nombre: "REDONDEAR",
    ingles: "ROUND",
    categoria: "Texto y números",
    resumen: "Redondea un número a los decimales que digas.",
    argumentos: [
      { nombre: "valor", descripcion: "El número (o la fórmula) que se redondea." },
      { nombre: "decimales", descripcion: "Cuántos decimales dejar: 0 = sin decimales. Si lo omites, 0.", opcional: true },
    ],
    ejemplo: "=REDONDEAR(A2; 2)",
    enSalud: { formula: "=REDONDEAR(PROMEDIO(C2:C13); 0)", explicacion: "El precio promedio, sin decimales." },
  },
  {
    nombre: "HOY",
    ingles: "TODAY",
    categoria: "Fechas",
    resumen: "La fecha de hoy. Se actualiza sola cada día.",
    argumentos: [],
    ejemplo: "=HOY()",
    enSalud: { formula: "=F2-HOY()", explicacion: "Días que faltan para que venza el medicamento (negativo = ya venció)." },
    ojo: "No lleva nada entre los paréntesis, pero los paréntesis van.",
  },
  {
    nombre: "SI.ERROR",
    ingles: "IFERROR",
    categoria: "Errores",
    resumen: "Si la fórmula da error, muestra otra cosa en su lugar.",
    argumentos: [
      { nombre: "valor", descripcion: "La fórmula que puede fallar, por ejemplo C2/D2." },
      { nombre: "valor_si_error", descripcion: 'Lo que se muestra si da error: "No aplica", 0, "".' },
    ],
    ejemplo: '=SI.ERROR(A2/B2; "")',
    enSalud: { formula: '=SI.ERROR(C2/D2; "No aplica")', explicacion: "Precio por unidad; si no hay unidades, «No aplica»." },
  },
  {
    nombre: "BUSCARV",
    ingles: "VLOOKUP",
    categoria: "Búsqueda",
    resumen: "Busca un dato en la primera columna de una tabla y trae lo que hay en otra columna de esa fila.",
    argumentos: [
      { nombre: "clave", descripcion: "Lo que buscas: un código, una cédula… (normalmente una celda)." },
      { nombre: "rango", descripcion: "La tabla donde buscar. La clave tiene que estar en su primera columna. Fíjala con $ (o usa el nombre de la tabla)." },
      { nombre: "índice", descripcion: "Qué columna de la tabla traer, contando desde 1." },
      { nombre: "está_ordenado", descripcion: "FALSO = búsqueda exacta. Ponlo siempre: sin él puede traer otra fila sin avisar.", opcional: true },
    ],
    ejemplo: "=BUSCARV(10003; A2:B26; 2; FALSO)",
    enSalud: { formula: "=BUSCARV(G2; $K$2:$M$9; 2; FALSO)", explicacion: "Con el código del profesional, trae su nombre." },
    ojo: "Solo busca en la primera columna y solo trae datos de la derecha.",
  },
  {
    nombre: "BUSCARX",
    ingles: "XLOOKUP",
    categoria: "Búsqueda",
    resumen: "Busca un dato en una columna y devuelve lo que está en la misma fila de otra columna.",
    argumentos: [
      { nombre: "clave_búsqueda", descripcion: "Lo que buscas (normalmente una celda)." },
      { nombre: "rango_búsqueda", descripcion: "La columna donde se busca." },
      { nombre: "rango_resultado", descripcion: "La columna que se devuelve (mismas filas)." },
      { nombre: "si_no_se_encuentra", descripcion: 'Lo que muestra si no lo encuentra, por ejemplo "No registrado". Si lo omites, da #N/A.', opcional: true },
    ],
    ejemplo: '=BUSCARX("Manzana"; A2:A; E2:E)',
    enSalud: { formula: "=BUSCARX(B2; Profesionales[Código]; Profesionales[Cargo])", explicacion: "Con el código, trae el cargo del profesional." },
    ojo: "Busca exacto sin que se lo pidas y puede traer datos de la izquierda.",
  },
];

const sinTildes = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();

/** La ayuda de una función por su nombre en español o en inglés. */
export function funcionDelCatalogo(nombre: string): FuncionCatalogo | undefined {
  const n = sinTildes(nombre);
  return CATALOGO.find((f) => sinTildes(f.nombre) === n || f.ingles === n || (n === "CONCAT" && f.nombre === "CONCATENAR"));
}

/** Funciones que empiezan por lo escrito (en español o en inglés), las del español primero. */
export function funcionesQueEmpiezan(prefijo: string): FuncionCatalogo[] {
  const p = sinTildes(prefijo);
  if (!p) return [];
  const es = CATALOGO.filter((f) => sinTildes(f.nombre).startsWith(p));
  const en = CATALOGO.filter((f) => !es.includes(f) && f.ingles.startsWith(p));
  return [...es, ...en];
}

/**
 * Qué argumento le corresponde a la posición `i` (desde 0). Con argumentos repetibles da vueltas:
 * en CONTAR.SI.CONJUNTO, el 5.º argumento vuelve a ser un «rango».
 */
export function argumentoEn(f: FuncionCatalogo, i: number): number {
  if (i < f.argumentos.length) return i;
  const repetibles = f.argumentos.map((a, k) => (a.repetible ? k : -1)).filter((k) => k >= 0);
  if (!repetibles.length) return f.argumentos.length - 1;
  return repetibles[(i - repetibles[0]) % repetibles.length];
}

/** La sintaxis como la escribe Sheets: SUMAR.SI(rango; criterio; [rango_suma]). */
export function sintaxis(f: FuncionCatalogo): string {
  return `${f.nombre}(${f.argumentos.map((a) => (a.opcional ? `[${a.nombre}]` : a.nombre)).join("; ")}${f.argumentos.some((a) => a.repetible) ? "; …" : ""})`;
}
