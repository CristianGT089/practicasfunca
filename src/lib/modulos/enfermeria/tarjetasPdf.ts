/**
 * PDF de la ronda de medicamentos: una página por paciente con (1) la manilla de
 * identificación para recortar y ponérsela al compañero —roja si tiene alergia, como en un
 * hospital— y (2) su tarjeta: quién es, cómo actuar y los signos vitales que muestra solo
 * cuando el estudiante se los toma.
 *
 * Material de práctica: los pacientes son ficticios.
 */
import { jsPDF } from "jspdf";
import type { CasoRonda } from "./ronda";

const AZUL: [number, number, number] = [38, 62, 128];
const ROJO: [number, number, number] = [200, 30, 30];
const GRIS: [number, number, number] = [90, 100, 115];

const SIGNOS: [keyof CasoRonda["signos"] | "ta", string, string][] = [
  ["ta", "Tensión arterial", "mmHg"],
  ["fc", "Frecuencia cardiaca", "lpm"],
  ["fr", "Frecuencia respiratoria", "rpm"],
  ["temperatura", "Temperatura", "°C"],
  ["satO2", "Saturación de oxígeno", "%"],
  ["glucometria", "Glucometría", "mg/dL"],
  ["dolor", "Dolor (0 a 10)", ""],
];

export function generarTarjetasEnfermeriaPDF(nombreJornada: string, casos: CasoRonda[]) {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  const m = 16;
  const util = ancho - m * 2;

  casos.forEach((c, i) => {
    if (i > 0) doc.addPage();
    let y = m;
    const p = c.paciente;
    const alergico = p.alergias.length > 0;

    // ---------- Manilla (recortar por la línea punteada) ----------
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...GRIS);
    doc.text("Recorta la manilla y pégala en la muñeca del compañero que hace de paciente", m, y);
    y += 3;
    const altoManilla = 22;
    doc.setLineDashPattern([1.5, 1.2], 0);
    doc.setDrawColor(...GRIS);
    doc.rect(m, y, util, altoManilla);
    doc.setLineDashPattern([], 0);
    doc.setFillColor(...(alergico ? ROJO : [235, 240, 250] as [number, number, number]));
    doc.rect(m + 1.5, y + 1.5, util - 3, altoManilla - 3, "F");
    doc.setTextColor(...(alergico ? ([255, 255, 255] as [number, number, number]) : AZUL));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(p.nombre.toUpperCase(), m + 5, y + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`${p.tipoDocumento} ${p.documento}   |   ${p.edad} años   |   ${p.servicio}, cama ${p.cama}`, m + 5, y + 14);
    if (alergico) {
      doc.setFont("helvetica", "bold");
      doc.text(`ALERGIA: ${p.alergias.join(", ").toUpperCase()}`, m + 5, y + 19);
    }
    y += altoManilla + 10;

    // ---------- Tarjeta ----------
    const escribir = (texto: string, tam = 10, estilo: "normal" | "bold" | "italic" = "normal", color: [number, number, number] = [30, 30, 30]) => {
      doc.setFont("helvetica", estilo);
      doc.setFontSize(tam);
      doc.setTextColor(...color);
      const lineas = doc.splitTextToSize(texto, util - 4) as string[];
      if (y + lineas.length * tam * 0.42 > alto - m) {
        doc.addPage();
        y = m;
      }
      doc.text(lineas, m + 2, y);
      y += lineas.length * tam * 0.42 + 2;
    };

    escribir("Tarjeta del paciente - no se la muestres al estudiante", 8, "normal", GRIS);
    escribir(p.nombre, 16, "bold", AZUL);
    escribir(`${p.edad} años - ${p.diagnostico}${p.pesoKg ? ` - peso ${p.pesoKg} kg` : ""}`, 10, "normal", GRIS);
    escribir(`Jornada: ${nombreJornada}`, 8, "normal", GRIS);
    y += 3;
    escribir("Cómo actuar", 11.5, "bold", AZUL);
    c.guion.forEach((l) => escribir(`• ${l}`, 10.5));
    // Si el guion ya dice qué responder sobre alergias, no se repite.
    if (!c.guion.some((l) => /alergi/i.test(l))) {
      if (alergico) escribir(`• Si te preguntan por alergias, di que eres alérgico a: ${p.alergias.join(", ")}.`, 10.5);
      else escribir("• Si te preguntan por alergias: no tienes ninguna.", 10.5);
    }
    escribir("• Si el estudiante no revisa tu manilla ni te pregunta tu nombre completo y documento, no le ayudes.", 10.5);

    y += 3;
    doc.setDrawColor(...AZUL);
    doc.setLineDashPattern([2, 1.5], 0);
    doc.line(m, y, ancho - m, y);
    doc.setLineDashPattern([], 0);
    y += 6;
    escribir("Si te toman los signos vitales, muéstrale esto", 11.5, "bold", AZUL);
    escribir("Solo el signo que te tome (si solo te toma el pulso, solo dile el pulso). Si no te los toma, no los digas.", 8.5, "italic", GRIS);
    y += 1;
    for (const [campo, nombre, unidad] of SIGNOS) {
      const valor =
        campo === "ta"
          ? c.signos.tas !== undefined && c.signos.tad !== undefined
            ? `${c.signos.tas}/${c.signos.tad}`
            : null
          : (c.signos[campo] ?? null);
      if (valor === null || valor === undefined) continue;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      doc.text(nombre, m + 4, y);
      doc.setFont("helvetica", "bold");
      doc.text(`${String(valor).replace(".", ",")} ${unidad}`.trim(), m + 80, y);
      y += 6.5;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...GRIS);
    doc.text("Documento de práctica, FUNCA Prácticas. El paciente es ficticio.", ancho / 2, alto - 8, { align: "center" });
  });

  doc.save(`ronda-${nombreJornada.trim().toLowerCase().replace(/\s+/g, "-")}.pdf`);
}
