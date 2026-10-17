/**
 * Dispensación DENTRO de una Simulación: el paciente sale del pool generado (no de
 * `CasoDispensacion`) y el consumo se contabiliza por `simulacionId` (compartido entre
 * todos los estudiantes de la jornada), no por usuario — ver docs/simulacion.md.
 *
 * A propósito NO se reusa el checklist de avisos de la práctica libre (`evaluarRenglon`):
 * acá el sistema solo entrega datos crudos (el medicamento existe o no en el catálogo,
 * cuánto tiene autorizado, etc.) — sin decir "esto está bien" o "esto está mal". Que el
 * estudiante se equivoque o acierte al comparar contra la fórmula física es parte de lo que
 * se está practicando, no algo que la pantalla deba resolverle. Ver docs/simulacion.md.
 *
 * Cuota moderadora: NO se revela `esAltoCosto` del paciente hasta que el estudiante ya
 * decidió — es él quien tiene que leer el diagnóstico y marcar si califica, exactamente
 * como en la ventanilla real. Ver `calcularCuotaModeradora` (cuotaModeradora.ts) para el
 * cálculo puro y `RenglonCardSimulacion` (panel/dispensacion/page.tsx) para la vista previa
 * en vivo mientras el estudiante decide.
 *
 * Identidad: igual que con la cuota, el sistema NO dice quién está en la ventanilla. Muestra
 * el paciente de la fórmula (con su tipo de documento) y el estudiante compara con los
 * documentos que le presentan; registra quién reclama (`registrarRecogida`) antes de entregar.
 */
import { prisma } from "@/lib/nucleo/prisma";
import type { CategoriaAfiliado, DecisionRecogida } from "@prisma/client";
import { calcularCuotaModeradora } from "./cuotaModeradora";
import { actualizarPendienteDeReceta, existencias, registrarPendiente, type Existencia } from "./pendientes";

export type RenglonSimulacion = {
  // null cuando el medicamento existe en el catálogo pero el paciente NO tiene receta para
  // él — igual se puede "entregar" o "rechazar" (queda registrado con medicamentoId en vez
  // de recetaId), sin ningún aviso que lo distinga del resto.
  recetaId: string | null;
  medicamentoId: string;
  medicamentoNombre: string;
  presentacion: string;
  cantidadAutorizada: number;
  cantidadRedimida: number;
  saldoDisponible: number;
  fechaVigencia: string | null;
  /** Lo registrado en ESTA visita (antes de la constancia de pendiente, o después si ya la hay). */
  yaGestionado: { resultado: "ENTREGADO" | "RECHAZADO"; cantidad: number } | null;
  /** Lo que hay en el dispensario ahora; null = medicamento fuera del inventario de la jornada. */
  existencias: Existencia | null;
  pendiente: PendienteVista | null;
};

export type PendienteVista = {
  numero: number;
  medicamento: string;
  cantidad: number;
  modalidad: "ESTABLECIMIENTO" | "DOMICILIO";
  creadoEn: string;
  entregadoEn: string | null;
};

export type ResultadoBusquedaSimulacion = {
  encontrado: boolean;
  paciente: {
    nombre: string;
    cedula: string;
    tipoDocumento: string;
    edad: number;
    alergias: string[];
    antecedentes: string | null;
    diagnostico: string | null;
    categoriaAfiliado: CategoriaAfiliado | null;
    // Nunca se revela durante la jornada: es evaluada, y el acierto se ve en el reporte
    // que el docente muestra al final. Se deja el campo por compatibilidad (siempre null).
    esAltoCosto: boolean | null;
  } | null;
  // Aplica una vez por atención, no por renglón (ver docs/simulacion.md).
  cuota: {
    cobrada: boolean;
    /** lo que efectivamente se cobró; null mientras no se ha decidido */
    montoAplicado: number | null;
    /** lo que marcó el ESTUDIANTE al cobrar; null mientras no se ha decidido */
    altoCostoMarcado: boolean | null;
    /** si acertó: siempre null durante la jornada (evaluada); se ve en el reporte final */
    correcto: boolean | null;
  };
  // Lo que el estudiante ya registró sobre quién reclama (null = todavía no). No dice si
  // acertó: eso se ve en el reporte final.
  recogida: { decision: DecisionRecogida; documentoQuienReclama: string | null } | null;
  /** Constancias de pendiente del paciente (las de antes y las de esta jornada). */
  pendientes: PendienteVista[];
  // Cuántos renglones tiene la receta — informativo (para un "1 de 3 gestionados"), sin
  // revelar cuáles son: eso el estudiante lo tiene que buscar uno por uno, igual que pide
  // el documento en vez de que el sistema le diga quién es el paciente.
  totalRenglones: number;
};

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

