/**
 * Tarifario oficial de odontología: Manual Tarifario SOAT (Anexo Técnico 1 del Decreto 780 de
 * 2016, antes Decreto 2423 de 1996), capítulo "Servicios Ambulatorios de Salud Oral",
 * con las tarifas indexadas en UVB por la Circular Externa 047 del 30 de diciembre de 2025
 * del Ministerio de Salud (vigencia 2026). Es el referente legal para SOAT y sirve de
 * referencia para contratar otros servicios.
 *
 * Valor en pesos = tarifa en UVB × UVB del año, redondeado a la centena más próxima.
 * UVB 2026 = $12.110 (Resolución 3488 de 2025 de MinHacienda). Para otro año, cambiar
 * `UVB_VIGENTE`. Ver docs/odontologia.md (Tarifario).
 */
import { esSuperior, esTemporal, posicion, type Marca } from "./odontograma";

export const UVB_VIGENTE = { anio: 2026, valor: 12110, norma: "Resolución 3488 de 2025, MinHacienda" } as const;
export const FUENTE_TARIFARIO =
  "Manual Tarifario SOAT (Decreto 780 de 2016, Anexo Técnico 1), tarifas en UVB según la Circular Externa 047 de 2025 del Ministerio de Salud";

export type ItemTarifario = { codigo: string; descripcion: string; uvb: number; grupo: string };

const G = {
  consulta: "Consulta, diagnóstico y radiografías",
  operatoria: "Operatoria",
  periodoncia: "Periodoncia",
  endodoncia: "Endodoncia",
  ortodoncia: "Ortodoncia",
  cirugia: "Cirugía oral",
  protesis: "Prótesis",
  odontopediatria: "Odontopediatría",
  prevencion: "Prevención y promoción",
};

