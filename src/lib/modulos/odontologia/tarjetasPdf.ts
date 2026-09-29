/**
 * PDF de tarjetas para la jornada presencial de Odontología: una página por caso, para el
 * compañero que interpreta al paciente. Lo que cuenta si le preguntan, y en bloques
 * separados lo que "se ve" al examinarlo, al aplicar revelador y en la radiografía: cada
 * bloque solo se muestra cuando el estudiante hace lo que corresponde.
 *
 * Material de práctica: los pacientes son ficticios.
 */
import { jsPDF } from "jspdf";
import { normalizarEsperado, SUPERFICIES_PLACA } from "./historia";
import { nombreSuperficie, relatoOdontograma } from "./odontograma";

export type CasoParaTarjeta = {
  titulo: string;
  paciente: {
    nombres: string;
    primerApellido: string;
    segundoApellido: string | null;
    tipoDocumento: string;
    documento: string;
    fechaNacimiento: string;
    ocupacion: string | null;
  };
  motivoConsulta: string;
  relatoAnamnesis: string;
  relatoExamen: string | null;
  relatoRadiografia: string | null;
  esperado: unknown;
};

const AZUL: [number, number, number] = [14, 116, 144];
const GRIS: [number, number, number] = [90, 100, 115];

function edad(iso: string) {
  const n = new Date(iso);
  const h = new Date();
  let e = h.getFullYear() - n.getFullYear();
  if (h < new Date(h.getFullYear(), n.getMonth(), n.getDate())) e -= 1;
  return e;
}

export function generarTarjetasOdontologiaPDF(nombreJornada: string, casos: CasoParaTarjeta[]) {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  const m = 16;
  const util = ancho - m * 2;

  casos.forEach((c, i) => {
    if (i > 0) doc.addPage();
    let y = m;

    const escribir = (texto: string, tam = 10, estilo: "normal" | "bold" | "italic" = "normal", color: [number, number, number] = [30, 30, 30]) => {
      doc.setFont("helvetica", estilo);
      doc.setFontSize(tam);
      doc.setTextColor(...color);
      const lineas = doc.splitTextToSize(texto, util - 6) as string[];
      if (y + lineas.length * tam * 0.42 > alto - m) {
        doc.addPage();
        y = m;
      }
      doc.text(lineas, m + 3, y);
      y += lineas.length * tam * 0.42 + 2;
    };

    const bloque = (titulo: string, indicacion: string) => {
      y += 3;
      doc.setDrawColor(...AZUL);
      doc.setLineDashPattern([2, 1.5], 0);
      doc.line(m, y, ancho - m, y);
      doc.setLineDashPattern([], 0);
      y += 6;
      escribir(titulo, 11.5, "bold", AZUL);
      escribir(indicacion, 8.5, "italic", GRIS);
    };

    const p = c.paciente;
    escribir("Tarjeta del paciente · material de práctica", 8, "normal", GRIS);
    escribir(`${p.nombres} ${p.primerApellido} ${p.segundoApellido ?? ""}`.trim(), 16, "bold", AZUL);
    escribir(
      `${edad(p.fechaNacimiento)} años · ${p.tipoDocumento} ${p.documento}${p.ocupacion ? ` · ${p.ocupacion}` : ""}`,
      10,
      "normal",
      GRIS
    );
    escribir(`Jornada: ${nombreJornada} · Caso: ${c.titulo}`, 8, "normal", GRIS);
    y += 2;
    escribir("Muestra tu documento cuando te lo pidan: es con lo que te buscan en el sistema.", 9, "italic", GRIS);

    y += 2;
    escribir("Por qué vienes (dilo con tus palabras)", 11, "bold", AZUL);
    escribir(`"${c.motivoConsulta}"`, 10.5, "italic");
    escribir("Lo que cuentas si te preguntan (no lo leas de una vez: responde a lo que te pregunten)", 11, "bold", AZUL);
    escribir(c.relatoAnamnesis, 10);

    const esperado = normalizarEsperado(c.esperado);
    bloque("Al examinarte", "Muéstrale esta parte al estudiante solo cuando te examine la boca. Léela o déjasela ver.");
    if (c.relatoExamen) escribir(c.relatoExamen, 10);
    const hallazgos = relatoOdontograma(esperado.odontograma, "CLINICO", true);
    if (hallazgos.length) hallazgos.forEach((l) => escribir(`• ${l}`, 9.5));
    else escribir("Sin hallazgos dentales.", 10);

    if (esperado.placa.length > 0) {
      bloque("Si te aplican revelador de placa", "Solo si el estudiante dice que aplica el revelador.");
      const porDiente = new Map<number, string[]>();
      for (const s of esperado.placa) porDiente.set(s.diente, [...(porDiente.get(s.diente) ?? []), s.superficie]);
      escribir("Superficies teñidas:", 10);
      [...porDiente.entries()]
        .sort(([a], [b]) => a - b)
        .forEach(([d, sups]) =>
          escribir(`• ${d}: ${SUPERFICIES_PLACA.filter((s) => sups.includes(s)).map((s) => nombreSuperficie(d, s)).join(", ")}`, 9.5)
        );
    }

    const rx = relatoOdontograma(esperado.odontograma, "RADIOGRAFICO", true);
    if (rx.length || c.relatoRadiografia) {
      bloque("Si piden una radiografía", "Solo si el estudiante la pide. Si no la pide, no la muestres.");
      if (c.relatoRadiografia) escribir(c.relatoRadiografia, 10);
      rx.forEach((l) => escribir(`• ${l}`, 9.5));
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...GRIS);
    doc.text("Documento de práctica, FUNCA Prácticas. El paciente es ficticio.", ancho / 2, alto - 8, { align: "center" });
  });

  doc.save(`tarjetas-${nombreJornada.trim().toLowerCase().replace(/\s+/g, "-")}.pdf`);
}
