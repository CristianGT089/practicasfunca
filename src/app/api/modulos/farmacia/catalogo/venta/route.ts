import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/nucleo/prisma";
import { requireUser } from "@/lib/nucleo/auth";

// Completa una venta de práctica sobre el catálogo real: descuenta stock y deja un
// MovimientoInventario (SALIDA) como registro, igual que haría el software real. No hay
// checklist ni calificación — es solo practicar el flujo de venta con datos reales.
export async function POST(req: NextRequest) {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const modulo = await prisma.modulo.findUnique({ where: { slug: "farmacia" } });
  if (!modulo) return NextResponse.json({ error: "Módulo de farmacia no configurado" }, { status: 404 });

  const matricula = await prisma.matricula.findUnique({
    where: { usuarioId_moduloId: { usuarioId: usuario.id, moduloId: modulo.id } },
  });
  if (!matricula && usuario.rol !== "ADMIN") {
    return NextResponse.json({ error: "No estás matriculado en el módulo de farmacia" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const items = body?.items as { medicamentoId: string; cantidad: number }[] | undefined;
  if (!items || items.length === 0) {
    return NextResponse.json({ error: "El carrito está vacío" }, { status: 400 });
  }
  for (const item of items) {
    if (!item.medicamentoId || !Number.isInteger(item.cantidad) || item.cantidad <= 0) {
      return NextResponse.json({ error: "Cantidad inválida en el carrito" }, { status: 400 });
    }
  }

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const actualizados: { id: string; nombre: string; stock: number }[] = [];

      for (const item of items) {
        const medicamento = await tx.medicamento.findFirst({
          where: { id: item.medicamentoId, origen: "CATALOGO_REAL" },
        });
        if (!medicamento) throw new Error(`Medicamento no encontrado: ${item.medicamentoId}`);
        if (medicamento.stock < item.cantidad) {
          throw new Error(`Existencias insuficientes de "${medicamento.nombre}" (disponible: ${medicamento.stock})`);
        }

        const actualizado = await tx.medicamento.update({
          where: { id: medicamento.id },
          data: { stock: { decrement: item.cantidad } },
        });

        await tx.movimientoInventario.create({
          data: {
            medicamentoId: medicamento.id,
            tipo: "SALIDA",
            cantidad: item.cantidad,
            motivo: `Venta de práctica (catálogo real) — ${usuario.nombre}`,
          },
        });

        actualizados.push({ id: actualizado.id, nombre: actualizado.nombre, stock: actualizado.stock });
      }

      return actualizados;
    });

    await registrarVentaDeJornada(body?.simulacionId, body?.cedulaPaciente, usuario.id, items);
    return NextResponse.json({ ok: true, medicamentos: resultado });
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : "No se pudo completar la venta";
    return NextResponse.json({ error: mensaje }, { status: 409 });
  }
}

/**
 * Jornada presencial de Farmacia: la venta queda registrada a nombre del paciente del turno
 * de esta ventanilla, para calificarla al finalizar (lib/simulacion/evaluacion.ts). Si no hay
 * jornada abierta o el paciente no es de ella, no se registra nada extra.
 */
async function registrarVentaDeJornada(
  simulacionId: unknown,
  cedula: unknown,
  usuarioId: string,
  items: { medicamentoId: string; cantidad: number }[]
) {
  if (typeof simulacionId !== "string" || typeof cedula !== "string") return;
  const simulacion = await prisma.simulacion.findUnique({ where: { id: simulacionId } });
  if (!simulacion || simulacion.estado !== "ABIERTA" || simulacion.tipo !== "FARMACIA") return;
  const paciente = await prisma.paciente.findFirst({ where: { simulacionId, cedula }, include: { recetas: true } });
  if (!paciente) return;
  await prisma.entregaSimulacion.createMany({
    data: items.map((item) => {
      const receta = paciente.recetas.find((r) => r.medicamentoId === item.medicamentoId);
      return {
        simulacionId,
        pacienteId: paciente.id,
        recetaElectronicaId: receta?.id ?? null,
        medicamentoId: receta ? null : item.medicamentoId,
        usuarioId,
        cantidad: item.cantidad,
        resultado: "ENTREGADO" as const,
        cuotaModeradora: 0,
      };
    }),
  });
}