async function pacienteDeLaSimulacion(simulacionId: string, cedula: string) {
  return prisma.paciente.findFirst({
    where: { cedula: cedula.trim(), simulacionId },
    include: {
      recetas: { include: { medicamento: true } },
      recogida: true,
      pendientes: { orderBy: { numero: "asc" }, include: { recetaElectronica: { include: { medicamento: true } } } },
    },
  });
}

type PacienteConTodo = NonNullable<Awaited<ReturnType<typeof pacienteDeLaSimulacion>>>;

function vistaPendiente(p: PacienteConTodo["pendientes"][number]): PendienteVista {
  return {
    numero: p.numero,
    medicamento: p.recetaElectronica.medicamento.nombre,
    cantidad: p.cantidad,
    modalidad: p.modalidad,
    creadoEn: p.creadoEn.toISOString(),
    entregadoEn: p.entregadoEn?.toISOString() ?? null,
  };
}

/** Viene a reclamar un pendiente de antes de la jornada: la cuota se cobró aquella vez. */
const cuotaYaCobradaAntes = (p: PacienteConTodo) => p.pendientes.some((x) => x.usuarioId === null);

export async function buscarPacienteSimulacion(simulacionId: string, cedula: string): Promise<ResultadoBusquedaSimulacion> {
  const paciente = await pacienteDeLaSimulacion(simulacionId, cedula);

  const vacio: ResultadoBusquedaSimulacion = {
    encontrado: false,
    paciente: null,
    cuota: { cobrada: false, montoAplicado: null, altoCostoMarcado: null, correcto: null },
    recogida: null,
    pendientes: [],
    totalRenglones: 0,
  };
  if (!paciente) return vacio;

  const entregaConCuota = await prisma.entregaSimulacion.findFirst({
    where: { simulacionId, pacienteId: paciente.id, altoCostoMarcado: { not: null } },
  });
  const cobradaAntes = cuotaYaCobradaAntes(paciente);
  const yaDecidida = entregaConCuota !== null || cobradaAntes;

  return {
    encontrado: true,
    paciente: {
      nombre: paciente.nombre,
      cedula: paciente.cedula,
      tipoDocumento: paciente.tipoDocumento,
      edad: paciente.edad,
      alergias: paciente.alergias,
      antecedentes: paciente.antecedentes,
      diagnostico: paciente.diagnostico,
      categoriaAfiliado: paciente.categoriaAfiliado,
      esAltoCosto: null,
    },
    cuota: {
      cobrada: yaDecidida,
      montoAplicado: cobradaAntes ? 0 : (entregaConCuota?.cuotaModeradora ?? null),
      altoCostoMarcado: entregaConCuota?.altoCostoMarcado ?? null,
      correcto: null,
    },
    recogida: paciente.recogida
      ? { decision: paciente.recogida.decision, documentoQuienReclama: paciente.recogida.documentoQuienReclama }
      : null,
    pendientes: paciente.pendientes.map(vistaPendiente),
    // Lo que quedaba por entregar al empezar la jornada (lo ya redimido antes no cuenta).
    totalRenglones: paciente.recetas.filter((r) => r.cantidadAutorizada > r.cantidadRedimida).length,
  };
}

