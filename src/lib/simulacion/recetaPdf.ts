/**
 * PDF imprimible de las recetas generadas de una Simulación, para que el profesor las
 * reparta como "fórmula física" que cada estudiante-paciente lleva a la ventanilla. No
 * representa un documento médico real — es material de práctica.
 *
 * Carta horizontal, dos fórmulas por página (una a cada lado, con una línea punteada para
 * recortar) — ahorra papel. Cada mitad lleva su propio encabezado porque, una vez recortada,
 * queda como un papel independiente. Si el número de pacientes es impar, la última página
 * solo llena el lado izquierdo — no hay problema, se recorta igual.
 *
 * Debajo de cada fórmula van los documentos que presenta el estudiante que la lleva (su
 * cédula de práctica y, según el caso, el documento del menor o la autorización escrita).
 * Las páginas salen en el orden de los estudiantes, para repartirlas por nombre.
 */
import { jsPDF } from "jspdf";
import { definicionSituacion } from "./situaciones";

const AZUL: [number, number, number] = [27, 58, 107];
const GRIS: [number, number, number] = [100, 116, 139];
const GRIS_CLARO: [number, number, number] = [226, 232, 240];
const ROJO: [number, number, number] = [200, 60, 60];

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

function fechaCorta(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

export type PacienteParaPDF = {
  nombre: string;
  cedula: string;
  /** CC | TI | RC (ver generador.ts). */
  tipoDocumento?: string;
  edad: number;
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
  // Para la hoja de indicaciones de quien interpreta al paciente (jornada presencial).
  situaciones?: string[];
  tipoRecogida?: "EL_MISMO" | "TERCERO_AUTORIZADO" | "SUPLANTACION";
  personaRecogeNombre?: string | null;
  personaRecogeCedula?: string | null;
  personaRecogeRelacion?: string | null;
};

const NOMBRE_DOCUMENTO: Record<string, string> = {
  CC: "Cédula de ciudadanía",
  TI: "Tarjeta de identidad",
  RC: "Registro civil de nacimiento",
};

const documentoDe = (p: PacienteParaPDF) => `${p.tipoDocumento ?? "CC"} ${p.cedula}`;

/** El estudiante que lleva este caso a la ventanilla: el paciente mismo o quien reclama por él. */
export function quienSePresenta(p: PacienteParaPDF): { nombre: string; cedula: string } {
  return p.tipoRecogida && p.tipoRecogida !== "EL_MISMO" && p.personaRecogeNombre
    ? { nombre: p.personaRecogeNombre, cedula: p.personaRecogeCedula ?? "-" }
    : { nombre: p.nombre, cedula: p.cedula };
}

/** "la madre", "el padre", "el/la acudiente". */
const conArticulo = (relacion: string) =>
  relacion === "madre" ? "la madre" : relacion === "padre" ? "el padre" : `el/la ${relacion}`;

const esMenor = (p: PacienteParaPDF) => p.situaciones?.includes("MENOR_DE_EDAD") ?? false;

/** Qué debe hacer el estudiante que lleva este caso (vacío = presentarse normal, como él mismo). */
export function indicacionesActor(p: PacienteParaPDF): string[] {
  const lineas: string[] = [];
  if (esMenor(p)) {
    lineas.push(
      `Eres ${conArticulo(p.personaRecogeRelacion ?? "acudiente")} de ${p.nombre}, de ${p.edad} ${p.edad === 1 ? "año" : "años"}, y vienes a reclamar sus medicamentos. Presenta tu cédula y su ${(NOMBRE_DOCUMENTO[p.tipoDocumento ?? "CC"] ?? "documento").toLowerCase()}.`
    );
  } else if (p.tipoRecogida === "SUPLANTACION") {
    lineas.push(
      `Llevas la fórmula de tu familiar ${p.nombre}, pero no tienes su autorización. Di que tú eres ${p.nombre}. Si te piden el documento, muestra tu cédula: es la única que tienes.`
    );
  } else if (p.tipoRecogida === "TERCERO_AUTORIZADO") {
    lineas.push(
      `Reclamas por ${p.nombre}; eres su ${p.personaRecogeRelacion ?? "familiar"}. Presenta tu cédula, la autorización firmada y la copia de su documento.`
    );
  }
  for (const c of p.situaciones ?? []) {
    const ind = definicionSituacion(c)?.indicacionActor;
    if (ind) lineas.push(ind);
  }
  return lineas;
}

export async function generarRecetasPDF(params: { nombreSimulacion: string; pacientes: PacienteParaPDF[] }) {
  const { nombreSimulacion, pacientes } = params;
  const doc = new jsPDF({ unit: "mm", format: "letter", orientation: "landscape" });
  const anchoPagina = doc.internal.pageSize.getWidth();
  const altoPagina = doc.internal.pageSize.getHeight();

  const margenExterior = 12;
  const separacion = 8; // hueco central donde va la línea de corte
  const anchoColumna = (anchoPagina - margenExterior * 2 - separacion) / 2;
  const margenSuperior = 10;

  let logoDataUrl: string | null = null;
  try {
    logoDataUrl = await cargarImagenComoDataURL("/funca-logo.png");
  } catch {
    // sin logo, seguimos igual
  }

  function lineaDeCorte() {
    doc.setDrawColor(...GRIS_CLARO);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(anchoPagina / 2, 4, anchoPagina / 2, altoPagina - 4);
    doc.setLineDashPattern([], 0);
  }

  function dibujarFormula(p: PacienteParaPDF, x0: number) {
    const ancho = anchoColumna;
    let y = margenSuperior;

    // Encabezado — cada mitad lo lleva propio: al recortar, queda un papel completo.
    doc.setFillColor(...AZUL);
    doc.rect(x0, y, ancho, 18, "F");
    if (logoDataUrl) doc.addImage(logoDataUrl, "PNG", x0 + 4, y + 3, 22, 11);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text("Fórmula médica — material de práctica", x0 + ancho - 4, y + 7, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Simulación: ${nombreSimulacion}`, x0 + ancho - 4, y + 13, { align: "right" });

    y += 25;

    // Datos del paciente
    doc.setDrawColor(...GRIS_CLARO);
    doc.roundedRect(x0, y, ancho, 22, 2, 2, "D");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    doc.setTextColor(...AZUL);
    doc.text(p.nombre, x0 + 4, y + 7.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...GRIS);
    doc.text(`${documentoDe(p)}  -  ${p.edad} ${p.edad === 1 ? "año" : "años"}${p.diagnostico ? `  -  ${p.diagnostico}` : ""}`, x0 + 4, y + 13.5);
    if (p.alergias.length > 0) {
      doc.setTextColor(...ROJO);
      doc.text(`Alergias: ${p.alergias.join(", ")}`, x0 + 4, y + 19);
    } else if (p.antecedentes) {
      doc.setTextColor(...GRIS);
      doc.text(p.antecedentes, x0 + 4, y + 19);
    }

    y += 28;

    for (const r of p.recetas) {
      if (y > altoPagina - 18) break; // no debería pasar con 1-3 renglones, pero por si acaso no se sale de la página

      doc.setDrawColor(...GRIS_CLARO);
      doc.setFillColor(250, 250, 252);
      doc.roundedRect(x0, y, ancho, 20, 2, 2, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...AZUL);
      doc.text(r.medicamento.nombre, x0 + 4, y + 6.5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...GRIS);
      doc.text(r.medicamento.presentacion, x0 + 4, y + 11.5);
      doc.text(`Autorizado: ${r.cantidadAutorizada}`, x0 + 4, y + 16.5);

      doc.text(`${r.medico}`, x0 + ancho - 4, y + 6.5, { align: "right" });
      doc.text(`Emitida: ${fechaCorta(r.fechaEmision)}`, x0 + ancho - 4, y + 11.5, { align: "right" });
      doc.text(`Vigente: ${fechaCorta(r.fechaVigencia)}`, x0 + ancho - 4, y + 16.5, { align: "right" });

      y += 24;
    }

    dibujarDocumentos(p, x0, ancho, Math.max(y + 4, 140));

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...GRIS);
    doc.text("Documento de práctica — FUNCA Prácticas. No es una fórmula médica real.", x0 + ancho / 2, altoPagina - 6, {
      align: "center",
    });
  }

  /** Una tarjeta de documento: título, nombre y líneas de datos. */
  function tarjetaDocumento(x: number, y: number, w: number, h: number, titulo: string, lineas: string[]) {
    doc.setDrawColor(...AZUL);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, w, h, 2, 2, "S");
    doc.setFillColor(...AZUL);
    doc.rect(x, y, w, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text(titulo, x + 2.5, y + 4.2);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    let yy = y + 11;
    for (const l of lineas) {
      const partes = doc.splitTextToSize(l, w - 5) as string[];
      doc.setFontSize(7.5);
      doc.text(partes, x + 2.5, yy);
      yy += partes.length * 3.4 + 0.8;
    }
  }

  /** Lo que presenta en la ventanilla quien lleva la fórmula, para recortar aparte. */
  function dibujarDocumentos(p: PacienteParaPDF, x0: number, ancho: number, y: number) {
    doc.setDrawColor(...GRIS_CLARO);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(x0, y, x0 + ancho, y);
    doc.setLineDashPattern([], 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...GRIS);
    doc.text("Documentos que presenta quien lleva la fórmula (recortar por la línea)", x0, y + 4);

    const persona = quienSePresenta(p);
    const alto = 38;
    const w = (ancho - 4) / 2;
    const yTarjeta = y + 7;
    tarjetaDocumento(x0, yTarjeta, w, alto, "Cédula de ciudadanía (práctica)", [persona.nombre, `CC ${persona.cedula}`]);

    if (esMenor(p)) {
      const relacion = (p.personaRecogeRelacion ?? "acudiente").replace(/^./, (c) => c.toUpperCase());
      tarjetaDocumento(x0 + w + 4, yTarjeta, w, alto, `${NOMBRE_DOCUMENTO[p.tipoDocumento ?? "RC"] ?? "Documento"} (práctica)`, [
        p.nombre,
        documentoDe(p),
        `${p.edad} ${p.edad === 1 ? "año" : "años"}`,
        `${relacion}: ${persona.nombre}`,
      ]);
    } else if (p.tipoRecogida === "TERCERO_AUTORIZADO") {
      tarjetaDocumento(x0 + w + 4, yTarjeta, w, alto, "Autorización", [
        `Yo, ${p.nombre}, ${documentoDe(p)}, autorizo a ${persona.nombre}, CC ${persona.cedula}, mi ${p.personaRecogeRelacion ?? "familiar"}, a reclamar mis medicamentos.`,
        "Firma: ________________",
        `Adjunta copia de mi documento: ${documentoDe(p)}`,
      ]);
    }
  }

  const xIzquierda = margenExterior;
  const xDerecha = margenExterior + anchoColumna + separacion;

  for (let i = 0; i < pacientes.length; i += 2) {
    if (i > 0) doc.addPage();
    dibujarFormula(pacientes[i], xIzquierda);
    const segundo = pacientes[i + 1];
    if (segundo) {
      dibujarFormula(segundo, xDerecha);
      lineaDeCorte(); // solo si de verdad hay dos — con una sola no hace falta recortar
    }
  }

  // Hoja aparte, para entregar en privado a quienes interpretan a los pacientes: no va con la
  // fórmula, porque el estudiante que atiende no debe verla.
  const conIndicaciones = pacientes.map((p) => ({ p, lineas: indicacionesActor(p) })).filter((x) => x.lineas.length > 0);
  if (conIndicaciones.length > 0) {
    doc.addPage();
    let y = margenExterior + 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...AZUL);
    doc.text("Indicaciones para quienes interpretan a los pacientes", margenExterior, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...GRIS);
    doc.text("Recorta y entrega cada indicación en privado al estudiante que se nombra. Quien atiende no debe verla.", margenExterior, y + 6);
    y += 14;
    const anchoCaja = anchoPagina - margenExterior * 2;
    for (const { p, lineas } of conIndicaciones) {
      const texto = lineas.flatMap((l) => doc.splitTextToSize(`- ${l}`, anchoCaja - 8) as string[]);
      const alto = 9 + texto.length * 4.2;
      if (y + alto > altoPagina - 12) {
        doc.addPage();
        y = margenExterior + 4;
      }
      doc.setDrawColor(...GRIS_CLARO);
      doc.roundedRect(margenExterior, y, anchoCaja, alto, 2, 2, "S");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...AZUL);
      doc.text(`Para ${quienSePresenta(p).nombre}`, margenExterior + 4, y + 6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(40, 40, 40);
      doc.text(texto, margenExterior + 4, y + 11);
      y += alto + 4;
    }
  }

  const nombreArchivo = `recetas-${nombreSimulacion.trim().toLowerCase().replace(/\s+/g, "-")}.pdf`;
  doc.save(nombreArchivo);
}
