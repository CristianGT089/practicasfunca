import type { EsperadoOdontologia } from "./historia";
import { tieneHallazgosRadiograficos } from "./odontograma";

export type PasoCaso = { orden: number; tipoAccion: string; descripcion: string; peso: number };

/**
 * Checklist de proceso de un caso de Odontología, derivado de su historia esperada (el
 * docente no lo arma a mano): siempre interrogar y examinar; el revelador solo si el caso
 * evalúa índice de placa; la radiografía solo si el caso la necesita.
 */
export function pasosParaCaso(esperado: EsperadoOdontologia): PasoCaso[] {
  const pasos: Omit<PasoCaso, "orden">[] = [
    { tipoAccion: "INTERROGAR_PACIENTE", descripcion: "Interrogó al paciente (anamnesis)", peso: 2 },
    { tipoAccion: "EXAMINAR_PACIENTE", descripcion: "Realizó el examen clínico", peso: 2 },
  ];
  if (esperado.placa.length > 0) {
    pasos.push({ tipoAccion: "APLICAR_REVELADOR_PLACA", descripcion: "Aplicó revelador de placa (O'Leary)", peso: 1 });
  }
  if (requiereRadiografia(esperado)) {
    pasos.push({ tipoAccion: "SOLICITAR_RADIOGRAFIA", descripcion: "Solicitó la radiografía necesaria", peso: 1 });
  }
  pasos.push({ tipoAccion: "CERRAR_HISTORIA", descripcion: "Cerró y firmó la historia clínica", peso: 1 });
  return pasos.map((p, i) => ({ ...p, orden: i + 1 }));
}

/** Un caso con hallazgos que solo se ven en la radiografía la necesita, lo diga o no el docente. */
export function requiereRadiografia(esperado: EsperadoOdontologia): boolean {
  return esperado.requiereRadiografia || tieneHallazgosRadiograficos(esperado.odontograma);
}