/**
 * Busca UN medicamento puntual — lo que el estudiante tiene que hacer por cada medicamento
 * que le pida (o traiga escrito) la persona en la ventanilla, en vez de que el sistema le
 * muestre de una vez toda la fórmula. Busca en TODO el catálogo real, no solo en lo que el
 * paciente tiene autorizado — si el estudiante busca algo que no le corresponde, el sistema
 * lo encuentra igual (existe en el inventario); no hay ningún aviso que le diga si está bien
 * o mal, eso lo tiene que resolver comparando contra la fórmula física. "No se encontró"
 * queda solo para cuando el medicamento de verdad no existe en el catálogo.
 */
export async function buscarMedicamentoSimulacion(
  simulacionId: string,
  cedula: string,
  texto: string
): Promise<{ encontrado: boolean; renglones: RenglonSimulacion[] }> {
  const paciente = await pacienteDeLaSimulacion(simulacionId, cedula);
  if (!paciente) return { encontrado: false, renglones: [] };

  const buscado = normalizar(texto);
  const candidatos = await prisma.medicamento.findMany({
    where: { origen: "CATALOGO_REAL", nombre: { contains: texto, mode: "insensitive" } },
  });
  const coincidencias = candidatos.filter((m) => normalizar(m.nombre).includes(buscado));
  if (coincidencias.length === 0) return { encontrado: false, renglones: [] };

  const entregas = await prisma.entregaSimulacion.findMany({
    where: { simulacionId, pacienteId: paciente.id },
    orderBy: { creadoEn: "desc" },
  });
  const inventario = await existencias(simulacionId, coincidencias.map((m) => m.id));

  const renglones: RenglonSimulacion[] = coincidencias.map((med) => {
    const receta = paciente.recetas.find((r) => r.medicamentoId === med.id) ?? null;

    if (receta) {
      const redimidoEnSimulacion = entregas
        .filter((e) => e.recetaElectronicaId === receta.id && e.resultado === "ENTREGADO")
        .reduce((s, e) => s + e.cantidad, 0);
      const cantidadRedimida = receta.cantidadRedimida + redimidoEnSimulacion;
      const pendiente = paciente.pendientes.find((p) => p.recetaElectronicaId === receta.id) ?? null;
      // Esta visita: lo registrado después de la constancia (si la hay), que es lo único editable.
      const gestion =
        entregas.find((e) => e.recetaElectronicaId === receta.id && (!pendiente || e.creadoEn > pendiente.creadoEn)) ?? null;

      return {
        recetaId: receta.id,
        medicamentoId: med.id,
        medicamentoNombre: med.nombre,
        presentacion: med.presentacion,
        cantidadAutorizada: receta.cantidadAutorizada,
        cantidadRedimida,
        saldoDisponible: Math.max(0, receta.cantidadAutorizada - cantidadRedimida),
        fechaVigencia: receta.fechaVigencia.toISOString(),
        yaGestionado: gestion ? { resultado: gestion.resultado, cantidad: gestion.cantidad } : null,
        existencias: inventario.get(med.id) ?? null,
        pendiente: pendiente ? vistaPendiente(pendiente) : null,
      };
    }

    // Existe en el catálogo pero el paciente no tiene receta para él — se muestra exactamente
    // igual, sin ninguna marca que lo distinga.
    const gestion = entregas.find((e) => e.recetaElectronicaId === null && e.medicamentoId === med.id) ?? null;
    return {
      recetaId: null,
      medicamentoId: med.id,
      medicamentoNombre: med.nombre,
      presentacion: med.presentacion,
      cantidadAutorizada: 0,
      cantidadRedimida: 0,
      saldoDisponible: 0,
      fechaVigencia: null,
      yaGestionado: gestion ? { resultado: gestion.resultado, cantidad: gestion.cantidad } : null,
      existencias: inventario.get(med.id) ?? null,
      pendiente: null,
    };
  });

  return { encontrado: true, renglones };
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
    where: { simulacionId, pacienteId, altoCostoMarcado: { not: null } },
    select: { id: true },
  });
  if (yaDecidida) return { cuotaModeradora: 0, altoCostoMarcado: null };

  return { cuotaModeradora: calcularCuotaModeradora(categoriaAfiliado, altoCostoMarcado), altoCostoMarcado };
}

