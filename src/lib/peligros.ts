import { Accion, Medicamento, Paciente, PasoEsperado, TipoAccion } from "@prisma/client";

export type ContextoEscenario = {
  recetaPresentada: boolean;
  paciente: Paciente | null;
};

/**
 * Evalúa si agregar `medicamento` a la venta es una decisión clínicamente peligrosa,
 * sin importar el modo de juego. Devuelve la lista de razones (vacía si no hay peligro).
 */
export function evaluarPeligroAgregar(
  medicamento: Medicamento,
  contexto: ContextoEscenario,
  accionesPrevias: Accion[]
): string[] {
  const razones: string[] = [];

  if (contexto.paciente) {
    const tagAlergico = medicamento.tags.find((t) => contexto.paciente!.alergias.includes(t));
    if (tagAlergico) {
      razones.push(`El paciente es alérgico a este medicamento (${tagAlergico}).`);
    }
  }

  if (medicamento.stock <= 0) {
    razones.push("No hay stock disponible de este medicamento.");
  }

  if (medicamento.loteVencimiento && new Date(medicamento.loteVencimiento) < new Date()) {
    razones.push("El lote de este medicamento está vencido.");
  }

  if (medicamento.esControlado) {
    const registrado = accionesPrevias.some(
      (a) =>
        a.tipo === TipoAccion.REGISTRAR_CONTROLADO &&
        (a.payload as { medicamentoId?: string } | null)?.medicamentoId === medicamento.id
    );
    if (!registrado) {
      razones.push("Es un medicamento controlado y no lo registraste como tal antes de venderlo.");
    }
  }

  if (medicamento.requiereReceta && !contexto.recetaPresentada && !recetaValidadaOnline(medicamento.id, accionesPrevias)) {
    razones.push("Este medicamento requiere receta médica y el cliente no presentó una válida (ni física ni en línea).");
  }

  return razones;
}

/** ¿Hay una acción previa de búsqueda en línea que haya encontrado una receta VIGENTE para este medicamento? */
function recetaValidadaOnline(medicamentoId: string, accionesPrevias: Accion[]): boolean {
  return accionesPrevias.some((a) => {
    if (a.tipo !== TipoAccion.BUSCAR_RECETA_ONLINE) return false;
    const payload = a.payload as { resultados?: { medicamentoId?: string; estado?: string }[] } | null;
    return !!payload?.resultados?.some((r) => r.medicamentoId === medicamentoId && r.estado === "VIGENTE");
  });
}

/**
 * Compara un conjunto de parámetros esperados contra el payload real de una acción,
 * con soporte especial para `motivos`: se exige que todos los motivos esperados estén
 * presentes en el payload (subconjunto), no una igualdad exacta de arreglo.
 */
export function coincideParametrosConMotivos(
  esperado: Record<string, unknown> | null | undefined,
  payload: Record<string, unknown> | null | undefined
): boolean {
  if (!esperado || typeof esperado !== "object") return true;
  if (!payload) return false;
  return Object.entries(esperado).every(([clave, valor]) => {
    if (clave === "motivos" && Array.isArray(valor)) {
      const motivosPayload = Array.isArray(payload.motivos) ? (payload.motivos as unknown[]) : [];
      return valor.every((m) => motivosPayload.includes(m));
    }
    return payload[clave] === valor;
  });
}

/**
 * Acciones de "investigar" (buscar, consultar, verificar) que un técnico cuidadoso puede
 * hacer siempre, aunque este caso puntual no las necesite para resolverse — nunca cuestan
 * un corazón en modo difícil, sin importar si aparecen o no en el checklist esperado.
 */
const ACCIONES_SIEMPRE_PERMITIDAS: TipoAccion[] = [
  TipoAccion.BUSCAR_MEDICAMENTO,
  TipoAccion.VER_FICHA_PACIENTE,
  TipoAccion.VERIFICAR_RECETA,
  TipoAccion.SOLICITAR_CEDULA,
  TipoAccion.BUSCAR_RECETA_ONLINE,
];

/**
 * En modo difícil: ¿esta acción corresponde a algún paso del checklist del escenario,
 * sin importar el orden? Si no corresponde a ninguno, se considera un clic fuera de lo esperado.
 */
export function estaFueraDeChecklist(
  tipo: TipoAccion,
  payload: Record<string, unknown> | null | undefined,
  pasosEsperados: PasoEsperado[]
): boolean {
  if (ACCIONES_SIEMPRE_PERMITIDAS.includes(tipo)) return false;
  return !pasosEsperados.some((paso) => {
    if (paso.tipoAccion !== tipo) return false;
    return coincideParametrosConMotivos(paso.parametros as Record<string, unknown> | null, payload);
  });
}

/** Cuenta cuántos pasos del checklist ya fueron cumplidos, sin revelar cuáles son. */
export function contarPasosCumplidos(pasosEsperados: PasoEsperado[], acciones: Accion[]): { completados: number; total: number } {
  const usadas = new Set<string>();
  let completados = 0;

  for (const paso of pasosEsperados) {
    const candidata = acciones.find((a) => {
      if (usadas.has(a.id) || a.tipo !== paso.tipoAccion) return false;
      return coincideParametrosConMotivos(
        paso.parametros as Record<string, unknown> | null,
        a.payload as Record<string, unknown> | null
      );
    });
    if (candidata) {
      usadas.add(candidata.id);
      completados += 1;
    }
  }

  return { completados, total: pasosEsperados.length };
}
