/**
 * PDF imprimible de las fórmulas de una jornada (Dispensario o Farmacia), para que el
 * docente las reparta. No representa un documento médico real: es material de práctica.
 *
 * Carta horizontal, dos mitades por página con una línea de corte al centro. Cada mitad es
 * el material de UN estudiante y se recorta en tres partes:
 *  1. La fórmula: la que se entrega en la ventanilla.
 *  2. Los documentos que presenta quien la lleva: su cédula de práctica y, según el caso,
 *     el documento del menor o la autorización escrita.
 *  3. "Tu papel": cómo debe actuar (normal, acudiente, tercero, suplantación y las
 *     situaciones del caso). Es solo para él; quien atiende no debe verlo.
 *
 * La fórmula se adapta a la cantidad de medicamentos: las filas se compactan y, si aun así
 * no caben con los documentos debajo, la fórmula ocupa su mitad entera (o varias, "hoja 1
 * de 2", si es muy larga) y los documentos y el papel pasan a la mitad siguiente: nunca se
 * monta un texto sobre otro.
 * Las páginas salen en el orden de los estudiantes, para repartirlas por nombre.
 */
import { jsPDF } from "jspdf";
import { definicionSituacion } from "./situaciones";
import { numeroConstancia } from "./constancias";

type RGB = [number, number, number];
const NAVY: RGB = [30, 46, 85]; // blue-900
const AZUL: RGB = [38, 62, 128]; // blue-800
const ORO: RGB = [251, 186, 0]; // gold-500
const FONDO: RGB = [238, 242, 251];
const FONDO_ORO: RGB = [255, 248, 224];
const TEXTO: RGB = [33, 41, 54];
const GRIS: RGB = [100, 116, 139];
const GRIS_SUAVE: RGB = [203, 213, 225];
const ROJO: RGB = [190, 40, 40];
const FONDO_ROJO: RGB = [254, 226, 226];

export type PacienteParaPDF = {
  nombre: string;
  cedula: string;
  /** CC | TI | RC (ver generador.ts). */
  tipoDocumento?: string;
  edad: number;
  genero?: "MASCULINO" | "FEMENINO" | "OTRO" | null;
  categoriaAfiliado?: string | null;
  diagnostico: string | null;
  alergias: string[];
  antecedentes: string | null;
  recetas: {
    medico: string;
    fechaEmision: string;
    fechaVigencia: string;
    cantidadAutorizada: number;
    medicamento: { nombre: string; presentacion: string };
  }[];
  situaciones?: string[];
  tipoRecogida?: "EL_MISMO" | "TERCERO_AUTORIZADO" | "SUPLANTACION";
  personaRecogeNombre?: string | null;
  personaRecogeCedula?: string | null;
  personaRecogeRelacion?: string | null;
  /** Caso de pendiente: cómo quiere recibir lo que falte, y su dirección si es a domicilio. */
  pendientePrefiere?: "ESTABLECIMIENTO" | "DOMICILIO" | null;
  direccionDomicilio?: string | null;
  /** Caso que viene a reclamar: la constancia que le dieron la vez anterior. */
  pendientes?: { numero: number; cantidad: number; creadoEn: string; usuarioId: string | null; recetaElectronica: { medicamento: { nombre: string } } }[];
};

const NOMBRE_DOCUMENTO: Record<string, string> = {
  CC: "Cédula de ciudadanía",
  TI: "Tarjeta de identidad",
  RC: "Registro civil de nacimiento",
};

const REGIMEN: Record<string, string> = {
  SUBSIDIADO: "Régimen subsidiado",
  CONTRIBUTIVO_A: "Contributivo, categoría A",
  CONTRIBUTIVO_B: "Contributivo, categoría B",
  CONTRIBUTIVO_C: "Contributivo, categoría C",
};

const documentoDe = (p: PacienteParaPDF) => `${p.tipoDocumento ?? "CC"} ${p.cedula}`;
const anios = (n: number) => `${n} ${n === 1 ? "año" : "años"}`;
const esMenor = (p: PacienteParaPDF) => p.situaciones?.includes("MENOR_DE_EDAD") ?? false;