async function registrarEntrega(opts: {
  simulacionId: string;
  usuarioId: string;
  cedula: string;
  recetaId: string | null;
  medicamentoId: string;
  cantidad: number;
  resultado: "ENTREGADO" | "RECHAZADO";
  altoCostoMarcado: boolean;
}) {
  const paciente = await pacienteDeLaSimulacion(opts.simulacionId, opts.cedula);
  if (!paciente) throw new Error("Paciente no encontrado en esta simulación");
  if (!paciente.recogida) throw new Error("Primero registra quién reclama");
  if (paciente.recogida.decision === "NO_ENTREGA" && opts.resultado === "ENTREGADO") {
    throw new Error("Registraste que no se entrega: cambia esa decisión si de verdad corresponde entregar");
  }

  // Lo registrado en esta visita se puede corregir; lo de antes de la constancia de
  // pendiente ya se entregó y queda.
  const pendiente = opts.recetaId ? (paciente.pendientes.find((p) => p.recetaElectronicaId === opts.recetaId) ?? null) : null;
  const deEstaVisita = {
    ...(opts.recetaId
      ? { simulacionId: opts.simulacionId, recetaElectronicaId: opts.recetaId }
      : { simulacionId: opts.simulacionId, recetaElectronicaId: null, medicamentoId: opts.medicamentoId, pacienteId: paciente.id }),
    ...(pendiente ? { creadoEn: { gt: pendiente.creadoEn } } : {}),
  };

  // No se entrega lo que no hay en el dispensario.
  if (opts.resultado === "ENTREGADO") {
    const medicamentoId = paciente.recetas.find((r) => r.id === opts.recetaId)?.medicamentoId ?? opts.medicamentoId;
    const hay = (await existencias(opts.simulacionId, [medicamentoId])).get(medicamentoId);
    if (hay) {
      const reemplazada = await prisma.entregaSimulacion.aggregate({ where: { ...deEstaVisita, resultado: "ENTREGADO" }, _sum: { cantidad: true } });
      const disponible = hay.disponible + (reemplazada._sum.cantidad ?? 0);
      if (opts.cantidad > disponible) {
        throw new Error(
          disponible === 0
            ? "No hay existencias de este medicamento en el dispensario"
            : `Solo hay ${disponible} unidades en el dispensario: entrega esas y registra el pendiente`
        );
      }
    }
  }

  // La cuota se cobra con la primera ENTREGA: si solo se rechaza, no se entregó ningún
  // servicio y no hay nada que cobrar. Si viene por un pendiente de antes, ya se cobró.
  const cuota =
    opts.resultado === "ENTREGADO" && !cuotaYaCobradaAntes(paciente)
      ? await decidirCuota(opts.simulacionId, paciente.id, paciente.categoriaAfiliado, opts.altoCostoMarcado)
      : { cuotaModeradora: 0, altoCostoMarcado: null };

  await prisma.entregaSimulacion.deleteMany({ where: deEstaVisita });
  await prisma.entregaSimulacion.create({
    data: {
      simulacionId: opts.simulacionId,
      pacienteId: paciente.id,
      recetaElectronicaId: opts.recetaId,
      medicamentoId: opts.recetaId ? null : opts.medicamentoId,
      usuarioId: opts.usuarioId,
      cantidad: Math.max(0, Math.round(opts.cantidad)),
      resultado: opts.resultado,
      cuotaModeradora: cuota.cuotaModeradora,
      altoCostoMarcado: cuota.altoCostoMarcado,
    },
  });
  if (opts.recetaId) await actualizarPendienteDeReceta(opts.simulacionId, opts.recetaId);
}

