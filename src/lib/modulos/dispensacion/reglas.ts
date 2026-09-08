/**
 * Reglas de la práctica de dispensación (servicio farmacéutico). No hay nota: estas
 * funciones solo producen avisos y límites para que la pantalla guíe al estudiante y le
 * muestre las consecuencias de dispensar mal. Ver docs/dispensacion.md.
 */

export type NivelAviso = "BLOQUEO" | "ALERTA" | "INFO";

export type Aviso = {
  nivel: NivelAviso;
  codigo: string;
  mensaje: string;
};

export type EstadoAutorizacion = "VIGENTE" | "VENCIDA" | "AGOTADA";

export type AutorizacionSistema = {
  recetaElectronicaId: string;
  medico: string;
  cantidadAutorizada: number;
  /** redimido base (seed) + lo entregado en esta sesión contra esta autorización */
  cantidadRedimida: number;
  fechaVigencia: string; // ISO
};

export function estadoAutorizacion(a: AutorizacionSistema): EstadoAutorizacion {
  if (new Date(a.fechaVigencia) < new Date()) return "VENCIDA";
  if (a.cantidadRedimida >= a.cantidadAutorizada) return "AGOTADA";
  return "VIGENTE";
}

export function saldoDisponible(a: AutorizacionSistema): number {
  return Math.max(0, a.cantidadAutorizada - a.cantidadRedimida);
}

export type ContextoRenglon = {
  cantidadPapel: number;
  cantidadTachada: number | null;
  medicamentoNombre: string;
  medicamentoTags: string[];
  medicamentoStock: number;
  /** medico que firma la fórmula física */
  medicoFormula: string;
  formulaCargadaEnSistema: boolean;
  alergiasPaciente: string[];
  identidadCoincide: boolean;
  autorizacion: AutorizacionSistema | null;
};

export type EvaluacionRenglon = {
  avisos: Aviso[];
  /** unidades que tiene sentido entregar ahora (0 si algo lo impide de raíz) */
  maxEntregable: number;
  /** true si la pantalla debe permitir el botón "Entregar" (con confirmación si hay ALERTA) */
  permiteEntrega: boolean;
};

export function evaluarRenglon(ctx: ContextoRenglon): EvaluacionRenglon {
  const avisos: Aviso[] = [];

  if (!ctx.identidadCoincide) {
    avisos.push({
      nivel: "BLOQUEO",
      codigo: "IDENTIDAD",
      mensaje: "El documento que presenta la persona no coincide con el del paciente de la fórmula.",
    });
  }

  if (!ctx.formulaCargadaEnSistema) {
    avisos.push({
      nivel: "BLOQUEO",
      codigo: "FORMULA_NO_EN_SISTEMA",
      mensaje: "Esta fórmula no está cargada en el sistema (médico particular). Debe remitirse; no se dispensa acá.",
    });
  }

  if (!ctx.autorizacion) {
    avisos.push({
      nivel: "BLOQUEO",
      codigo: "NO_AUTORIZADO",
      mensaje: `"${ctx.medicamentoNombre}" no aparece autorizado en el sistema para este paciente.`,
    });
  }

  let maxEntregable = 0;

  if (ctx.autorizacion) {
    const estado = estadoAutorizacion(ctx.autorizacion);
    const saldo = saldoDisponible(ctx.autorizacion);

    if (estado === "VENCIDA") {
      avisos.push({ nivel: "BLOQUEO", codigo: "VENCIDA", mensaje: "La autorización está vencida." });
    } else if (estado === "AGOTADA") {
      avisos.push({
        nivel: "BLOQUEO",
        codigo: "AGOTADA",
        mensaje: "La cantidad autorizada ya fue redimida por completo.",
      });
    } else {
      maxEntregable = Math.min(ctx.cantidadPapel, saldo);
      if (ctx.cantidadPapel > saldo) {
        avisos.push({
          nivel: "ALERTA",
          codigo: "EXCEDE_AUTORIZADO",
          mensaje: `La fórmula pide ${ctx.cantidadPapel} pero solo quedan ${saldo} autorizadas. Se puede entregar hasta ${saldo} (entrega parcial).`,
        });
      }
      if (ctx.medicoFormula.trim().toLowerCase() !== ctx.autorizacion.medico.trim().toLowerCase()) {
        avisos.push({
          nivel: "INFO",
          codigo: "MEDICO_DIFERENTE",
          mensaje: `El médico de la fórmula (${ctx.medicoFormula}) no es el mismo que registró la autorización (${ctx.autorizacion.medico}).`,
        });
      }
    }
  }

  if (ctx.cantidadTachada != null) {
    avisos.push({
      nivel: "ALERTA",
      codigo: "CANTIDAD_TACHADA",
      mensaje: `La cantidad tiene una corrección a mano (${ctx.cantidadTachada} → ${ctx.cantidadPapel}). Verifícala.`,
    });
  }

  const alergiaCruce = ctx.medicamentoTags.find((tag) =>
    ctx.alergiasPaciente.some((a) => a.trim().toLowerCase() === tag.trim().toLowerCase())
  );
  if (alergiaCruce) {
    avisos.push({
      nivel: "ALERTA",
      codigo: "ALERGIA",
      mensaje: `El paciente tiene registrada alergia a "${alergiaCruce}".`,
    });
  }

  if (ctx.medicamentoStock <= 0) {
    avisos.push({
      nivel: "ALERTA",
      codigo: "SIN_STOCK",
      mensaje: "No hay existencias de este medicamento en el punto.",
    });
  }

  const hayBloqueo = avisos.some((a) => a.nivel === "BLOQUEO");

  return {
    avisos,
    maxEntregable: hayBloqueo ? 0 : maxEntregable,
    permiteEntrega: !hayBloqueo && maxEntregable > 0,
  };
}
