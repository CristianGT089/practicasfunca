/**
 * Calificación de la historia odontológica. Puro: lo usa el servidor al finalizar el caso y
 * las pantallas de revisión (estudiante y docente) para mostrar la comparación.
 *
 * El odontograma pesa casi la mitad de la nota: es el foco del módulo.
 */
import { claveMarca, definicionHallazgo, nombreSuperficie, ordenarMarcas, type Marca } from "./odontograma";
import {
  ALERTAS_MEDICAS,
  ANTECEDENTES_ODONTOLOGICOS,
  ANTECEDENTES_PERSONALES,
  EXAMEN_DENTAL,
  EXAMEN_ESTOMATOLOGICO_NA,
  EXAMEN_ESTOMATOLOGICO_SN,
  calcularIndicePlaca,
  clavePlaca,
  etiquetaDe,
  type EsperadoOdontologia,
  type HistoriaOdontologica,
  type ItemCatalogo,
} from "./historia";
import type { Denticion } from "./odontograma";

export const PESOS = {
  proceso: 10, // interrogar, examinar, revelador, radiografía (checklist genérico)
  odontograma: 45,
  alertaMedica: 10,
  antecedentes: 10,
  examenes: 5,
  placa: 10,
  remision: 10,
} as const;

export type ComparacionOdontograma = {
  puntaje: number;
  aciertos: Marca[];
  /** Diente y hallazgo correctos pero en otra(s) cara(s): medio punto. */
  parciales: { esperada: Marca; obtenida: Marca }[];
  faltantes: Marca[];
  sobrantes: Marca[];
};

/**
 * Compara odontogramas marca por marca. "Sano" no se califica (es opcional en el papel).
 * puntaje = (aciertos + ½·parciales) / (marcas esperadas + marcas que sobran) × 100,
 * así marcar de más también baja la nota.
 */
export function compararOdontogramas(esperado: Marca[], obtenido: Marca[]): ComparacionOdontograma {
  const esp = esperado.filter((m) => m.hallazgo !== "SANO");
  const obt = obtenido.filter((m) => m.hallazgo !== "SANO");
  const clavesObtenidas = new Set(obt.map(claveMarca));
  const clavesEsperadas = new Set(esp.map(claveMarca));

  const aciertos = esp.filter((m) => clavesObtenidas.has(claveMarca(m)));
  let pendientesEsp = esp.filter((m) => !clavesObtenidas.has(claveMarca(m)));
  let pendientesObt = obt.filter((m) => !clavesEsperadas.has(claveMarca(m)));

  const parciales: { esperada: Marca; obtenida: Marca }[] = [];
  for (const e of [...pendientesEsp]) {
    if (!e.superficie) continue;
    const o = pendientesObt.find((x) => x.diente === e.diente && x.hallazgo === e.hallazgo && x.superficie);
    if (!o) continue;
    parciales.push({ esperada: e, obtenida: o });
    pendientesEsp = pendientesEsp.filter((x) => x !== e);
    pendientesObt = pendientesObt.filter((x) => x !== o);
  }

  const denominador = esp.length + pendientesObt.length;
  const puntaje = denominador === 0 ? 100 : Math.round(((aciertos.length + parciales.length * 0.5) / denominador) * 100);
  return {
    puntaje,
    aciertos: ordenarMarcas(aciertos),
    parciales,
    faltantes: ordenarMarcas(pendientesEsp),
    sobrantes: ordenarMarcas(pendientesObt),
  };
}

/** Mismo criterio para conjuntos de códigos (alerta médica, antecedentes, exámenes). */
export function compararConjuntos(esperado: string[], obtenido: string[]) {
  const esp = new Set(esperado);
  const obt = new Set(obtenido);
  const aciertos = [...esp].filter((c) => obt.has(c));
  const faltantes = [...esp].filter((c) => !obt.has(c));
  const sobrantes = [...obt].filter((c) => !esp.has(c));
  const denominador = esp.size + sobrantes.length;
  const puntaje = denominador === 0 ? 100 : Math.round((aciertos.length / denominador) * 100);
  return { puntaje, aciertos, faltantes, sobrantes };
}

export function describirMarca(m: Marca): string {
  const def = definicionHallazgo(m.hallazgo);
  const cara = m.superficie ? ` (${nombreSuperficie(m.diente, m.superficie)})` : "";
  return `${m.diente} · ${def?.etiqueta ?? m.hallazgo}${cara}`;
}

export type LineaRevision = { descripcion: string; obligatorio: boolean; cumplido: boolean };

export type RevisionHistoria = {
  puntajes: Record<keyof typeof PESOS, number | null>;
  odontograma: ComparacionOdontograma;
  lineas: LineaRevision[];
};

function lineasConjunto(titulo: string, catalogo: ItemCatalogo[], esperado: string[], obtenido: string[]): LineaRevision[] {
  const c = compararConjuntos(esperado, obtenido);
  const lineas: LineaRevision[] = [];
  if (c.faltantes.length === 0 && c.sobrantes.length === 0) {
    lineas.push({ descripcion: `${titulo}: correcto`, obligatorio: true, cumplido: true });
  }
  for (const f of c.faltantes) lineas.push({ descripcion: `${titulo}: faltó ${etiquetaDe(catalogo, f)}`, obligatorio: true, cumplido: false });
  for (const s of c.sobrantes) lineas.push({ descripcion: `${titulo}: sobra ${etiquetaDe(catalogo, s)}`, obligatorio: true, cumplido: false });
  return lineas;
}