/** Capítulo completo, tal como aparece en la circular (páginas 34 a 37). */
export const TARIFARIO_ODONTOLOGIA: ItemTarifario[] = [
  { codigo: "36100", descripcion: "Consulta especializada", uvb: 5.33, grupo: G.consulta },
  { codigo: "36101", descripcion: "Examen clínico de primera vez", uvb: 3.09, grupo: G.consulta },
  { codigo: "36102", descripcion: "Consulta de urgencias (problemas agudos, dolorosos, hemorrágicos, traumáticos o infecciosos)", uvb: 3.36, grupo: G.consulta },
  { codigo: "36103", descripcion: "Radiografías intraorales (periapicales y/o coronales)", uvb: 1.4, grupo: G.consulta },
  { codigo: "36104", descripcion: "Radiografías intraorales (oclusales)", uvb: 2.56, grupo: G.consulta },
  { codigo: "36105", descripcion: "Radiografías intraorales (perfil de cara con cefalostato)", uvb: 8.42, grupo: G.consulta },
  { codigo: "36108", descripcion: "Impresión de arco dentario superior o inferior, con modelo de estudio y concepto", uvb: 4.86, grupo: G.consulta },
  { codigo: "36109", descripcion: "Fotografía clínica extraoral en blanco y negro, frontal o lateral", uvb: 3.13, grupo: G.consulta },
  { codigo: "36110", descripcion: "Examen y estudio para cirugía ortognática (registros, cefalometría, estudio de fotos)", uvb: 10.92, grupo: G.consulta },
  { codigo: "36111", descripcion: "Estudio de oclusión y ATM", uvb: 10.92, grupo: G.consulta },

  { codigo: "36201", descripcion: "Obturación de una superficie en amalgama de plata o resina compuesta de autocurado", uvb: 3.17, grupo: G.operatoria },
  { codigo: "36202", descripcion: "Obturación de una superficie adicional en amalgama de plata o resina compuesta de autocurado", uvb: 1.62, grupo: G.operatoria },
  { codigo: "36203", descripcion: "Obturación de una superficie en resina de fotocurado", uvb: 5.46, grupo: G.operatoria },
  { codigo: "36204", descripcion: "Obturación de superficie adicional en resina de fotocurado", uvb: 2.72, grupo: G.operatoria },
  { codigo: "36205", descripcion: "Obturación definitiva de una superficie en ionómero de vidrio", uvb: 4.03, grupo: G.operatoria },
  { codigo: "36206", descripcion: "Obturación definitiva de una superficie adicional en ionómero de vidrio", uvb: 2.0, grupo: G.operatoria },
  { codigo: "36207", descripcion: "Corona acrílica para dientes anteriores", uvb: 22.43, grupo: G.operatoria },
  { codigo: "36208", descripcion: "Colocación de pin milimétrico", uvb: 3.7, grupo: G.operatoria },
  { codigo: "36209", descripcion: "Reconstrucción de ángulo incisal con resina de fotocurado", uvb: 13.84, grupo: G.operatoria },
  { codigo: "36210", descripcion: "Reconstrucción tercio incisal con resina de fotocurado", uvb: 27.76, grupo: G.operatoria },

  { codigo: "36301", descripcion: "Tallado selectivo, por arcada (sin estudio de oclusión y ATM)", uvb: 10.92, grupo: G.periodoncia },
  { codigo: "36303", descripcion: "Detartraje (por cuadrante)", uvb: 12.55, grupo: G.periodoncia },
  { codigo: "36304", descripcion: "Injerto gingival (cada diente)", uvb: 13.45, grupo: G.periodoncia },
  { codigo: "36305", descripcion: "Gingivoplastia (cada diente)", uvb: 13.45, grupo: G.periodoncia },
  { codigo: "36306", descripcion: "Gingivectomía (cada diente)", uvb: 16.07, grupo: G.periodoncia },
  { codigo: "36307", descripcion: "Curetaje y/o alisado radicular campo cerrado (cada diente)", uvb: 13.45, grupo: G.periodoncia },
  { codigo: "36308", descripcion: "Curetaje y/o alisado radicular campo abierto (cada diente)", uvb: 16.07, grupo: G.periodoncia },

  { codigo: "36401", descripcion: "Tratamiento de conductos en dientes unirradiculares, con radiografía previa y de control; no incluye valor de RX", uvb: 10.57, grupo: G.endodoncia },
  { codigo: "36402", descripcion: "Tratamiento de conductos en dientes birradiculares, con radiografía previa y de control; no incluye valor de RX", uvb: 13.28, grupo: G.endodoncia },
  { codigo: "36403", descripcion: "Tratamiento de conductos en dientes multirradiculares, con radiografía previa y de control; no incluye valor de RX", uvb: 15.99, grupo: G.endodoncia },

  { codigo: "36501", descripcion: "Examen y estudio del caso (registros, cefalometría y estudio de fotos)", uvb: 10.92, grupo: G.ortodoncia },
  { codigo: "36502", descripcion: "Placa removible con accesorios", uvb: 36.45, grupo: G.ortodoncia },
  { codigo: "36503", descripcion: "Placa con tornillo de expansión", uvb: 51.01, grupo: G.ortodoncia },
  { codigo: "36504", descripcion: "Mantenedor fijo de espacio", uvb: 36.45, grupo: G.ortodoncia },
  { codigo: "36505", descripcion: "Arco lingual y botón de Nance", uvb: 36.45, grupo: G.ortodoncia },
  { codigo: "36506", descripcion: "Extracción seriada, previo estudio del caso", uvb: 29.14, grupo: G.ortodoncia },
  { codigo: "36507", descripcion: "Mentonera como tratamiento único", uvb: 29.14, grupo: G.ortodoncia },
  { codigo: "36508", descripcion: "Ortodoncia correctiva (cada arcada)", uvb: 364.49, grupo: G.ortodoncia },
  { codigo: "36509", descripcion: "Aparatos cráneo-maxilares como tratamiento único", uvb: 36.45, grupo: G.ortodoncia },
  { codigo: "36510", descripcion: "Plano inclinado", uvb: 29.14, grupo: G.ortodoncia },
  { codigo: "36511", descripcion: "Control mensual", uvb: 3.7, grupo: G.ortodoncia },
  { codigo: "36513", descripcion: "Control de crecimiento y desarrollo, sesión", uvb: 3.7, grupo: G.ortodoncia },
  { codigo: "36514", descripcion: "Rejilla fina para control de hábitos", uvb: 29.14, grupo: G.ortodoncia },
  { codigo: "36515", descripcion: "Máscara facial, como tratamiento", uvb: 43.32, grupo: G.ortodoncia },
  { codigo: "36516", descripcion: "Protractor", uvb: 43.32, grupo: G.ortodoncia },

  { codigo: "36601", descripcion: "Exodoncia simple de unirradiculares", uvb: 2.87, grupo: G.cirugia },
  { codigo: "36602", descripcion: "Exodoncia simple de multirradiculares", uvb: 3.51, grupo: G.cirugia },
  { codigo: "36603", descripcion: "Exodoncia unirradicular (vía abierta), con radiografía previa y de control; no incluye valor de RX", uvb: 7.99, grupo: G.cirugia },
  { codigo: "36604", descripcion: "Exodoncia multirradicular (vía abierta), con radiografía previa y de control; no incluye valor de RX", uvb: 13.28, grupo: G.cirugia },
  { codigo: "36605", descripcion: "Apicectomía de dientes unirradiculares; incluye el relleno radicular; no incluye valor de RX", uvb: 15.9, grupo: G.cirugia },
  { codigo: "36606", descripcion: "Apicectomía de dientes multirradiculares; incluye el relleno radicular; no incluye valor de RX", uvb: 23.9, grupo: G.cirugia },
  { codigo: "36607", descripcion: "Regularización de rebordes (cada arcada); no incluye radiografías previas y de control", uvb: 15.3, grupo: G.cirugia },
  { codigo: "36608", descripcion: "Amputación radicular con hemisección; no incluye tratamiento de conductos", uvb: 16.07, grupo: G.cirugia },
  { codigo: "36609", descripcion: "Injerto óseo autógeno por diente; incluye toma de injerto intraoral", uvb: 24.11, grupo: G.cirugia },
  { codigo: "36610", descripcion: "Injerto aloplástico cerámico (cada diente)", uvb: 16.07, grupo: G.cirugia },
  { codigo: "36611", descripcion: "Fijaciones temporales (cada cuadrante)", uvb: 13.45, grupo: G.cirugia },
  { codigo: "36613", descripcion: "Tratamiento quirúrgico de hemorragia post exodoncia o por alveolitis", uvb: 8.25, grupo: G.cirugia },
  { codigo: "36614", descripcion: "Reimplante o trasplante de diente", uvb: 18.91, grupo: G.cirugia },
  { codigo: "36616", descripcion: "Resección de capuchón pericoronario", uvb: 10.1, grupo: G.cirugia },

  { codigo: "36701", descripcion: "Prótesis total 1/2 caso (superior o inferior); no incluye modelos", uvb: 26.82, grupo: G.protesis },
  { codigo: "36702", descripcion: "Prótesis removible (superior o inferior); no incluye modelos", uvb: 21.45, grupo: G.protesis },
  { codigo: "36703", descripcion: "Prótesis fija, cada unidad (soportes y pónticos)", uvb: 26.82, grupo: G.protesis },
  { codigo: "36704", descripcion: "Férulas acrílicas (superior o inferior)", uvb: 7.22, grupo: G.protesis },
  { codigo: "36705", descripcion: "Férulas coladas (superior o inferior)", uvb: 10.66, grupo: G.protesis },
  { codigo: "36706", descripcion: "Núcleos metálicos", uvb: 10.92, grupo: G.protesis },
  { codigo: "36707", descripcion: "Placa obturadora para pacientes con secuela de labio y paladar hendido; no incluye modelos", uvb: 21.53, grupo: G.protesis },
  { codigo: "36708", descripcion: "Unidad puente fijo tipo Maryland", uvb: 26.82, grupo: G.protesis },
  { codigo: "36709", descripcion: "Placa neuro miorrelajante, previo estudio del caso; no incluye modelos", uvb: 29.14, grupo: G.protesis },
  { codigo: "36710", descripcion: "Prescripción y controles para reparación de prótesis", uvb: 7.31, grupo: G.protesis },

  { codigo: "36801", descripcion: "Corona en acero inoxidable", uvb: 4.9, grupo: G.odontopediatria },
  { codigo: "36802", descripcion: "Corona en policarbonato o forma plástica", uvb: 4.9, grupo: G.odontopediatria },
  { codigo: "36803", descripcion: "Tratamiento de conductos dientes temporales", uvb: 5.33, grupo: G.odontopediatria },
  { codigo: "36804", descripcion: "Exodoncia diente temporal", uvb: 1.62, grupo: G.odontopediatria },
  { codigo: "36805", descripcion: "Frenectomía o frenotomía", uvb: 10.1, grupo: G.odontopediatria },
  { codigo: "36806", descripcion: "Resina preventiva pre sellante", uvb: 1.62, grupo: G.odontopediatria },

  { codigo: "36901", descripcion: "Control de placa, clasificación de riesgo e instrucción de higiene oral", uvb: 2.11, grupo: G.prevencion },
  { codigo: "36902", descripcion: "Control de placa y de cepillado", uvb: 2.11, grupo: G.prevencion },
  { codigo: "36903", descripcion: "Educación en salud oral y control de riesgo", uvb: 2.11, grupo: G.prevencion },
  { codigo: "36904", descripcion: "Aplicación tópica seriada de fluoruros, niños; incluye profilaxis", uvb: 3.09, grupo: G.prevencion },
  { codigo: "36905", descripcion: "Aplicación tópica de fluoruros, en adultos; incluye profilaxis", uvb: 3.09, grupo: G.prevencion },
  { codigo: "36906", descripcion: "Terapia de mantenimiento, sesión; incluye profilaxis", uvb: 2.68, grupo: G.prevencion },
  { codigo: "36907", descripcion: "Aplicación de sellante de autocurado en fosetas y fisuras (cada diente)", uvb: 1.06, grupo: G.prevencion },
  { codigo: "36908", descripcion: "Aplicación de sellantes de fotocurado en fosetas y fisuras (cada diente)", uvb: 2.72, grupo: G.prevencion },
];

