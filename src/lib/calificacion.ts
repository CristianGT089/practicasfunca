import { PasoEsperado, Accion } from "@prisma/client";
import { coincideParametrosConMotivos } from "./modulos/checklist";

/**
 * Compara los parámetros esperados de un paso contra el payload real de una
 * acción. Solo exige que las claves definidas en `esperado` coincidan (con
 * soporte de subconjunto para `motivos`); el payload puede traer más datos
 * (ej. metadata de UI) sin que eso falle el match.
 */
function coincideParametros(esperado: unknown, payload: unknown): boolean {
  const esperadoObj = esperado && typeof esperado === "object" && !Array.isArray(esperado) ? (esperado as Record<string, unknown>) : null;
  const payloadObj = payload && typeof payload === "object" && !Array.isArray(payload) ? (payload as Record<string, unknown>) : null;
  return coincideParametrosConMotivos(esperadoObj, payloadObj);
}

export type ResultadoPaso = {
  paso: PasoEsperado;
  cumplido: boolean;
  accionCoincidente?: Accion;
};

export type ResultadoCalificacion = {
  puntajeProceso: number; // 0-100
  puntajeResultado: number; // 0-100
  puntajeFinal: number; // 0-100, 60% proceso + 40% resultado
  detallePasos: ResultadoPaso[];
  accionesEvaluadas: { accion: Accion; esCorrecta: boolean }[];
};

const PESO_PROCESO = 0.6;
const PESO_RESULTADO = 0.4;

export function calificarIntento(
  pasosEsperados: PasoEsperado[],
  acciones: Accion[],
  resultadoEsperado: string,
  resultadoObtenido: string | null
): ResultadoCalificacion {
  const accionesOrdenadas = [...acciones].sort(
    (a, b) => a.creadoEn.getTime() - b.creadoEn.getTime()
  );
  const pasosOrdenados = [...pasosEsperados].sort((a, b) => a.orden - b.orden);

  const usadas = new Set<string>();
  const detallePasos: ResultadoPaso[] = [];
  let cursorOrden = -1;
  let pesoTotal = 0;
  let pesoObtenido = 0;

  for (const paso of pasosOrdenados) {
    pesoTotal += paso.peso;
    // busca, entre las acciones no usadas, la primera que coincida en tipo y parámetros
    const candidata = accionesOrdenadas.find(
      (a) => !usadas.has(a.id) && a.tipo === paso.tipoAccion && coincideParametros(paso.parametros, a.payload)
    );

    if (candidata) {
      usadas.add(candidata.id);
      const indiceCandidata = accionesOrdenadas.indexOf(candidata);
      const enOrden = indiceCandidata >= cursorOrden;
      cursorOrden = Math.max(cursorOrden, indiceCandidata);

      // paso cumplido; si además respetó el orden relativo, otorga el peso completo,
      // si lo cumplió pero desordenado respecto al paso anterior, otorga 70% del peso
      const factor = enOrden ? 1 : 0.7;
      pesoObtenido += paso.peso * factor;
      detallePasos.push({ paso, cumplido: true, accionCoincidente: candidata });
    } else {
      detallePasos.push({ paso, cumplido: false });
    }
  }

  const puntajeProceso = pesoTotal > 0 ? Math.round((pesoObtenido / pesoTotal) * 100) : 100;
  const puntajeResultado = resultadoObtenido === resultadoEsperado ? 100 : 0;
  const puntajeFinal = Math.round(puntajeProceso * PESO_PROCESO + puntajeResultado * PESO_RESULTADO);

  const accionesEvaluadas = accionesOrdenadas.map((accion) => ({
    accion,
    esCorrecta: usadas.has(accion.id),
  }));

  return { puntajeProceso, puntajeResultado, puntajeFinal, detallePasos, accionesEvaluadas };
}
