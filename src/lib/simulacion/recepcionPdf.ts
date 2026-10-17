/**
 * PDF de la jornada de recepción técnica: una hoja carta por pedido, para el estudiante que
 * hace de transportador del proveedor. Trae:
 *  1. La factura del proveedor (lo que se entrega en recepción).
 *  2. Las etiquetas de las cajas, para recortar: lo que el receptor inspecciona (lote,
 *     vencimiento, registro INVIMA, contenido, temperatura del transporte, estado del empaque).
 *  3. "Tu papel": cómo actuar. Solo para el transportador.
 * Material de práctica: los proveedores son ficticios.
 */
import { jsPDF } from "jspdf";
import { definicionSituacion } from "./situaciones";

type RGB = [number, number, number];
const NAVY: RGB = [30, 46, 85];
const AZUL: RGB = [38, 62, 128];
const ORO: RGB = [251, 186, 0];
const FONDO: RGB = [238, 242, 251];
const FONDO_ORO: RGB = [255, 248, 224];
const TEXTO: RGB = [33, 41, 54];
const GRIS: RGB = [100, 116, 139];
const GRIS_SUAVE: RGB = [203, 213, 225];
const ROJO: RGB = [190, 40, 40];
const CIELO: RGB = [224, 242, 254];

export type PedidoParaPDF = {
  factura: string;
  ordenCompra: string;
  proveedor: string;
  nitProveedor: string;
  transportador: string;
  situaciones: string[];
  items: {
    nombre: string;
    presentacion: string;
    laboratorio: string | null;
    requiereFrio: boolean;
    cantidadFacturada: number;
    loteFacturado: string;
    vencimientoFacturado: string;
    cantidadLlega: number;
    loteReal: string;
    vencimientoReal: string;
    registroEtiqueta: string | null;
    temperaturaLlegada: number | null;
    empaqueIntegro: boolean;
  }[];
};

const mesAnio = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
};

