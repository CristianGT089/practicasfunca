/**
 * Inventario del dispensario en una jornada y pendientes de entrega (Res. 1604 de 2013: la
 * entrega debe ser completa; si no, lo que falta se entrega en máximo 48 horas, en el
 * domicilio o trabajo del afiliado si él lo autoriza, y queda constancia).
 *
 * - Existencias: al crear la jornada se arma el inventario con lo que piden las fórmulas.
 *   En los casos de pendiente hay menos de lo formulado (`RecetaElectronica.deficitJornada`).
 * - Pedido: al registrar el primer pendiente de un medicamento se programa el pedido al
 *   proveedor, que llega solo a los MINUTOS_PEDIDO (en clase, "dos días" son unos minutos).
 * - Constancia: cada pendiente lleva un número ("P-0003") que el estudiante le da al paciente.
 *   Cuando vuelve y se le entrega lo que faltaba, el pendiente queda entregado.
 */
import type { ModalidadPendiente } from "@prisma/client";
import { prisma } from "@/lib/nucleo/prisma";
import { numeroConstancia } from "./constancias";

export const MINUTOS_PEDIDO = 3;
export { numeroConstancia, PLAZO_PENDIENTE_HORAS } from "./constancias";

/**
 * Arma (o rehace, mientras la jornada está en borrador) el inventario y los pendientes de
 * antes de la jornada a partir de las fórmulas guardadas:
 * - existencia inicial de cada medicamento = lo que falta entregar de todas las fórmulas,
 *   menos los déficits de los casos de pendiente; el pedido trae esos déficits.
 * - casos que vienen a reclamar: el renglón entregado en parte tiene su pendiente, con
 *   fecha de ayer (dentro de las 48 horas) y modalidad "vuelve a reclamarlo".
 */
export async function reconstruirInventario(simulacionId: string) {
  const pacientes = await prisma.paciente.findMany({
    where: { simulacionId },
    orderBy: { creadoEn: "asc" },
    include: { recetas: { orderBy: { creadoEn: "asc" } } },
  });

  const porMedicamento = new Map<string, { inicial: number; reposicion: number }>();
  for (const p of pacientes) {
    for (const r of p.recetas) {
      const saldo = Math.max(0, r.cantidadAutorizada - r.cantidadRedimida);
      const actual = porMedicamento.get(r.medicamentoId) ?? { inicial: 0, reposicion: 0 };
      actual.inicial += Math.max(0, saldo - r.deficitJornada);
      actual.reposicion += r.deficitJornada;
      porMedicamento.set(r.medicamentoId, actual);
    }
  }

  const reclamos = pacientes.flatMap((p) =>
    p.situaciones.includes("RECLAMA_PENDIENTE")
      ? p.recetas
          .filter((r) => r.cantidadRedimida > 0 && r.cantidadRedimida < r.cantidadAutorizada)
          .map((r) => ({ pacienteId: p.id, receta: r }))
      : []
  );

  await prisma.$transaction([
    prisma.pendienteSimulacion.deleteMany({ where: { simulacionId } }),
    prisma.existenciaSimulacion.deleteMany({ where: { simulacionId } }),
    prisma.existenciaSimulacion.createMany({
      data: [...porMedicamento.entries()].map(([medicamentoId, e]) => ({ simulacionId, medicamentoId, ...e })),
    }),
    prisma.pendienteSimulacion.createMany({
      data: reclamos.map(({ pacienteId, receta }, i) => ({
        simulacionId,
        numero: i + 1,
        pacienteId,
        recetaElectronicaId: receta.id,
        cantidad: receta.cantidadAutorizada - receta.cantidadRedimida,
        modalidad: "ESTABLECIMIENTO" as const,
        // Ayer: el plazo de 48 horas corre, pero no se ha vencido.
        creadoEn: new Date(Date.now() - (20 + (i % 3) * 6) * 3_600_000),
      })),
    }),
  ]);
}

export type Existencia = {
  /** Unidades que hay ahora para entregar. */
  disponible: number;
  /** El pedido al proveedor, si viene en camino (todavía no llega). */
  pedidoLlegaEn: string | null;
};

/**
 * Existencias actuales de unos medicamentos en la jornada. Sin fila de inventario (un
 * medicamento que no está en ninguna fórmula) devuelve null: no se controla.
 */
