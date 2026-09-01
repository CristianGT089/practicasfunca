/**
 * Vocabulario de acciones y resultados del módulo Farmacia. Antes vivía como enum de
 * Postgres (`TipoAccion`, `ResultadoEsperado`); ahora es texto libre por módulo, así que
 * el vocabulario vive en código (usado por el editor de escenarios en el admin y por la
 * UI del "software" simulado del estudiante).
 */
export const TIPOS_ACCION_FARMACIA = [
  "BUSCAR_MEDICAMENTO",
  "VER_FICHA_PACIENTE",
  "VERIFICAR_RECETA",
  "VERIFICAR_ALERGIA",
  "VERIFICAR_STOCK",
  "VERIFICAR_VENCIMIENTO",
  "REGISTRAR_CONTROLADO",
  "SOLICITAR_CEDULA",
  "BUSCAR_RECETA_ONLINE",
  "ESCALAR_A_SUPERVISOR",
  "AGREGAR_A_VENTA",
  "QUITAR_DE_VENTA",
  "COMPLETAR_VENTA",
  "RECHAZAR_VENTA",
  "AJUSTAR_INVENTARIO",
] as const;

export const RESULTADOS_FARMACIA = {
  VENTA_CORRECTA: "VENTA_CORRECTA",
  RECHAZO_CORRECTO: "RECHAZO_CORRECTO",
} as const;
