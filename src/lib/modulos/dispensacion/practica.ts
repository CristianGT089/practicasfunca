/**
 * Lógica de servidor de la práctica de dispensación: sesión del estudiante, secuencia de
 * casos, búsqueda del paciente y registro de entregas/rechazos. Sin nota.
 */
import { prisma } from "@/lib/nucleo/prisma";
import { evaluarRenglon, type AutorizacionSistema, type EvaluacionRenglon } from "./reglas";

const casoInclude = {
  paciente: true,
  formulas: {
    orderBy: { fechaEmision: "asc" as const },
    include: { renglones: { include: { medicamento: true }, orderBy: { id: "asc" as const } } },
  },
};

type CasoCompleto = Awaited<ReturnType<typeof cargarCasos>>[number];

async function cargarCasos() {
  return prisma.casoDispensacion.findMany({
    where: { activo: true },
    orderBy: [{ orden: "asc" }, { creadoEn: "asc" }],
    include: casoInclude,
  });
}

export async function obtenerSesion(usuarioId: string) {
  const existente = await prisma.sesionDispensacion.findFirst({
    where: { usuarioId },
    orderBy: { iniciadaEn: "desc" },
  });
  return existente ?? prisma.sesionDispensacion.create({ data: { usuarioId } });
}

export async function reiniciarSesion(usuarioId: string) {
  await prisma.sesionDispensacion.deleteMany({ where: { usuarioId } });
  return prisma.sesionDispensacion.create({ data: { usuarioId } });
}

export async function avanzarCaso(usuarioId: string) {
  const sesion = await obtenerSesion(usuarioId);
  const total = await prisma.casoDispensacion.count({ where: { activo: true } });
  const nuevoIndice = sesion.indiceCaso + 1;
  await prisma.sesionDispensacion.update({
    where: { id: sesion.id },
    data: { indiceCaso: nuevoIndice },
  });
  return { terminado: nuevoIndice >= total };
}

// ---------- Snapshot del caso actual (sin ficha del paciente: eso sale al buscar) ----------

export type CasoPublico = {
  id: string;
  titulo: string;
  contexto: string | null;
  personaPresenta: { documento: string };
  formulas: {
    id: string;
    medico: string;
    registroMedico: string;
    ips: string | null;
    fechaEmision: string;
    diasVigencia: number;
    vigenteHasta: string;
    vencida: boolean;
    cargadaEnSistema: boolean;
    nota: string | null;
    renglones: {
      id: string;
      medicamentoNombre: string;
      presentacion: string;
      cantidad: number;
      cantidadTachada: number | null;
      posologia: string | null;
    }[];
  }[];
};

export type SnapshotPractica = {
  progreso: { indice: number; total: number };
  terminado: boolean;
  caso: CasoPublico | null;
};

function fechaVigencia(emision: Date, dias: number) {
  const d = new Date(emision);
  d.setDate(d.getDate() + dias);
  return d;
}

async function casoActual(usuarioId: string): Promise<{ caso: CasoCompleto | null; indice: number; total: number }> {
  const sesion = await obtenerSesion(usuarioId);
  const casos = await cargarCasos();
  return { caso: casos[sesion.indiceCaso] ?? null, indice: sesion.indiceCaso, total: casos.length };
}

export async function snapshotPractica(usuarioId: string): Promise<SnapshotPractica> {
  const { caso, indice, total } = await casoActual(usuarioId);
  if (!caso) {
    return { progreso: { indice, total }, terminado: total > 0 && indice >= total, caso: null };
  }

  return {
    progreso: { indice, total },
    terminado: false,
    caso: {
      id: caso.id,
      titulo: caso.titulo,
      contexto: caso.contexto,
      personaPresenta: { documento: caso.documentoPresentado ?? caso.paciente.cedula },
      formulas: caso.formulas.map((f) => {
        const vence = fechaVigencia(f.fechaEmision, f.diasVigencia);
        return {
          id: f.id,
          medico: f.medico,
          registroMedico: f.registroMedico,
          ips: f.ips,
          fechaEmision: f.fechaEmision.toISOString(),
          diasVigencia: f.diasVigencia,
          vigenteHasta: vence.toISOString(),
          vencida: vence < new Date(),
          cargadaEnSistema: f.cargadaEnSistema,
          nota: f.nota,
          renglones: f.renglones.map((r) => ({
            id: r.id,
            medicamentoNombre: r.medicamento.nombre,
            presentacion: r.medicamento.presentacion,
            cantidad: r.cantidad,
            cantidadTachada: r.cantidadTachada,
            posologia: r.posologia,
          })),
        };
      }),
    },
  };
}

// ---------- Buscar paciente + estado de cada renglón contra el sistema ----------

export type EstadoRenglon = EvaluacionRenglon & {
  renglonId: string;
  formulaId: string;
  medicamentoNombre: string;
  cantidad: number;
  autorizacion:
    | { cantidadAutorizada: number; cantidadRedimida: number; saldoDisponible: number; medico: string; fechaVigencia: string }
    | null;
  yaGestionado: { resultado: "ENTREGADO" | "RECHAZADO"; cantidad: number; motivo: string | null } | null;
};

export type ResultadoBusqueda = {
  encontrado: boolean;
  esPacienteDeLaFormula: boolean;
  paciente: { nombre: string; cedula: string; edad: number; alergias: string[]; antecedentes: string | null } | null;
  identidadCoincide: boolean;
  renglones: EstadoRenglon[];
};

