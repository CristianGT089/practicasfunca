/**
 * Dispensación DENTRO de una Simulación: el paciente sale del pool generado (no de
 * `CasoDispensacion`) y el consumo se contabiliza por `simulacionId` (compartido entre
 * todos los estudiantes de la jornada), no por usuario — ver docs/simulacion.md. Reusa
 * `evaluarRenglon` de la práctica libre de Dispensación en vez de duplicar el checklist de
 * avisos; lo que cambia acá es de dónde sale el paciente/receta y dónde queda el registro.
 *
 * Cuota moderadora: NO se revela `esAltoCosto` del paciente hasta que el estudiante ya
 * decidió — es él quien tiene que leer el diagnóstico y marcar si califica, exactamente
 * como en la ventanilla real. Ver `calcularCuotaModeradora` (cuotaModeradora.ts) para el
 * cálculo puro y `RenglonCardSimulacion` (panel/dispensacion/page.tsx) para la vista previa
 * en vivo mientras el estudiante decide.
 */
import { prisma } from "@/lib/nucleo/prisma";
import type { CategoriaAfiliado, TipoRecogida } from "@prisma/client";
import { evaluarRenglon, type AutorizacionSistema, type EvaluacionRenglon } from "@/lib/modulos/dispensacion/reglas";
import { calcularCuotaModeradora } from "./cuotaModeradora";

export type RenglonSimulacion = EvaluacionRenglon & {
  recetaId: string;
  medicamentoNombre: string;
  presentacion: string;
  cantidadAutorizada: number;
  cantidadRedimida: number;
  saldoDisponible: number;
  fechaVigencia: string;
  yaGestionado: { resultado: "ENTREGADO" | "RECHAZADO"; cantidad: number } | null;
};

export type ResultadoBusquedaSimulacion = {
  encontrado: boolean;
  paciente: {
    nombre: string;
    cedula: string;
    edad: number;
    alergias: string[];
    antecedentes: string | null;
    diagnostico: string | null;
    categoriaAfiliado: CategoriaAfiliado | null;
    // Solo se revela una vez que ya se cobró la cuota (ver `cuota` abajo) — antes de eso
    // el estudiante tiene que decidirlo leyendo el diagnóstico, no consultarlo.
    esAltoCosto: boolean | null;
  } | null;
  // Aplica una vez por atención, no por renglón (ver docs/simulacion.md).
  cuota: {
    cobrada: boolean;
    /** lo que efectivamente se cobró; null mientras no se ha decidido */
    montoAplicado: number | null;
    /** lo que marcó el ESTUDIANTE al cobrar; null mientras no se ha decidido */
    altoCostoMarcado: boolean | null;
    /** si acertó comparado con el diagnóstico real; null mientras no se ha decidido */
    correcto: boolean | null;
  };
  // Quién está realmente en la ventanilla (fase 5): null si es el paciente mismo.
  personaEnVentanilla: {
    tipo: Exclude<TipoRecogida, "EL_MISMO">;
    nombre: string;
    cedula: string;
    relacion: string | null;
  } | null;
  renglones: RenglonSimulacion[];
};

export async function buscarPacienteSimulacion(simulacionId: string, cedula: string): Promise<ResultadoBusquedaSimulacion> {
  const doc = cedula.trim();
  const paciente = await prisma.paciente.findFirst({
    where: { cedula: doc, simulacionId },
    include: { recetas: { include: { medicamento: true } } },
  });

  const vacio: ResultadoBusquedaSimulacion = {
    encontrado: false,
    paciente: null,
    cuota: { cobrada: false, montoAplicado: null, altoCostoMarcado: null, correcto: null },
    personaEnVentanilla: null,
    renglones: [],
  };
  if (!paciente) return vacio;

  const entregas = await prisma.entregaSimulacion.findMany({
    where: { simulacionId, recetaElectronica: { pacienteId: paciente.id } },
  });

  const redimidoEnSimulacion = (recetaId: string) =>
    entregas
      .filter((e) => e.recetaElectronicaId === recetaId && e.resultado === "ENTREGADO")
      .reduce((s, e) => s + e.cantidad, 0);

  const identidadCoincide = paciente.tipoRecogida === "EL_MISMO";
  const terceroAutorizado = paciente.tipoRecogida === "TERCERO_AUTORIZADO";

  const renglones: RenglonSimulacion[] = paciente.recetas.map((r) => {
    const auth: AutorizacionSistema = {
      recetaElectronicaId: r.id,
      medico: r.medico,
      cantidadAutorizada: r.cantidadAutorizada,
      cantidadRedimida: r.cantidadRedimida + redimidoEnSimulacion(r.id),
      fechaVigencia: r.fechaVigencia.toISOString(),
    };

    const evaluacion = evaluarRenglon({
      cantidadPapel: r.cantidadAutorizada,
      cantidadTachada: null,
      medicamentoNombre: r.medicamento.nombre,
      medicamentoTags: r.medicamento.tags,
      medicamentoStock: r.medicamento.stock,
      medicoFormula: r.medico,
      formulaCargadaEnSistema: true,
      alergiasPaciente: paciente.alergias,
      identidadCoincide,
      terceroAutorizado,
      autorizacion: auth,
    });

    const gestion = entregas.find((e) => e.recetaElectronicaId === r.id) ?? null;

    return {
      ...evaluacion,
      recetaId: r.id,
      medicamentoNombre: r.medicamento.nombre,
      presentacion: r.medicamento.presentacion,
      cantidadAutorizada: r.cantidadAutorizada,
      cantidadRedimida: auth.cantidadRedimida,
      saldoDisponible: Math.max(0, auth.cantidadAutorizada - auth.cantidadRedimida),
      fechaVigencia: auth.fechaVigencia,
      yaGestionado: gestion ? { resultado: gestion.resultado, cantidad: gestion.cantidad } : null,
    };
  });

  // La entrega que cobró la cuota es la que trae `altoCostoMarcado` no nulo (ver
  // `decidirCuota` más abajo) — solo puede haber una por paciente en la simulación.
  const entregaConCuota = entregas.find((e) => e.altoCostoMarcado !== null) ?? null;
  const yaDecidida = entregaConCuota !== null;

  return {
    encontrado: true,
    paciente: {
      nombre: paciente.nombre,
      cedula: paciente.cedula,
      edad: paciente.edad,
      alergias: paciente.alergias,
      antecedentes: paciente.antecedentes,
      diagnostico: paciente.diagnostico,
      categoriaAfiliado: paciente.categoriaAfiliado,
      esAltoCosto: yaDecidida ? paciente.esAltoCosto : null,
    },
    cuota: {
      cobrada: yaDecidida,
      montoAplicado: entregaConCuota?.cuotaModeradora ?? null,
      altoCostoMarcado: entregaConCuota?.altoCostoMarcado ?? null,
      correcto: yaDecidida ? entregaConCuota!.altoCostoMarcado === paciente.esAltoCosto : null,
    },
    personaEnVentanilla:
      paciente.tipoRecogida === "EL_MISMO"
        ? null
        : {
            tipo: paciente.tipoRecogida,
            nombre: paciente.personaRecogeNombre ?? "Sin nombre registrado",
            cedula: paciente.personaRecogeCedula ?? "—",
            relacion: paciente.personaRecogeRelacion,
          },
    renglones,
  };
}