const POR_CODIGO = new Map(TARIFARIO_ODONTOLOGIA.map((i) => [i.codigo, i]));
export const itemTarifario = (codigo: string) => POR_CODIGO.get(codigo);

/** Tarifa en pesos: UVB × valor de la UVB, ajustado a la centena más próxima. */
export function valorEnPesos(uvb: number, valorUvb: number = UVB_VIGENTE.valor): number {
  return Math.round((uvb * valorUvb) / 100) * 100;
}

/** Texto con el que el ítem queda en el plan de tratamiento ("36203 · Obturación…"). */
export const textoItem = (i: ItemTarifario) => `${i.codigo} · ${i.descripcion}`;

// ---------------------------------------------------------------------------
// Presupuesto sugerido a partir del odontograma
// ---------------------------------------------------------------------------

export type Raices = "UNI" | "BI" | "MULTI";

/**
 * Número de raíces habitual (para elegir la tarifa de endodoncia y exodoncia). Simplificación
 * didáctica: anteriores y premolares unirradiculares, salvo el primer premolar superior
 * (birradicular); molares multirradiculares. Temporales: anteriores uni, molares multi.
 */
export function raicesDe(diente: number): Raices {
  const p = posicion(diente);
  if (esTemporal(diente)) return p <= 3 ? "UNI" : "MULTI";
  if (p >= 6) return "MULTI";
  if (p === 4 && esSuperior(diente)) return "BI";
  return "UNI";
}