export async function buscarPaciente(usuarioId: string, documento: string): Promise<ResultadoBusqueda> {
  const { caso } = await casoActual(usuarioId);
  const doc = documento.trim();
  const encontrado = await prisma.paciente.findUnique({ where: { cedula: doc } });

  const vacio: ResultadoBusqueda = {
    encontrado: false,
    esPacienteDeLaFormula: false,
    paciente: null,
    identidadCoincide: false,
    renglones: [],
  };
  if (!caso) return vacio;
  if (!encontrado) return vacio;

  const esPacienteDeLaFormula = encontrado.id === caso.pacienteId;
  const pacientePublico = {
    nombre: encontrado.nombre,
    cedula: encontrado.cedula,
    edad: encontrado.edad,
    alergias: encontrado.alergias,
    antecedentes: encontrado.antecedentes,
  };

  if (!esPacienteDeLaFormula) {
    return { ...vacio, encontrado: true, esPacienteDeLaFormula: false, paciente: pacientePublico };
  }

  const identidadCoincide = (caso.documentoPresentado ?? caso.paciente.cedula) === caso.paciente.cedula;

  const [autorizaciones, sesion] = await Promise.all([
    prisma.recetaElectronica.findMany({ where: { pacienteId: caso.pacienteId }, include: { medicamento: true } }),
    obtenerSesion(usuarioId),
  ]);
  const entregas = await prisma.entregaDispensacion.findMany({ where: { sesionId: sesion.id } });

  const redimidoEnSesion = (recetaId: string) =>
    entregas
      .filter((e) => e.recetaElectronicaId === recetaId && e.resultado === "ENTREGADO")
      .reduce((s, e) => s + e.cantidad, 0);

  const renglones: EstadoRenglon[] = caso.formulas.flatMap((f) =>
    f.renglones.map((r) => {
      const receta = autorizaciones.find((a) => a.medicamentoId === r.medicamentoId) ?? null;
      const auth: AutorizacionSistema | null = receta
        ? {
            recetaElectronicaId: receta.id,
            medico: receta.medico,
            cantidadAutorizada: receta.cantidadAutorizada,
            cantidadRedimida: receta.cantidadRedimida + redimidoEnSesion(receta.id),
            fechaVigencia: receta.fechaVigencia.toISOString(),
          }
        : null;

      const evaluacion = evaluarRenglon({
        cantidadPapel: r.cantidad,
        cantidadTachada: r.cantidadTachada,
        medicamentoNombre: r.medicamento.nombre,
        medicamentoTags: r.medicamento.tags,
        medicamentoStock: r.medicamento.stock,
        medicoFormula: f.medico,
        formulaCargadaEnSistema: f.cargadaEnSistema,
        alergiasPaciente: caso.paciente.alergias,
        identidadCoincide,
        autorizacion: auth,
      });

      const gestion = entregas.find((e) => e.renglonFormulaId === r.id) ?? null;

      return {
        ...evaluacion,
        renglonId: r.id,
        formulaId: f.id,
        medicamentoNombre: r.medicamento.nombre,
        cantidad: r.cantidad,
        autorizacion: auth
          ? {
              cantidadAutorizada: auth.cantidadAutorizada,
              cantidadRedimida: auth.cantidadRedimida,
              saldoDisponible: Math.max(0, auth.cantidadAutorizada - auth.cantidadRedimida),
              medico: auth.medico,
              fechaVigencia: auth.fechaVigencia,
            }
          : null,
        yaGestionado: gestion
          ? { resultado: gestion.resultado, cantidad: gestion.cantidad, motivo: gestion.motivo }
          : null,
      };
    })
  );

  return { encontrado: true, esPacienteDeLaFormula: true, paciente: pacientePublico, identidadCoincide, renglones };
}

// ---------- Entregar / rechazar un renglón ----------

export async function dispensarRenglon(usuarioId: string, renglonId: string, cantidad: number) {
  const { caso } = await casoActual(usuarioId);
  if (!caso) throw new Error("No hay un caso activo");
  const renglon = caso.formulas.flatMap((f) => f.renglones.map((r) => ({ r, f }))).find((x) => x.r.id === renglonId);
  if (!renglon) throw new Error("Renglón no encontrado en el caso actual");

  const sesion = await obtenerSesion(usuarioId);
  const receta = await prisma.recetaElectronica.findFirst({
    where: { pacienteId: caso.pacienteId, medicamentoId: renglon.r.medicamentoId },
  });

  await prisma.entregaDispensacion.deleteMany({ where: { sesionId: sesion.id, renglonFormulaId: renglonId } });
  await prisma.entregaDispensacion.create({
    data: {
      sesionId: sesion.id,
      casoId: caso.id,
      renglonFormulaId: renglonId,
      medicamentoId: renglon.r.medicamentoId,
      cantidad: Math.max(0, Math.round(cantidad)),
      resultado: "ENTREGADO",
      recetaElectronicaId: receta?.id ?? null,
    },
  });
}

export async function rechazarRenglon(usuarioId: string, renglonId: string, motivo: string) {
  const { caso } = await casoActual(usuarioId);
  if (!caso) throw new Error("No hay un caso activo");
  const renglon = caso.formulas.flatMap((f) => f.renglones).find((r) => r.id === renglonId);
  if (!renglon) throw new Error("Renglón no encontrado en el caso actual");

  const sesion = await obtenerSesion(usuarioId);
  await prisma.entregaDispensacion.deleteMany({ where: { sesionId: sesion.id, renglonFormulaId: renglonId } });
  await prisma.entregaDispensacion.create({
    data: {
      sesionId: sesion.id,
      casoId: caso.id,
      renglonFormulaId: renglonId,
      medicamentoId: renglon.medicamentoId,
      cantidad: 0,
      resultado: "RECHAZADO",
      motivo: motivo.trim() || null,
    },
  });
}