/**
 * Revisa el contenido de la historia contra la esperada del caso. `puntajes` en 0-100 por
 * componente (null = el caso no evalúa ese componente, ej. un caso sin índice de placa).
 * El componente "proceso" lo pone quien llama (sale del checklist genérico).
 */
export function revisarHistoria(
  esperado: EsperadoOdontologia,
  historia: HistoriaOdontologica,
  denticion: Denticion,
  remisionEsperada: string,
  remisionObtenida: string | null
): RevisionHistoria {
  const odontograma = compararOdontogramas(esperado.odontograma, historia.odontograma);
  const alerta = compararConjuntos(esperado.alertaMedica, historia.alertaMedica);
  const antecedentes = compararConjuntos(
    [...esperado.antecedentesPersonales, ...esperado.antecedentesOdontologicos.map((c) => `o:${c}`)],
    [...historia.antecedentesPersonales, ...historia.antecedentesOdontologicos.map((c) => `o:${c}`)]
  );
  const examenes = compararConjuntos(
    [...esperado.examenEstomatologico, ...esperado.examenDental.map((c) => `d:${c}`)],
    [...historia.examenEstomatologico, ...historia.examenDental.map((c) => `d:${c}`)]
  );

  // Índice de placa: mitad por pintar bien las superficies, mitad por calcular bien el %.
  let puntajePlaca: number | null = null;
  const lineasPlaca: LineaRevision[] = [];
  if (esperado.placa.length > 0) {
    const pintura = compararConjuntos(esperado.placa.map(clavePlaca), historia.placa.map(clavePlaca));
    const correcto = calcularIndicePlaca(denticion, esperado.odontograma, esperado.placa).indice;
    const escrito = Number(historia.indicePlaca.replace(",", ".").replace("%", "").trim());
    const calculoBien = historia.indicePlaca.trim() !== "" && Number.isFinite(escrito) && Math.abs(escrito - correcto) <= 1;
    puntajePlaca = Math.round(pintura.puntaje * 0.5 + (calculoBien ? 50 : 0));
    lineasPlaca.push({
      descripcion: `Índice de placa: superficies teñidas ${pintura.aciertos.length}/${esperado.placa.length} bien marcadas${pintura.sobrantes.length ? `, ${pintura.sobrantes.length} de más` : ""}`,
      obligatorio: true,
      cumplido: pintura.faltantes.length === 0 && pintura.sobrantes.length === 0,
    });
    lineasPlaca.push({
      descripcion: calculoBien
        ? `Índice de O'Leary calculado correctamente (${correcto}%)`
        : `Índice de O'Leary: escribiste "${historia.indicePlaca || "—"}", era ${correcto}%`,
      obligatorio: true,
      cumplido: calculoBien,
    });
  }

  const remisionBien = remisionObtenida === remisionEsperada;

  const lineas: LineaRevision[] = [];
  for (const m of odontograma.aciertos) lineas.push({ descripcion: `Odontograma: ${describirMarca(m)}`, obligatorio: true, cumplido: true });
  for (const p of odontograma.parciales)
    lineas.push({
      descripcion: `Odontograma: ${describirMarca(p.esperada)} — lo marcaste en otra cara (${nombreSuperficie(p.obtenida.diente, p.obtenida.superficie!)})`,
      obligatorio: true,
      cumplido: false,
    });
  for (const m of odontograma.faltantes) lineas.push({ descripcion: `Odontograma: faltó ${describirMarca(m)}`, obligatorio: true, cumplido: false });
  for (const m of odontograma.sobrantes) lineas.push({ descripcion: `Odontograma: sobra ${describirMarca(m)}`, obligatorio: true, cumplido: false });
  lineas.push(...lineasConjunto("Alerta médica", ALERTAS_MEDICAS, esperado.alertaMedica, historia.alertaMedica));
  lineas.push(...lineasConjunto("Antecedentes personales", ANTECEDENTES_PERSONALES, esperado.antecedentesPersonales, historia.antecedentesPersonales));
  lineas.push(
    ...lineasConjunto("Antecedentes odontológicos", ANTECEDENTES_ODONTOLOGICOS, esperado.antecedentesOdontologicos, historia.antecedentesOdontologicos)
  );
  lineas.push(
    ...lineasConjunto(
      "Examen estomatológico",
      [...EXAMEN_ESTOMATOLOGICO_NA, ...EXAMEN_ESTOMATOLOGICO_SN],
      esperado.examenEstomatologico,
      historia.examenEstomatologico
    )
  );
  lineas.push(...lineasConjunto("Examen pulpar, dental y periodontal", EXAMEN_DENTAL.flatMap((g) => g.items), esperado.examenDental, historia.examenDental));
  lineas.push(...lineasPlaca);

  return {
    puntajes: {
      proceso: null,
      odontograma: odontograma.puntaje,
      alertaMedica: alerta.puntaje,
      antecedentes: antecedentes.puntaje,
      examenes: examenes.puntaje,
      placa: puntajePlaca,
      remision: remisionBien ? 100 : 0,
    },
    odontograma,
    lineas,
  };
}

/** Promedio ponderado de los componentes que aplican (ignora los null). */
export function ponderar(puntajes: Partial<Record<keyof typeof PESOS, number | null>>): number {
  let peso = 0;
  let total = 0;
  for (const [clave, valor] of Object.entries(puntajes)) {
    if (valor === null || valor === undefined) continue;
    const p = PESOS[clave as keyof typeof PESOS];
    peso += p;
    total += valor * p;
  }
  return peso > 0 ? Math.round(total / peso) : 0;
}
