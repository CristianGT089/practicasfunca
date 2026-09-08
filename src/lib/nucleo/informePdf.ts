import { jsPDF } from "jspdf";

const AZUL: [number, number, number] = [27, 58, 107];
const DORADO: [number, number, number] = [196, 154, 22];
const VERDE: [number, number, number] = [16, 150, 100];
const ROJO: [number, number, number] = [200, 60, 60];
const GRIS: [number, number, number] = [100, 116, 139];
const GRIS_CLARO: [number, number, number] = [226, 232, 240];

export type IntentoInforme = {
  escenarioTitulo: string;
  puntajeFinal: number | null;
  puntajeProceso: number | null;
  puntajeResultado: number | null;
  finalizadoEn: string | null;
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

function colorPorPuntaje(p: number): [number, number, number] {
  if (p >= 70) return VERDE;
  if (p >= 40) return DORADO;
  return ROJO;
}

export async function generarInformePDF(params: {
  nombre: string;
  usuario: string;
  completados: number;
  totalEscenarios: number;
  promedio: number | null;
  intentos: IntentoInforme[];
}) {
  const { nombre, usuario, completados, totalEscenarios, promedio, intentos } = params;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const anchoPagina = doc.internal.pageSize.getWidth();
  const margen = 18;
  let y = 0;

  // ---------- Encabezado ----------
  doc.setFillColor(...AZUL);
  doc.rect(0, 0, anchoPagina, 32, "F");

  try {
    const logoDataUrl = await cargarImagenComoDataURL("/funca-logo.png");
    doc.addImage(logoDataUrl, "PNG", margen, 7, 32, 16);
  } catch {
    // si el logo no carga, seguimos sin bloquear el informe
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Informe de progreso", anchoPagina - margen, 14, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("FUNCA Prácticas — Auxiliar en Farmacia", anchoPagina - margen, 20, { align: "right" });
  doc.text(new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" }), anchoPagina - margen, 25, {
    align: "right",
  });

  y = 44;

  // ---------- Datos del estudiante ----------
  doc.setTextColor(...AZUL);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(nombre, margen, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...GRIS);
  doc.text(`Usuario: ${usuario}`, margen, y + 6);

  y += 18;

  // ---------- Tarjetas resumen ----------
  const porcentaje = totalEscenarios > 0 ? Math.round((completados / totalEscenarios) * 100) : 0;
  const anchoTarjeta = (anchoPagina - margen * 2 - 10) / 2;

  function tarjeta(x: number, titulo: string, valor: string, color: [number, number, number]) {
    doc.setDrawColor(...GRIS_CLARO);
    doc.setFillColor(250, 250, 252);
    doc.roundedRect(x, y, anchoTarjeta, 22, 2, 2, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...GRIS);
    doc.text(titulo, x + 5, y + 8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...color);
    doc.text(valor, x + 5, y + 17);
  }

  tarjeta(margen, "Progreso del curso", `${completados}/${totalEscenarios} casos (${porcentaje}%)`, AZUL);
  tarjeta(
    margen + anchoTarjeta + 10,
    "Promedio general",
    promedio !== null ? `${promedio}/100` : "Sin datos",
    promedio !== null ? colorPorPuntaje(promedio) : GRIS
  );

  y += 30;

  // ---------- Barra de progreso general ----------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...AZUL);
  doc.text("Avance sobre el total de casos", margen, y);
  y += 4;

  const anchoBarra = anchoPagina - margen * 2;
  doc.setFillColor(...GRIS_CLARO);
  doc.roundedRect(margen, y, anchoBarra, 5, 2, 2, "F");
  doc.setFillColor(...DORADO);
  doc.roundedRect(margen, y, (anchoBarra * porcentaje) / 100, 5, 2, 2, "F");

  y += 14;

  // ---------- Detalle por caso ----------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...AZUL);
  doc.text("Resultados por caso práctico", margen, y);
  y += 7;

  if (intentos.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...GRIS);
    doc.text("Aún no ha completado ningún caso.", margen, y);
    y += 8;
  }

  const anchoBarraCaso = 60;
  for (const intento of intentos) {
    if (y > 265) {
      doc.addPage();
      y = 20;
    }
    const puntaje = intento.puntajeFinal ?? 0;
    const color = colorPorPuntaje(puntaje);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(40, 40, 40);
    const tituloRecortado =
      intento.escenarioTitulo.length > 48 ? intento.escenarioTitulo.slice(0, 45) + "…" : intento.escenarioTitulo;
    doc.text(tituloRecortado, margen, y);

    const xBarra = anchoPagina - margen - anchoBarraCaso - 14;
    doc.setFillColor(...GRIS_CLARO);
    doc.roundedRect(xBarra, y - 3.5, anchoBarraCaso, 4, 1.5, 1.5, "F");
    doc.setFillColor(...color);
    doc.roundedRect(xBarra, y - 3.5, (anchoBarraCaso * puntaje) / 100, 4, 1.5, 1.5, "F");

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...color);
    doc.text(`${puntaje}/100`, anchoPagina - margen, y, { align: "right" });

    y += 9;
  }

  // ---------- Pie de página ----------
  const totalPaginas = doc.getNumberOfPages();
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GRIS);
    doc.text(
      "Generado automáticamente por FUNCA Prácticas",
      anchoPagina / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  const nombreArchivo = `informe-${usuario}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(nombreArchivo);
}
