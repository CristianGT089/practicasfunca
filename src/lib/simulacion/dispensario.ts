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
 */
import { prisma } from "@/lib/nucleo/prisma";
import type { CategoriaAfiliado, TipoRecogida } from "@prisma/client";
import { calcularCuotaModeradora } from "./cuotaModeradora";

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
    include: { recetas: { include: { medicamento: true } } },
  });
}

export async function buscarPacienteSimulacion(simulacionId: string, cedula: string): Promise<ResultadoBusquedaSimulacion> {
  const paciente = await pacienteDeLaSimulacion(simulacionId, cedula);

  const vacio: ResultadoBusquedaSimulacion = {
    encontrado: false,
    paciente: null,
    cuota: { cobrada: false, montoAplicado: null, altoCostoMarcado: null, correcto: null },
    personaEnVentanilla: null,
    totalRenglones: 0,
  };
  if (!paciente) return vacio;

  const entregaConCuota = await prisma.entregaSimulacion.findFirst({
    where: { simulacionId, pacienteId: paciente.id, altoCostoMarcado: { not: null } },
  });
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
    totalRenglones: paciente.recetas.length,
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

  const entregas = await prisma.entregaSimulacion.findMany({ where: { simulacionId, pacienteId: paciente.id } });

  const renglones: RenglonSimulacion[] = coincidencias.map((med) => {
    const receta = paciente.recetas.find((r) => r.medicamentoId === med.id) ?? null;

    if (receta) {
      const redimidoEnSimulacion = entregas
        .filter((e) => e.recetaElectronicaId === receta.id && e.resultado === "ENTREGADO")
        .reduce((s, e) => s + e.cantidad, 0);
      const cantidadRedimida = receta.cantidadRedimida + redimidoEnSimulacion;
      const gestion = entregas.find((e) => e.recetaElectronicaId === receta.id) ?? null;

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

  const cuota = await decidirCuota(opts.simulacionId, paciente.id, paciente.categoriaAfiliado, opts.altoCostoMarcado);

  await prisma.entregaSimulacion.deleteMany({
    where: opts.recetaId
      ? { simulacionId: opts.simulacionId, recetaElectronicaId: opts.recetaId }
      : { simulacionId: opts.simulacionId, recetaElectronicaId: null, medicamentoId: opts.medicamentoId, pacienteId: paciente.id },
  });
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
