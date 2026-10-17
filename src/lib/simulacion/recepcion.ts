/**
 * Recepción técnica de medicamentos y dispositivos médicos en una jornada (tipo RECEPCION).
 *
 * El proceso que se practica (Res. 1403 de 2007, Manual de condiciones esenciales y
 * procedimientos del servicio farmacéutico: recepción administrativa y técnica):
 *  1. Administrativa: el transportador entrega la factura; se compara con la orden de compra
 *     (lo que se pidió, cuánto) y se cuenta lo que llegó.
 *  2. Técnica, producto por producto: lote y fecha de vencimiento (contra la factura y contra
 *     la vida útil mínima de la política del servicio), registro sanitario INVIMA en la
 *     etiqueta, integridad del empaque y, en los refrigerados, la temperatura del transporte
 *     (2 a 8 °C).
 *  3. Decisión: se acepta lo conforme; lo no conforme se rechaza y se devuelve al proveedor.
 *     Un faltante se recibe por lo que llegó y queda como novedad.
 *  4. Acta de recepción firmada por quien recibe, con las observaciones.
 *
 * Puro (sin Prisma): lo usan el servidor, la pantalla y las pruebas.
 */
import type { Criterio } from "./evaluacion";

/** Política del servicio para la jornada: vida útil mínima al recibir. */
export const VIDA_UTIL_MINIMA_MESES = 6;
export const TEMPERATURA_MIN = 2;
export const TEMPERATURA_MAX = 8;

export type MotivoRecepcion = "VENCIMIENTO" | "LOTE" | "REGISTRO_SANITARIO" | "CADENA_FRIO" | "EMPAQUE" | "FALTANTE" | "NO_SOLICITADO";

export const MOTIVOS: { codigo: MotivoRecepcion; nombre: string }[] = [
  { codigo: "VENCIMIENTO", nombre: "Vencido o con vida útil menor a la mínima" },
  { codigo: "LOTE", nombre: "El lote no coincide con la factura" },
  { codigo: "REGISTRO_SANITARIO", nombre: "Sin registro sanitario INVIMA" },
  { codigo: "CADENA_FRIO", nombre: "Cadena de frío rota (fuera de 2 a 8 °C)" },
  { codigo: "EMPAQUE", nombre: "Empaque dañado" },
  { codigo: "FALTANTE", nombre: "Llegaron menos unidades de las facturadas" },
  { codigo: "NO_SOLICITADO", nombre: "No está en la orden de compra" },
];

export const nombreMotivo = (m: string | null | undefined) => MOTIVOS.find((x) => x.codigo === m)?.nombre ?? "—";

/** El motivo dentro de una frase: solo la primera letra en minúscula ("INVIMA" y "°C" se quedan). */
const enFrase = (m: string | null | undefined) => {
  const t = nombreMotivo(m);
  return t.charAt(0).toLowerCase() + t.slice(1);
};

/** Situación de la jornada → motivo con el que se reconoce en el producto. */
export const MOTIVO_DE_SITUACION: Record<string, MotivoRecepcion> = {
  REC_VENCIMIENTO: "VENCIMIENTO",
  REC_LOTE: "LOTE",
  REC_INVIMA: "REGISTRO_SANITARIO",
  REC_FRIO: "CADENA_FRIO",
  REC_EMPAQUE: "EMPAQUE",
  REC_FALTANTE: "FALTANTE",
  REC_NO_SOLICITADO: "NO_SOLICITADO",
};

/** Lo que anota el receptor de cada producto, mirando la caja y la factura. */
export type RegistroItem = {
  cantidadContada: number;
  lote: string;
  /** "AAAA-MM" */
  vencimiento: string;
  /** Tal como aparece en la etiqueta; vacío = no trae. */
  registroInvima: string;
  /** Solo refrigerados: lo que marca el registrador de temperatura. */
  temperatura: number | null;
  empaqueIntegro: boolean;
  decision: "ACEPTAR" | "RECHAZAR";
  /** Obligatorio al rechazar y en el faltante. */
  motivo: MotivoRecepcion | null;
};