/**
 * El estudiante registra lo que le queda debiendo al paciente de un renglón (después de
 * entregar lo que había) y le da la constancia. No puede ser más de lo que falta.
 */
export async function registrarPendienteSimulacion(opts: {
  simulacionId: string;
  usuarioId: string;
  cedula: string;
  recetaId: string;
  cantidad: number;
  modalidad: "ESTABLECIMIENTO" | "DOMICILIO";
  direccion: string | null;
  telefono: string | null;
}) {
  const paciente = await pacienteDeLaSimulacion(opts.simulacionId, opts.cedula);
  if (!paciente) throw new Error("Paciente no encontrado en esta simulación");
  const receta = paciente.recetas.find((r) => r.id === opts.recetaId);
  if (!receta) throw new Error("Ese medicamento no está en la fórmula de este paciente");
  const entregado = await prisma.entregaSimulacion.aggregate({
    where: { simulacionId: opts.simulacionId, recetaElectronicaId: receta.id, resultado: "ENTREGADO" },
    _sum: { cantidad: true },
  });
  const falta = receta.cantidadAutorizada - receta.cantidadRedimida - (entregado._sum.cantidad ?? 0);
  if (falta <= 0) throw new Error("Ya se entregó todo lo formulado de este medicamento");
  if (opts.cantidad > falta) throw new Error(`Solo falta entregar ${falta}`);
  return registrarPendiente({ ...opts, pacienteId: paciente.id });
}

export async function dispensarRenglonSimulacion(opts: {
  simulacionId: string;
  usuarioId: string;
  cedula: string;
  recetaId: string | null;
  medicamentoId: string;
  cantidad: number;
  altoCostoMarcado: boolean;
}) {
  await registrarEntrega({ ...opts, resultado: "ENTREGADO" });
}

export async function rechazarRenglonSimulacion(opts: {
  simulacionId: string;
  usuarioId: string;
  cedula: string;
  recetaId: string | null;
  medicamentoId: string;
  altoCostoMarcado: boolean;
}) {
  await registrarEntrega({ ...opts, cantidad: 0, resultado: "RECHAZADO" });
}

/**
 * Registra (o corrige) quién reclama los medicamentos de este paciente: él mismo, un tercero
 * con autorización (o el padre, madre o acudiente de un menor) con el número de su
 * documento, o que no se entrega porque los documentos no corresponden.
 */
export async function registrarRecogida(opts: {
  simulacionId: string;
  usuarioId: string;
  cedula: string;
  decision: DecisionRecogida;
  documentoQuienReclama: string | null;
}) {
  const paciente = await pacienteDeLaSimulacion(opts.simulacionId, opts.cedula);
  if (!paciente) throw new Error("Paciente no encontrado en esta simulación");
  const documento = opts.decision === "TERCERO" ? opts.documentoQuienReclama?.trim() || null : null;
  if (opts.decision === "TERCERO" && !documento) throw new Error("Escribe el número de documento de quien reclama");
  if (opts.decision === "NO_ENTREGA") {
    // Si ya había entregado algo y luego decide no entregar, lo entregado deja de contar.
    await prisma.entregaSimulacion.deleteMany({
      where: { simulacionId: opts.simulacionId, pacienteId: paciente.id, resultado: "ENTREGADO" },
    });
  }
  const datos = { usuarioId: opts.usuarioId, decision: opts.decision, documentoQuienReclama: documento };
  await prisma.recogidaSimulacion.upsert({
    where: { pacienteId: paciente.id },
    update: datos,
    create: { ...datos, simulacionId: opts.simulacionId, pacienteId: paciente.id },
  });
}