function cargarImagen(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("sin canvas"));
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export async function generarRecepcionPDF(params: {
  nombreJornada: string;
  pedidos: PedidoParaPDF[];
  logoDataUrl?: string | null;
  devolver?: boolean;
}) {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const ANCHO = doc.internal.pageSize.getWidth();
  const ALTO = doc.internal.pageSize.getHeight();
  const M = 12;
  const W = ANCHO - M * 2;
  const PIE = ALTO - 6;

  let logo = params.logoDataUrl ?? null;
  if (logo === null && params.logoDataUrl === undefined) {
    try {
      logo = await cargarImagen("/funca-logo-blanco.png");
    } catch {
      // sin logo
    }
  }

  const fuente = (tam: number, estilo: "normal" | "bold" | "italic" = "normal", color: RGB = TEXTO) => {
    doc.setFont("helvetica", estilo);
    doc.setFontSize(tam);
    doc.setTextColor(...color);
  };
  const ajustar = (t: string, ancho: number) => {
    if (doc.getTextWidth(t) <= ancho) return t;
    let s = t;
    while (s.length > 1 && doc.getTextWidth(`${s}…`) > ancho) s = s.slice(0, -1);
    return `${s.trimEnd()}…`;
  };
  const corte = (y: number, texto: string) => {
    doc.setDrawColor(...GRIS_SUAVE);
    doc.setLineWidth(0.3);
    doc.setLineDashPattern([1.6, 1.4], 0);
    doc.line(M, y, M + W, y);
    doc.setLineDashPattern([], 0);
    fuente(6.5, "normal", GRIS);
    const t = ` ${texto} `;
    const a = doc.getTextWidth(t);
    doc.setFillColor(255, 255, 255);
    doc.rect(ANCHO / 2 - a / 2, y - 2, a, 3.6, "F");
    doc.text(t, ANCHO / 2, y + 0.9, { align: "center" });
  };
  const pie = () => {
    fuente(6.3, "normal", GRIS);
    doc.text("Material de práctica — FUNCA Prácticas. Proveedores y facturas ficticios.", ANCHO / 2, PIE, { align: "center" });
  };

  function factura(p: PedidoParaPDF) {
    // Encabezado
    doc.setFillColor(...NAVY);
    doc.roundedRect(M, 10, W, 20, 2.5, 2.5, "F");
    doc.setFillColor(...ORO);
    doc.rect(M, 30, W, 1.1, "F");
    if (logo) doc.addImage(logo, "PNG", M + 5, 16, 38, 38 * (157 / 800));
    fuente(13, "bold", [255, 255, 255]);
    doc.text("FACTURA ELECTRÓNICA DE VENTA", M + W - 5, 18.5, { align: "right" });
    fuente(8, "normal", [254, 215, 120]);
    doc.text(`N.° ${p.factura}   —   ${params.nombreJornada}`, M + W - 5, 24.5, { align: "right" });

    // Proveedor y cliente
    let y = 36;
    doc.setFillColor(...FONDO);
    doc.roundedRect(M, y, W, 22, 2.5, 2.5, "F");
    fuente(6.3, "bold", GRIS);
    doc.text("PROVEEDOR", M + 5, y + 5.5);
    doc.text("CLIENTE", M + W / 2 + 3, y + 5.5);
    fuente(10.5, "bold", NAVY);
    doc.text(ajustar(p.proveedor, W / 2 - 10), M + 5, y + 11);
    doc.text("Servicio farmacéutico FUNCA", M + W / 2 + 3, y + 11);
    fuente(7.8, "normal", GRIS);
    doc.text(`NIT ${p.nitProveedor}`, M + 5, y + 16);
    doc.text(`Orden de compra ${p.ordenCompra}`, M + W / 2 + 3, y + 16);
    doc.text(ajustar(`Transporta: ${p.transportador}`, W / 2 - 10), M + 5, y + 20);
    doc.text(`Fecha: ${new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })}`, M + W / 2 + 3, y + 20);

    // Tabla
    y += 28;
    const col = { n: M + 3, prod: M + 10, lote: M + W - 72, vence: M + W - 40, cant: M + W - 4 };
    fuente(6.5, "bold", GRIS);
    doc.text("#", col.n, y);
    doc.text("PRODUCTO", col.prod, y);
    doc.text("LOTE", col.lote, y);
    doc.text("VENCE", col.vence, y);
    doc.text("CANTIDAD", col.cant, y, { align: "right" });
    doc.setDrawColor(...GRIS_SUAVE);
    doc.setLineWidth(0.25);
    doc.line(M, y + 2, M + W, y + 2);
    y += 2;
    p.items.forEach((it, i) => {
      const h = 8.4;
      if (i % 2 === 0) {
        doc.setFillColor(248, 250, 253);
        doc.rect(M, y, W, h, "F");
      }
      fuente(7, "normal", GRIS);
      doc.text(String(i + 1), col.n, y + 5.6);
      fuente(8.2, "bold", NAVY);
      doc.text(ajustar(it.nombre, col.lote - col.prod - 4), col.prod, y + 4);
      fuente(6.5, "normal", GRIS);
      doc.text(ajustar(it.presentacion, col.lote - col.prod - 4), col.prod, y + 7);
      fuente(8, "normal", TEXTO);
      doc.text(it.loteFacturado, col.lote, y + 5.6);
      doc.text(mesAnio(it.vencimientoFacturado), col.vence, y + 5.6);
      fuente(9, "bold", NAVY);
      doc.text(String(it.cantidadFacturada), col.cant, y + 5.8, { align: "right" });
      y += h;
    });
    doc.line(M, y, M + W, y);
    return y + 4;
  }

  /** La etiqueta de una caja: lo que el receptor puede ver al inspeccionarla. */
  function etiqueta(x: number, y: number, w: number, h: number, it: PedidoParaPDF["items"][number], n: number) {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...GRIS_SUAVE);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, w, h, 2.2, 2.2, "FD");
    doc.setFillColor(...(it.requiereFrio ? ([14, 116, 144] as RGB) : AZUL));
    doc.roundedRect(x, y, w, 6.2, 2.2, 2.2, "F");
    doc.rect(x, y + 3.2, w, 3, "F");
    fuente(6.6, "bold", [255, 255, 255]);
    doc.text(`CAJA ${n}`, x + 2.8, y + 4.3);
    if (it.laboratorio) doc.text(ajustar(it.laboratorio.toUpperCase(), w - 22), x + w - 2.8, y + 4.3, { align: "right" });

    fuente(8.6, "bold", NAVY);
    doc.text(ajustar(it.nombre, w - 5.6), x + 2.8, y + 11);
    fuente(6.6, "normal", GRIS);
    doc.text(ajustar(it.presentacion, w - 5.6), x + 2.8, y + 14.4);

    fuente(7, "normal", TEXTO);
    const lineas = [
      `Lote: ${it.loteReal}`,
      `Vence: ${mesAnio(it.vencimientoReal)}`,
      it.registroEtiqueta ? `Reg. San. ${it.registroEtiqueta}` : "",
      `Contenido: ${it.cantidadLlega} unidades`,
    ].filter(Boolean);
    lineas.forEach((l, i) => doc.text(ajustar(l, w - 5.6), x + 2.8, y + 19 + i * 3.4));

    if (it.requiereFrio) {
      // Debajo de los datos: la etiqueta de conservación y el registro del termómetro.
      const yf = y + 19 + lineas.length * 3.4 - 1;
      doc.setFillColor(...CIELO);
      doc.roundedRect(x + 2, yf, w - 4, 8, 1.5, 1.5, "F");
      fuente(6.3, "bold", [14, 116, 144]);
      doc.text("Conservar entre 2 °C y 8 °C", x + 4, yf + 3.3);
      fuente(6.3, "normal", TEXTO);
      doc.text(`Registro del transporte: ${String(it.temperaturaLlegada ?? "").replace(".", ",")} °C`, x + 4, yf + 6.6);
    }
    if (!it.empaqueIntegro) {
      // Debajo de los datos: la caja llega rota y húmeda (lo que se ve al recibirla).
      const ys = y + 19 + lineas.length * 3.4 - 1;
      doc.setDrawColor(...ROJO);
      doc.setLineWidth(0.6);
      doc.roundedRect(x + 2, ys, w - 4, 7, 1.5, 1.5, "S");
      fuente(6.6, "bold", ROJO);
      doc.text("CAJA ROTA Y HÚMEDA", x + w / 2, ys + 4.7, { align: "center" });
    }
  }

  function papel(p: PedidoParaPDF) {
    const pasos = [
      `Eres el transportador de ${p.proveedor.replace(/\.$/, "")}. Lleva a recepción la factura ${p.factura} y las cajas (las etiquetas recortadas).`,
      "Entrega la factura y muestra cada caja cuando te la pidan. Responde solo lo que te pregunten.",
      "Si te rechazan productos, llévatelos de vuelta (devolución al proveedor) y pide que quede en el acta.",
      ...p.situaciones.map((c) => definicionSituacion(c)?.indicacionActor).filter((x): x is string => Boolean(x)),
    ];
    fuente(7.6);
    const lineas = pasos.map((s) => doc.splitTextToSize(s, W - 16) as string[]);
    const h = 13 + lineas.reduce((n, l) => n + l.length * 3.4 + 0.8, 0);
    return {
      alto: h + 4,
      dibujar(y: number) {
        corte(y, "recorta: tu papel (solo para ti)");
        const top = y + 3.5;
        doc.setFillColor(...FONDO_ORO);
        doc.roundedRect(M, top, W, h, 2.2, 2.2, "F");
        doc.setFillColor(...ORO);
        doc.rect(M, top, 1.8, h, "F");
        fuente(6.4, "bold", [160, 110, 0]);
        doc.text(`TU PAPEL  —  ${p.transportador.toUpperCase()}`, M + 5, top + 4.8);
        fuente(9, "bold", NAVY);
        doc.text("Llevas un pedido del proveedor a recepción.", M + 5, top + 9.6);
        let yy = top + 13.8;
        for (const l of lineas) {
          doc.setFillColor(...ORO);
          doc.circle(M + 6, yy - 1, 0.7, "F");
          fuente(7.6, "normal", TEXTO);
          doc.text(l, M + 8, yy);
          yy += l.length * 3.4 + 0.8;
        }
      },
    };
  }

  params.pedidos.forEach((p, idx) => {
    if (idx > 0) doc.addPage();
    let y = factura(p);
    const tuPapel = papel(p);

    // Etiquetas en tres columnas; la fila de un refrigerado es más alta. Si no caben, siguen
    // en otra hoja; "Tu papel" va al pie si cabe y, si no, en la hoja siguiente.
    const COLS = 3;
    const w = (W - 4 * (COLS - 1)) / COLS;
    corte(y + 2, "recorta: etiquetas de las cajas (las muestras al entregar)");
    y += 6;
    for (let i = 0; i < p.items.length; i += COLS) {
      const fila = p.items.slice(i, i + COLS);
      const alto = fila.some((it) => it.requiereFrio || !it.empaqueIntegro) ? 43 : 35;
      if (y + alto > PIE - 3) {
        pie();
        doc.addPage();
        y = 12;
        corte(y, `etiquetas de las cajas (sigue) — factura ${p.factura}`);
        y += 4;
      }
      fila.forEach((it, k) => etiqueta(M + k * (w + 4), y, w, alto - 3, it, i + k + 1));
      y += alto;
    }
    if (y + tuPapel.alto > PIE - 3) {
      pie();
      doc.addPage();
      y = 12;
    }
    tuPapel.dibujar(Math.max(y + 1, PIE - 3 - tuPapel.alto));
    pie();
  });

  if (params.devolver) return doc;
  doc.save(`recepcion-${params.nombreJornada.trim().toLowerCase().replace(/\s+/g, "-")}.pdf`);
}