/** La verdad de un producto del pedido (ver `ItemRecepcion`). */
export type ItemVerdad = {
  nombre: string;
  requiereFrio: boolean;
  cantidadFacturada: number;
  cantidadLlega: number;
  loteReal: string;
  vencimientoReal: Date;
  registroEtiqueta: string | null;
  temperaturaLlegada: number | null;
  defecto: MotivoRecepcion | null;
};

export const mesAnio = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

/** Qué debe decidir el receptor con este producto. */
export function decisionEsperada(item: ItemVerdad): { decision: "ACEPTAR" | "RECHAZAR"; motivo: MotivoRecepcion | null } {
  if (item.defecto === null) return { decision: "ACEPTAR", motivo: null };
  if (item.defecto === "FALTANTE") return { decision: "ACEPTAR", motivo: "FALTANTE" };
  return { decision: "RECHAZAR", motivo: item.defecto };
}

const normalizar = (s: string) => s.replace(/[\s.-]/g, "").toUpperCase();

/** Califica un pedido recibido: los datos y la decisión de cada producto, y el acta. */
export function evaluarRecepcion(
  items: (ItemVerdad & { registro: RegistroItem | null })[],
  actaFirmada: boolean
): { criterios: Criterio[]; puntaje: number } {
  const criterios: Criterio[] = [];
  for (const item of items) {
    const r = item.registro;
    if (!r) {
      criterios.push({
        clave: "RECEPCION_DATOS",
        descripcion: `${item.nombre}: inspeccionar y registrar`,
        cumplido: false,
        detalle: "No lo registró.",
      });
      continue;
    }
    // Datos capturados de la caja
    const errores: string[] = [];
    if (r.cantidadContada !== item.cantidadLlega) errores.push(`contó ${r.cantidadContada} y llegaron ${item.cantidadLlega}`);
    if (normalizar(r.lote) !== normalizar(item.loteReal)) errores.push(`lote "${r.lote}" y la caja dice "${item.loteReal}"`);
    if (r.vencimiento !== mesAnio(item.vencimientoReal)) errores.push(`vencimiento ${r.vencimiento || "vacío"} y la caja dice ${mesAnio(item.vencimientoReal)}`);
    const invima = r.registroInvima.trim();
    if (item.registroEtiqueta === null ? invima !== "" : normalizar(invima) !== normalizar(item.registroEtiqueta)) {
      errores.push(item.registroEtiqueta === null ? "anotó un registro INVIMA que la etiqueta no trae" : "registro INVIMA mal anotado");
    }
    if (item.requiereFrio && (r.temperatura === null || Math.abs(r.temperatura - (item.temperaturaLlegada ?? 0)) > 0.5)) {
      errores.push("no anotó bien la temperatura del transporte");
    }
    criterios.push({
      clave: errores.length ? "RECEPCION_DATOS" : "RECEPCION_CORRECTA",
      descripcion: `${item.nombre}: registrar los datos de la caja`,
      cumplido: errores.length === 0,
      detalle: errores.length ? `${errores.join("; ")}.` : "Datos bien registrados.",
    });

    // Decisión
    const esperado = decisionEsperada(item);
    const bien = r.decision === esperado.decision && (r.motivo ?? null) === esperado.motivo;
    criterios.push({
      clave: bien ? "RECEPCION_CORRECTA" : "RECEPCION_DECISION",
      descripcion:
        esperado.decision === "ACEPTAR"
          ? esperado.motivo
            ? `${item.nombre}: recibir lo que llegó y dejar la novedad (${enFrase(esperado.motivo)})`
            : `${item.nombre}: aceptar (conforme)`
          : `${item.nombre}: rechazar y devolver (${enFrase(esperado.motivo)})`,
      cumplido: bien,
      detalle: `${r.decision === "ACEPTAR" ? "Lo aceptó" : "Lo rechazó"}${r.motivo ? `: ${enFrase(r.motivo)}` : ""}.`,
    });
  }
  criterios.push({
    clave: actaFirmada ? "RECEPCION_CORRECTA" : "RECEPCION_DECISION",
    descripcion: "Firmar el acta de recepción",
    cumplido: actaFirmada,
    detalle: actaFirmada ? "Firmada." : "No firmó el acta.",
  });
  const cumplidos = criterios.filter((c) => c.cumplido).length;
  return { criterios, puntaje: Math.round((cumplidos / criterios.length) * 100) };
}