export type LineaPresupuesto = { codigo: string; descripcion: string; cantidad: number; dientes: number[]; valorUnitario: number };

/**
 * Plan sugerido según los hallazgos del odontograma, con las tarifas oficiales. Es un punto
 * de partida para que el estudiante revise y ajuste (no reemplaza el criterio clínico):
 * - Caries: resina de fotocurado (1.ª superficie + adicionales), una obturación por diente.
 * - Endodoncia indicada: conductos según raíces (temporal: 36803) + 2 radiografías periapicales.
 * - Exodoncia simple / quirúrgica / resto radicular, sellantes, coronas y núcleos en mal estado.
 * Siempre incluye el examen clínico de primera vez.
 */
export function presupuestoDesdeOdontograma(marcas: Marca[], valorUvb: number = UVB_VIGENTE.valor): LineaPresupuesto[] {
  const lineas = new Map<string, LineaPresupuesto>();
  const sumar = (codigo: string, diente: number | null, cantidad = 1) => {
    const item = POR_CODIGO.get(codigo)!;
    const actual = lineas.get(codigo) ?? { codigo, descripcion: item.descripcion, cantidad: 0, dientes: [], valorUnitario: valorEnPesos(item.uvb, valorUvb) };
    actual.cantidad += cantidad;
    if (diente !== null && !actual.dientes.includes(diente)) actual.dientes.push(diente);
    lineas.set(codigo, actual);
  };

  sumar("36101", null);

  const dientes = [...new Set(marcas.map((m) => m.diente))].sort((a, b) => a - b);
  for (const d of dientes) {
    const ms = marcas.filter((m) => m.diente === d);
    const tiene = (h: string) => ms.some((m) => m.hallazgo === h);
    const raices = raicesDe(d);
    const temporal = esTemporal(d);
    const anterior = posicion(d) <= 3;

    // Las resinas y amalgamas ya hechas no generan tratamiento.
    const caras = new Set(ms.filter((m) => m.hallazgo === "CARIES" && m.superficie).map((m) => m.superficie));
    const vaAExtraerse = tiene("EXODONCIA_SIMPLE_INDICADA") || tiene("EXODONCIA_QUIRURGICA_INDICADA") || tiene("RESTO_RADICULAR");
    if (caras.size > 0 && !vaAExtraerse) {
      sumar("36203", d);
      if (caras.size > 1) sumar("36204", d, caras.size - 1);
    }

    if (tiene("ENDODONCIA_INDICADA")) {
      sumar(temporal ? "36803" : raices === "UNI" ? "36401" : raices === "BI" ? "36402" : "36403", d);
      sumar("36103", d, 2);
    }

    if (tiene("EXODONCIA_SIMPLE_INDICADA")) {
      sumar(temporal ? "36804" : raices === "UNI" ? "36601" : "36602", d);
    } else if (tiene("EXODONCIA_QUIRURGICA_INDICADA") || tiene("RESTO_RADICULAR")) {
      sumar(temporal ? "36804" : raices === "UNI" ? "36603" : "36604", d);
      if (!temporal) sumar("36103", d, 2);
    }

    if (tiene("SELLANTE_POR_HACER")) sumar("36908", d);

    if (tiene("CORONA_MAL_ESTADO") || tiene("PROVISIONAL_MAL_ESTADO")) {
      sumar(temporal ? "36801" : anterior ? "36207" : "36703", d);
    }
    if (tiene("NUCLEO_MAL_ESTADO")) sumar("36706", d);
  }

  return [...lineas.values()];
}