async function recetaDeLaSimulacion(simulacionId: string, recetaId: string) {
  const receta = await prisma.recetaElectronica.findFirst({
    where: { id: recetaId, paciente: { simulacionId } },
    include: { paciente: true },
  });
  if (!receta) throw new Error("Receta no encontrada en esta simulación");
  return receta;
}

/**
 * Si esta es la primera entrega del paciente en la simulación, cobra la cuota moderadora
 * usando lo que el ESTUDIANTE marcó (`altoCostoMarcado`) — no la verdad del sistema — y
 * deja constancia de esa marca para poder dar retroalimentación después. Si ya se había
 * decidido antes (por este u otro renglón), no vuelve a cobrar ni a cambiar la marca.
 */
async function decidirCuota(
  simulacionId: string,
  pacienteId: string,
  categoriaAfiliado: CategoriaAfiliado | null,
  altoCostoMarcado: boolean
): Promise<{ cuotaModeradora: number; altoCostoMarcado: boolean | null }> {
  const yaDecidida = await prisma.entregaSimulacion.findFirst({
    where: { simulacionId, recetaElectronica: { pacienteId }, altoCostoMarcado: { not: null } },
    select: { id: true },
  });
  if (yaDecidida) return { cuotaModeradora: 0, altoCostoMarcado: null };

  return { cuotaModeradora: calcularCuotaModeradora(categoriaAfiliado, altoCostoMarcado), altoCostoMarcado };
}

export async function dispensarRenglonSimulacion(
  simulacionId: string,
  usuarioId: string,
  recetaId: string,
  cantidad: number,
  altoCostoMarcado: boolean
) {
  const receta = await recetaDeLaSimulacion(simulacionId, recetaId);
  const cuota = await decidirCuota(simulacionId, receta.pacienteId, receta.paciente.categoriaAfiliado, altoCostoMarcado);

  await prisma.entregaSimulacion.deleteMany({ where: { simulacionId, recetaElectronicaId: recetaId } });
  await prisma.entregaSimulacion.create({
    data: {
      simulacionId,
      recetaElectronicaId: recetaId,
      usuarioId,
      cantidad: Math.max(0, Math.round(cantidad)),
      resultado: "ENTREGADO",
      cuotaModeradora: cuota.cuotaModeradora,
      altoCostoMarcado: cuota.altoCostoMarcado,
    },
  });
}

export async function rechazarRenglonSimulacion(
  simulacionId: string,
  usuarioId: string,
  recetaId: string,
  altoCostoMarcado: boolean
) {
  const receta = await recetaDeLaSimulacion(simulacionId, recetaId);
  const cuota = await decidirCuota(simulacionId, receta.pacienteId, receta.paciente.categoriaAfiliado, altoCostoMarcado);

  await prisma.entregaSimulacion.deleteMany({ where: { simulacionId, recetaElectronicaId: recetaId } });
  await prisma.entregaSimulacion.create({
    data: {
      simulacionId,
      recetaElectronicaId: recetaId,
      usuarioId,
      cantidad: 0,
      resultado: "RECHAZADO",
      cuotaModeradora: cuota.cuotaModeradora,
      altoCostoMarcado: cuota.altoCostoMarcado,
    },
  });
}