export async function existencias(simulacionId: string, medicamentoIds: string[]): Promise<Map<string, Existencia>> {
  const ahora = Date.now();
  const [filas, entregadas] = await Promise.all([
    prisma.existenciaSimulacion.findMany({ where: { simulacionId, medicamentoId: { in: medicamentoIds } } }),
    prisma.entregaSimulacion.findMany({
      where: {
        simulacionId,
        resultado: "ENTREGADO",
        OR: [{ medicamentoId: { in: medicamentoIds } }, { recetaElectronica: { medicamentoId: { in: medicamentoIds } } }],
      },
      select: { cantidad: true, medicamentoId: true, recetaElectronica: { select: { medicamentoId: true } } },
    }),
  ]);
  const salidas = new Map<string, number>();
  for (const e of entregadas) {
    const id = e.recetaElectronica?.medicamentoId ?? e.medicamentoId;
    if (id) salidas.set(id, (salidas.get(id) ?? 0) + e.cantidad);
  }
  const resultado = new Map<string, Existencia>();
  for (const f of filas) {
    const llego = f.llegaEn !== null && f.llegaEn.getTime() <= ahora;
    resultado.set(f.medicamentoId, {
      disponible: Math.max(0, f.inicial + (llego ? f.reposicion : 0) - (salidas.get(f.medicamentoId) ?? 0)),
      pedidoLlegaEn: f.reposicion > 0 && f.llegaEn && !llego ? f.llegaEn.toISOString() : null,
    });
  }
  return resultado;
}

/**
 * Registra lo que se le queda debiendo a un paciente de un renglón y le da la constancia.
 * Programa el pedido al proveedor de ese medicamento si aún no estaba en camino.
 */
export async function registrarPendiente(opts: {
  simulacionId: string;
  pacienteId: string;
  recetaId: string;
  usuarioId: string;
  cantidad: number;
  modalidad: ModalidadPendiente;
  direccion: string | null;
  telefono: string | null;
}) {
  const receta = await prisma.recetaElectronica.findUnique({ where: { id: opts.recetaId } });
  if (!receta || receta.pacienteId !== opts.pacienteId) throw new Error("Ese renglón no es de este paciente");
  if (opts.cantidad < 1) throw new Error("La cantidad pendiente debe ser al menos 1");
  if (opts.modalidad === "DOMICILIO" && (!opts.direccion?.trim() || !opts.telefono?.trim())) {
    throw new Error("Para la entrega a domicilio registra la dirección y el teléfono");
  }
  const previo = await prisma.pendienteSimulacion.findUnique({ where: { recetaElectronicaId: opts.recetaId } });
  if (previo && !previo.entregadoEn) throw new Error(`Este renglón ya tiene la constancia ${numeroConstancia(previo.numero)}`);
  if (previo) throw new Error("Este renglón ya tuvo un pendiente y se entregó");

  const ultimo = await prisma.pendienteSimulacion.aggregate({ where: { simulacionId: opts.simulacionId }, _max: { numero: true } });
  const pendiente = await prisma.pendienteSimulacion.create({
    data: {
      simulacionId: opts.simulacionId,
      numero: (ultimo._max.numero ?? 0) + 1,
      pacienteId: opts.pacienteId,
      recetaElectronicaId: opts.recetaId,
      usuarioId: opts.usuarioId,
      cantidad: opts.cantidad,
      modalidad: opts.modalidad,
      direccion: opts.modalidad === "DOMICILIO" ? opts.direccion!.trim() : null,
      telefono: opts.modalidad === "DOMICILIO" ? opts.telefono!.trim() : null,
    },
  });
  // El pedido al proveedor: llega solo en unos minutos (en clase, eso son "las 48 horas").
  await prisma.existenciaSimulacion.updateMany({
    where: { simulacionId: opts.simulacionId, medicamentoId: receta.medicamentoId, llegaEn: null, reposicion: { gt: 0 } },
    data: { llegaEn: new Date(Date.now() + MINUTOS_PEDIDO * 60_000) },
  });
  return pendiente;
}

/**
 * Tras una entrega: si con lo entregado después de la constancia ya se completó lo que se
 * debía, el pendiente queda entregado (o vuelve a quedar abierto si se corrigió a menos).
 */
export async function actualizarPendienteDeReceta(simulacionId: string, recetaId: string) {
  const pendiente = await prisma.pendienteSimulacion.findUnique({ where: { recetaElectronicaId: recetaId } });
  if (!pendiente) return;
  const despues = await prisma.entregaSimulacion.aggregate({
    where: { simulacionId, recetaElectronicaId: recetaId, resultado: "ENTREGADO", creadoEn: { gt: pendiente.creadoEn } },
    _sum: { cantidad: true },
  });
  const completo = (despues._sum.cantidad ?? 0) >= pendiente.cantidad;
  if (completo !== (pendiente.entregadoEn !== null)) {
    await prisma.pendienteSimulacion.update({ where: { id: pendiente.id }, data: { entregadoEn: completo ? new Date() : null } });
  }
}