function fechaCorta(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

/** El estudiante que lleva este caso a la ventanilla: el paciente mismo o quien reclama por él. */
export function quienSePresenta(p: PacienteParaPDF): { nombre: string; cedula: string } {
  return p.tipoRecogida && p.tipoRecogida !== "EL_MISMO" && p.personaRecogeNombre
    ? { nombre: p.personaRecogeNombre, cedula: p.personaRecogeCedula ?? "-" }
    : { nombre: p.nombre, cedula: p.cedula };
}

/** "la madre", "el padre", "el acudiente". */
const conArticulo = (relacion: string) => (relacion === "madre" ? "la madre" : relacion === "padre" ? "el padre" : `el ${relacion}`);

/**
 * Cómo debe actuar el estudiante que lleva este caso: un título corto y los pasos. Va
 * impreso al pie de su fórmula, en la parte que recorta y guarda para sí.
 */
export function papelDelEstudiante(p: PacienteParaPDF): { titulo: string; pasos: string[] } {
  const el = p.genero === "FEMENINO" ? "ella" : p.genero === "MASCULINO" ? "él" : "él o ella";
  const papel = (() => {
    if (esMenor(p)) {
      const doc = (NOMBRE_DOCUMENTO[p.tipoDocumento ?? "RC"] ?? "documento").toLowerCase();
      return {
        titulo: `Eres ${conArticulo(p.personaRecogeRelacion ?? "acudiente")} de ${p.nombre} (${anios(p.edad)}).`,
        pasos: [
          `Un menor no reclama solo: vienes tú por ${el}. Pide el turno con el documento de la fórmula.`,
          `En la ventanilla entrega la fórmula, muestra tu cédula y su ${doc}, y responde tú las preguntas.`,
        ],
      };
    }
    if (p.tipoRecogida === "TERCERO_AUTORIZADO") {
      return {
        titulo: `Reclamas por ${p.nombre}, de quien eres ${p.personaRecogeRelacion ?? "familiar"}.`,
        pasos: [
          `${p.nombre} no puede venir. Pide el turno con su documento (el de la fórmula).`,
          "En la ventanilla entrega la fórmula y la autorización firmada, y muestra tu cédula. Si te preguntan, explica tu parentesco.",
        ],
      };
    }
    if (p.tipoRecogida === "SUPLANTACION") {
      return {
        titulo: `Vas a hacerte pasar por ${p.nombre}.`,
        pasos: [
          "Tienes su fórmula, pero NO su autorización. Pide el turno con su documento (el de la fórmula).",
          `En la ventanilla di que tú eres ${p.nombre}. Si te piden la cédula, muestra la tuya: es la única que tienes. Si no te entregan, acéptalo.`,
        ],
      };
    }
    return {
      titulo: "Vas por tus propios medicamentos.",
      pasos: ["Pide el turno con el documento de la fórmula. En la ventanilla entrega la fórmula y muestra tu cédula cuando te la pidan."],
    };
  })();
  if (p.situaciones?.includes("PENDIENTE")) {
    papel.pasos.push(
      p.pendientePrefiere === "DOMICILIO"
        ? `Puede que no te entreguen todo. Si quedan debiendo algo, pide que te lo lleven a domicilio (lo autorizas): ${p.direccionDomicilio ?? "da tu dirección y celular"}. Anota el número de la constancia: ________`
        : "Puede que no te entreguen todo. Si quedan debiendo algo, di que vuelves a reclamarlo y anota el número de la constancia: ________. Espera a que pasen al menos 3 compañeros y vuelve a pedir turno con el mismo documento."
    );
  }
  if (reclamoAnterior(p)) {
    if (!esMenor(p) && p.tipoRecogida !== "TERCERO_AUTORIZADO") papel.titulo = "Vienes a reclamar lo que te quedaron debiendo.";
    papel.pasos.push(
      "La vez pasada solo te entregaron una parte de la fórmula. Pide el turno con el documento de la fórmula y presenta la constancia de pendiente."
    );
    // La mitad de las veces el paciente pide de más: el estudiante debe revisar el sistema.
    if (Number(p.cedula.slice(-1)) % 2 === 0) papel.pasos.push('Insiste en que te deben la fórmula completa: "a mí no me entregaron nada".');
  }
  for (const c of p.situaciones ?? []) {
    const ind = definicionSituacion(c)?.indicacionActor;
    if (ind) papel.pasos.push(ind);
  }
  return papel;
}

/** La constancia de un pendiente de antes de la jornada (caso que viene a reclamarlo). */
const reclamoAnterior = (p: PacienteParaPDF) => p.pendientes?.find((x) => x.usuarioId === null) ?? null;

/**
 * Una mitad de página. `recetas` vacío = mitad solo con documentos y papel (la fórmula no
 * cupo con ellos). `conDocumentos` = lleva documentos y papel al pie.
 */
type Hoja = {
  p: PacienteParaPDF;
  recetas: PacienteParaPDF["recetas"];
  numero: number;
  total: number;
  conDocumentos: boolean;
};

function cargarImagenComoDataURL(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("No se pudo crear el canvas"));
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export async function generarRecetasPDF(params: {
  nombreSimulacion: string;
  pacientes: PacienteParaPDF[];
  /** Solo para pruebas fuera del navegador: el logo ya leído (data URL). */
  logoDataUrl?: string | null;
  /** Solo para pruebas: devuelve el PDF en vez de descargarlo. */
  devolver?: boolean;
}) {
  const { nombreSimulacion, pacientes } = params;
  const doc = new jsPDF({ unit: "mm", format: "letter", orientation: "landscape" });
  const ANCHO_PAG = doc.internal.pageSize.getWidth();
  const ALTO = doc.internal.pageSize.getHeight();
  const MARGEN = 10;
  const CENTRO = 10; // hueco de la línea de corte
  const W = (ANCHO_PAG - MARGEN * 2 - CENTRO) / 2;
  const ARRIBA = 8;
  const PIE = ALTO - 5; // línea del texto legal

  let logo = params.logoDataUrl ?? null;
  if (logo === null && params.logoDataUrl === undefined) {
    try {
      logo = await cargarImagenComoDataURL("/funca-logo-blanco.png");
    } catch {
      // sin logo, el encabezado lleva el nombre en texto
    }
  }

  // ---------- utilidades de dibujo ----------

  const fuente = (tam: number, estilo: "normal" | "bold" | "italic" | "bolditalic" = "normal", color: RGB = TEXTO) => {
    doc.setFont("helvetica", estilo);
    doc.setFontSize(tam);
    doc.setTextColor(...color);
  };

  /** Recorta el texto con "…" para que quepa en `ancho` mm con la fuente actual. */
  const ajustar = (texto: string, ancho: number) => {
    if (doc.getTextWidth(texto) <= ancho) return texto;
    let t = texto;
    while (t.length > 1 && doc.getTextWidth(`${t}…`) > ancho) t = t.slice(0, -1);
    return `${t.trimEnd()}…`;
  };

  /** Segmentos en una línea separados por un punto pequeño (el "·" de helvetica sale roto). */
  const conPuntos = (segmentos: string[], x: number, y: number) => {
    let xx = x;
    segmentos.forEach((s, i) => {
      if (i > 0) {
        doc.setFillColor(...GRIS_SUAVE);
        doc.circle(xx + 2, y - 1.1, 0.55, "F");
        xx += 4;
      }
      doc.text(s, xx, y);
      xx += doc.getTextWidth(s);
    });
  };

  const lineaPunteada = (x1: number, y1: number, x2: number, y2: number) => {
    doc.setDrawColor(...GRIS_SUAVE);
    doc.setLineWidth(0.3);
    doc.setLineDashPattern([1.6, 1.4], 0);
    doc.line(x1, y1, x2, y2);
    doc.setLineDashPattern([], 0);
  };

  /** Etiqueta de corte centrada sobre una línea punteada horizontal. */
  const corte = (x: number, y: number, texto: string) => {
    lineaPunteada(x, y, x + W, y);
    fuente(6.3, "normal", GRIS);
    const t = ` ${texto} `;
    const ancho = doc.getTextWidth(t);
    doc.setFillColor(255, 255, 255);
    doc.rect(x + W / 2 - ancho / 2, y - 2, ancho, 3.6, "F");
    doc.text(t, x + W / 2, y + 0.9, { align: "center" });
  };

  // ---------- partes de la mitad ----------

  function encabezado(x: number, hoja: Hoja) {
    doc.setFillColor(...NAVY);
    doc.roundedRect(x, ARRIBA, W, 19, 2.5, 2.5, "F");
    doc.setFillColor(...ORO);
    doc.rect(x, ARRIBA + 19, W, 1.1, "F");
    if (logo) {
      doc.addImage(logo, "PNG", x + 5, ARRIBA + 5.6, 36, 36 * (157 / 800));
    } else {
      fuente(14, "bold", [255, 255, 255]);
      doc.text("FUNCA", x + 5, ARRIBA + 11.5);
    }
    fuente(12.5, "bold", [255, 255, 255]);
    doc.text("FÓRMULA MÉDICA", x + W - 5, ARRIBA + 9, { align: "right" });
    fuente(7, "normal", [254, 215, 120]);
    const sub = hoja.total > 1 ? `${nombreSimulacion}  —  hoja ${hoja.numero} de ${hoja.total}` : nombreSimulacion;
    doc.text(ajustar(sub, W - 52), x + W - 5, ARRIBA + 14.5, { align: "right" });
  }

  /** Datos del paciente; devuelve dónde termina. */
  function paciente(x: number, y: number, p: PacienteParaPDF) {
    const alto = 25;
    doc.setFillColor(...FONDO);
    doc.roundedRect(x, y, W, alto, 2.5, 2.5, "F");
    const xi = x + 5;
    const anchoUtil = W - 10;

    let anchoPildora = 0;
    if (p.alergias.length > 0) {
      fuente(6.5, "bold", ROJO);
      const t = ajustar(`ALERGIA: ${p.alergias.join(", ").toUpperCase()}`, 48);
      anchoPildora = doc.getTextWidth(t) + 5;
      doc.setFillColor(...FONDO_ROJO);
      doc.roundedRect(x + W - 5 - anchoPildora, y + 3.2, anchoPildora, 4.6, 2.3, 2.3, "F");
      doc.text(t, x + W - 5 - anchoPildora / 2, y + 6.3, { align: "center" });
    }

    fuente(6.3, "bold", GRIS);
    doc.text("PACIENTE", xi, y + 6);
    fuente(12.5, "bold", NAVY);
    doc.text(ajustar(p.nombre, anchoUtil - anchoPildora - 2), xi, y + 12);

    fuente(8, "normal", GRIS);
    const datos = [documentoDe(p), anios(p.edad)];
    if (p.categoriaAfiliado && REGIMEN[p.categoriaAfiliado]) datos.push(REGIMEN[p.categoriaAfiliado]);
    conPuntos(datos, xi, y + 17);

    const etiqueta = (t: string, valor: string, yy: number, color: RGB = TEXTO) => {
      fuente(7.6, "bold", GRIS);
      doc.text(t, xi, yy);
      const w = doc.getTextWidth(t) + 1.5;
      fuente(7.6, "normal", color);
      doc.text(ajustar(valor, anchoUtil - w), xi + w, yy);
    };
    if (p.diagnostico) etiqueta("Diagnóstico:", p.diagnostico, y + 22);
    else if (p.antecedentes) etiqueta("Antecedentes:", p.antecedentes, y + 22);
    return y + alto;
  }

  const FILA_NORMAL = 11;
  const FILA_MINIMA = 8.6;
  const ENCABEZADO_TABLA = 11;
  const FIRMA = 13;

  /** Tabla de medicamentos con su firma; las filas se compactan hasta FILA_MINIMA. */
  function medicamentos(x: number, y: number, limite: number, hoja: Hoja) {
    // "Rp/" y títulos de columna
    fuente(13, "bolditalic", AZUL);
    doc.text("Rp/", x + 3, y + 5);
    fuente(6.3, "bold", GRIS);
    const xCant = x + W - 40;
    doc.text("MEDICAMENTO", x + 15, y + 5);
    doc.text("CANT.", xCant, y + 5, { align: "center" });
    doc.text("VIGENTE HASTA", x + W - 3, y + 5, { align: "right" });
    doc.setDrawColor(...GRIS_SUAVE);
    doc.setLineWidth(0.25);
    doc.line(x, y + 7.5, x + W, y + 7.5);

    let yy = y + ENCABEZADO_TABLA - 2;
    const disponible = limite - yy - (hoja.numero === hoja.total ? FIRMA : 6);
    const fila = Math.max(FILA_MINIMA, Math.min(FILA_NORMAL, disponible / Math.max(1, hoja.recetas.length)));

    const primero = hoja.p.recetas.indexOf(hoja.recetas[0]); // numeración seguida entre hojas
    hoja.recetas.forEach((r, i) => {
      if (i % 2 === 0) {
        doc.setFillColor(248, 250, 253);
        doc.rect(x, yy, W, fila, "F");
      }
      const base = yy + fila / 2;
      fuente(6.5, "bold", GRIS_SUAVE);
      doc.text(String(primero + i + 1), x + 5, base + 1, { align: "center" });
      fuente(8.6, "bold", NAVY);
      doc.text(ajustar(r.medicamento.nombre, xCant - x - 26), x + 15, base - 0.6);
      fuente(6.6, "normal", GRIS);
      doc.text(ajustar(r.medicamento.presentacion, xCant - x - 26), x + 15, base + 3.1);
      fuente(11, "bold", NAVY);
      doc.text(String(r.cantidadAutorizada), xCant, base + 1.4, { align: "center" });
      fuente(8, "bold", TEXTO);
      doc.text(fechaCorta(r.fechaVigencia), x + W - 3, base - 0.6, { align: "right" });
      fuente(6.3, "normal", GRIS);
      doc.text(`emitida ${fechaCorta(r.fechaEmision)}`, x + W - 3, base + 3.1, { align: "right" });
      yy += fila;
    });
    doc.setDrawColor(...GRIS_SUAVE);
    doc.line(x, yy, x + W, yy);

    if (hoja.numero < hoja.total) {
      fuente(7, "italic", GRIS);
      doc.text("Continúa en la hoja siguiente.", x + W - 3, yy + 4.5, { align: "right" });
      return;
    }
    // Firma del médico (uno por fórmula)
    const medico = hoja.p.recetas[0]?.medico ?? "";
    const xf = x + W - 52;
    const yf = Math.min(yy + FIRMA - 3, limite - 1.5);
    doc.setDrawColor(...GRIS);
    doc.setLineWidth(0.2);
    doc.line(xf, yf - 3.6, x + W - 3, yf - 3.6);
    fuente(7.2, "bold", TEXTO);
    doc.text(medico, x + W - 3, yf - 0.6, { align: "right" });
    fuente(6, "normal", GRIS);
    doc.text("Firma y sello del médico", x + W - 3, yf + 2.2, { align: "right" });
  }

  /** Tarjeta tipo documento de identidad. */
  function tarjeta(
    x: number,
    y: number,
    w: number,
    h: number,
    titulo: string,
    nombre: string,
    lineas: string[],
    subtitulo = "REPÚBLICA DE COLOMBIA  —  PRÁCTICA"
  ) {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...GRIS_SUAVE);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, w, h, 2.2, 2.2, "FD");
    doc.setFillColor(...AZUL);
    doc.roundedRect(x, y, w, 6.5, 2.2, 2.2, "F");
    doc.rect(x, y + 3.5, w, 3, "F"); // esquinas de abajo rectas
    fuente(6.6, "bold", [255, 255, 255]);
    doc.text(ajustar(titulo.toUpperCase(), w - 5), x + 2.8, y + 4.4);
    fuente(6, "normal", GRIS);
    doc.text(ajustar(subtitulo, w - 5), x + 2.8, y + 10.2);
    fuente(8.6, "bold", NAVY);
    const lineasNombre = (doc.splitTextToSize(nombre, w - 5.6) as string[]).slice(0, 2);
    doc.text(lineasNombre, x + 2.8, y + 15);
    let yy = y + 15 + lineasNombre.length * 3.6 + 1;
    for (const l of lineas) {
      fuente(7.2, "normal", TEXTO);
      const partes = doc.splitTextToSize(l, w - 5.6) as string[];
      doc.text(partes, x + 2.8, yy);
      yy += partes.length * 3.1 + 0.6;
    }
  }

  const ALTO_DOCUMENTOS = 38;

  function documentos(x: number, y: number, p: PacienteParaPDF) {
    corte(x, y, "recorta: documentos de quien se presenta");
    const persona = quienSePresenta(p);
    const ty = y + 4;
    const h = ALTO_DOCUMENTOS - 5;
    // Hasta tres documentos en la fila: cédula, el del menor o la autorización, y la constancia.
    const dibujos: ((xx: number, w: number) => void)[] = [
      (xx, w) => tarjeta(xx, ty, w, h, "Cédula de ciudadanía", persona.nombre, [`CC ${persona.cedula}`]),
    ];

    if (esMenor(p)) {
      const relacion = (p.personaRecogeRelacion ?? "acudiente").replace(/^./, (c) => c.toUpperCase());
      dibujos.push((xx, w) =>
        tarjeta(xx, ty, w, h, NOMBRE_DOCUMENTO[p.tipoDocumento ?? "RC"] ?? "Documento", p.nombre, [
          `${documentoDe(p)}   (${anios(p.edad)})`,
          `${relacion}: ${persona.nombre}`,
        ])
      );
    } else if (p.tipoRecogida === "TERCERO_AUTORIZADO") {
      dibujos.push((xx, w) => {
        // Autorización escrita, con la copia del documento del paciente.
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...GRIS_SUAVE);
        doc.roundedRect(xx, ty, w, h, 2.2, 2.2, "FD");
        const xa = xx + 2.8;
        fuente(6.6, "bold", AZUL);
        doc.text("AUTORIZACIÓN", xa, ty + 4.6);
        fuente(6.7, "normal", TEXTO);
        const texto = `Yo, ${p.nombre}, ${documentoDe(p)}, autorizo a ${persona.nombre}, CC ${persona.cedula}, mi ${p.personaRecogeRelacion ?? "familiar"}, a reclamar mis medicamentos. Adjunto copia de mi documento.`;
        const lineas = (doc.splitTextToSize(texto, w - 5.6) as string[]).slice(0, 6);
        doc.text(lineas, xa, ty + 8.8);
        doc.setDrawColor(...GRIS);
        doc.setLineWidth(0.2);
        doc.line(xa, ty + h - 4.2, xa + Math.min(30, w - 6), ty + h - 4.2);
        fuente(6.5, "italic", GRIS);
        doc.text(`Firma: ${p.nombre.split(" ")[0]}`, xa, ty + h - 1.6);
      });
    }

    const anterior = reclamoAnterior(p);
    if (anterior) {
      dibujos.push((xx, w) =>
        tarjeta(
          xx,
          ty,
          w,
          h,
          "Constancia de pendiente",
          numeroConstancia(anterior.numero),
          [
            `${anterior.recetaElectronica.medicamento.nombre}: ${anterior.cantidad} unidades`,
            `Registrada ${new Date(anterior.creadoEn).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}. Plazo: 48 horas.`,
          ],
          "DISPENSARIO  —  RES. 1604 DE 2013"
        )
      );
    }

    const n = dibujos.length;
    const w = n === 1 ? (W - 4) / 2 : (W - 4 * (n - 1)) / n;
    dibujos.forEach((dibujar, i) => dibujar(x + i * (w + 4), w));
  }

  const ANCHO_TEXTO_PAPEL = W - 12;

  function altoPapel(p: PacienteParaPDF) {
    const { pasos } = papelDelEstudiante(p);
    fuente(7.3);
    const lineas = pasos.reduce((n, s) => n + (doc.splitTextToSize(s, ANCHO_TEXTO_PAPEL - 3) as string[]).length, 0);
    return 15.5 + lineas * 3.25 + pasos.length * 0.6;
  }

  /** `alto`: el del papel más alto de la página, para que las dos mitades terminen parejas. */
  function tuPapel(x: number, y: number, p: PacienteParaPDF, alto = altoPapel(p)) {
    corte(x, y, "recorta: tu papel (solo para ti, no lo muestres)");
    const { titulo, pasos } = papelDelEstudiante(p);
    const h = alto - 4;
    const top = y + 3.5;
    doc.setFillColor(...FONDO_ORO);
    doc.roundedRect(x, top, W, h, 2.2, 2.2, "F");
    doc.setFillColor(...ORO);
    doc.rect(x, top, 1.8, h, "F");
    fuente(6.3, "bold", [160, 110, 0]);
    doc.text(`TU PAPEL  —  ${quienSePresenta(p).nombre.toUpperCase()}`, x + 5, top + 4.6);
    fuente(9, "bold", NAVY);
    doc.text(ajustar(titulo, ANCHO_TEXTO_PAPEL), x + 5, top + 9.4);
    let yy = top + 13.6;
    for (const paso of pasos) {
      fuente(7.3, "normal", TEXTO);
      const lineas = doc.splitTextToSize(paso, ANCHO_TEXTO_PAPEL - 3) as string[];
      doc.setFillColor(...ORO);
      doc.circle(x + 6, yy - 1, 0.7, "F");
      doc.text(lineas, x + 8, yy);
      yy += lineas.length * 3.25 + 0.6;
    }
  }

  // ---------- reparto en mitades ----------

  /** Dónde empiezan las filas, y cuántas caben hasta `limite` con la altura mínima. */
  const INICIO_TABLA = ARRIBA + 24 + 25 + 4 + ENCABEZADO_TABLA - 2;
  const capacidad = (limite: number, conFirma: boolean) =>
    Math.max(1, Math.floor((limite - INICIO_TABLA - (conFirma ? FIRMA : 6)) / FILA_MINIMA));
  /** Altura que ocupan documentos + papel al pie, para un papel de alto dado. */
  const altoPie = (alto: number) => 2 + ALTO_DOCUMENTOS + 2 + alto + 3;

  const hojas: Hoja[] = [];
  for (const p of pacientes) {
    if (p.recetas.length <= capacidad(PIE - altoPie(altoPapel(p)), true)) {
      hojas.push({ p, recetas: p.recetas, numero: 1, total: 1, conDocumentos: true });
      continue;
    }
    // No cabe con los documentos debajo: la fórmula va sola (en una o varias mitades) y los
    // documentos y el papel, en la mitad siguiente.
    const porHoja = capacidad(PIE - 4, true);
    const partes: PacienteParaPDF["recetas"][] = [];
    for (let k = 0; k < p.recetas.length; k += porHoja) partes.push(p.recetas.slice(k, k + porHoja));
    partes.forEach((recetas, n) => hojas.push({ p, recetas, numero: n + 1, total: partes.length, conDocumentos: false }));
    hojas.push({ p, recetas: [], numero: partes.length, total: partes.length, conDocumentos: true });
  }

  /** Mitad con solo documentos y papel: encabezado corto y todo arriba. */
  function hojaDocumentos(h: Hoja, x: number) {
    doc.setFillColor(...NAVY);
    doc.roundedRect(x, ARRIBA, W, 13, 2.5, 2.5, "F");
    if (logo) doc.addImage(logo, "PNG", x + 5, ARRIBA + 3.4, 31, 31 * (157 / 800));
    fuente(9.5, "bold", [255, 255, 255]);
    doc.text("DOCUMENTOS Y PAPEL", x + W - 5, ARRIBA + 6.4, { align: "right" });
    fuente(6.6, "normal", [254, 215, 120]);
    doc.text(ajustar(`Van con la fórmula de ${h.p.nombre}`, W - 46), x + W - 5, ARRIBA + 10.4, { align: "right" });
    documentos(x, ARRIBA + 19, h.p);
    tuPapel(x, ARRIBA + 19 + ALTO_DOCUMENTOS + 2, h.p);
  }

  /** `altoPapelPagina`: el papel más alto de la página, para alinear las dos mitades. */
  function dibujarHoja(h: Hoja, x: number, altoPapelPagina: number) {
    if (h.recetas.length === 0) hojaDocumentos(h, x);
    else {
      encabezado(x, h);
      const finPaciente = paciente(x, ARRIBA + 24, h.p);
      const tope = h.conDocumentos ? PIE - altoPie(altoPapelPagina) : PIE - 4;
      medicamentos(x, finPaciente + 4, tope, { ...h, numero: h.numero, total: h.total });
      if (h.conDocumentos) {
        const yDocs = tope + 2;
        documentos(x, yDocs, h.p);
        tuPapel(x, yDocs + ALTO_DOCUMENTOS + 2, h.p, altoPapelPagina);
      }
    }
    fuente(6, "normal", GRIS);
    doc.text("Material de práctica — FUNCA Prácticas. No es una fórmula médica real.", x + W / 2, PIE, { align: "center" });
  }

  for (let i = 0; i < hojas.length; i += 2) {
    if (i > 0) doc.addPage();
    const par = hojas.slice(i, i + 2);
    // Alinea documentos y papel entre las dos mitades, si con eso la fórmula sigue cabiendo.
    const comun = Math.max(...par.filter((h) => h.conDocumentos && h.recetas.length > 0).map((h) => altoPapel(h.p)), 0);
    par.forEach((h, k) => {
      const propio = altoPapel(h.p);
      const alineado = h.recetas.length <= capacidad(PIE - altoPie(comun), true) ? Math.max(comun, propio) : propio;
      dibujarHoja(h, MARGEN + k * (W + CENTRO), alineado);
    });
    if (par.length === 2) lineaPunteada(ANCHO_PAG / 2, 4, ANCHO_PAG / 2, ALTO - 4);
  }

  if (params.devolver) return doc;
  doc.save(`recetas-${nombreSimulacion.trim().toLowerCase().replace(/\s+/g, "-")}.pdf`);
}
