import { RecetaElectronica } from "@prisma/client";

export type EstadoRecetaOnline = "VIGENTE" | "VENCIDA" | "AGOTADA";

export function evaluarEstadoReceta(receta: RecetaElectronica): EstadoRecetaOnline {
  if (new Date(receta.fechaVigencia) < new Date()) return "VENCIDA";
  if (receta.cantidadRedimida >= receta.cantidadAutorizada) return "AGOTADA";
  return "VIGENTE";
}

export type ResultadoBusquedaReceta = {
  medicamentoId: string;
  medico: string;
  cantidadAutorizada: number;
  cantidadRedimida: number;
  fechaVigencia: string;
  estado: EstadoRecetaOnline;
};

export function serializarReceta(receta: RecetaElectronica): ResultadoBusquedaReceta {
  return {
    medicamentoId: receta.medicamentoId,
    medico: receta.medico,
    cantidadAutorizada: receta.cantidadAutorizada,
    cantidadRedimida: receta.cantidadRedimida,
    fechaVigencia: receta.fechaVigencia.toISOString(),
    estado: evaluarEstadoReceta(receta),
  };
}
