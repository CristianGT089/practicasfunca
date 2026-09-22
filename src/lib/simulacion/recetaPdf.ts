/**
 * PDF imprimible de las recetas generadas de una Simulación, para que el profesor las
 * reparta como "fórmula física" que cada estudiante-paciente lleva a la ventanilla. No
 * representa un documento médico real — es material de práctica.
 *
 * Carta horizontal, dos fórmulas por página (una a cada lado, con una línea punteada para
 * recortar) — ahorra papel. Cada mitad lleva su propio encabezado porque, una vez recortada,
 * queda como un papel independiente. Si el número de pacientes es impar, la última página
 * solo llena el lado izquierdo — no hay problema, se recorta igual.
 */
import { jsPDF } from "jspdf";

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
};

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
    doc.text(`CC ${p.cedula}  -  ${p.edad} años${p.diagnostico ? `  -  ${p.diagnostico}` : ""}`, x0 + 4, y + 13.5);
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

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...GRIS);
    doc.text("Documento de práctica — FUNCA Prácticas. No es una fórmula médica real.", x0 + ancho / 2, altoPagina - 6, {
      align: "center",
    });
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

  const nombreArchivo = `recetas-${nombreSimulacion.trim().toLowerCase().replace(/\s+/g, "-")}.pdf`;
  doc.save(nombreArchivo);
}
