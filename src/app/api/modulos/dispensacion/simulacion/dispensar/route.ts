import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/nucleo/auth";
import { dispensarRenglonSimulacion, rechazarRenglonSimulacion } from "@/lib/simulacion/dispensario";

// `altoCostoMarcado`: lo que el estudiante decidió al leer el diagnóstico — solo importa
// (y solo se guarda) si esta resulta ser la primera entrega del paciente en la simulación;
// ver `decidirCuota` en dispensario.ts. `recetaId` es null cuando el medicamento no está
// autorizado para este paciente — igual se puede entregar/rechazar, queda con
// `medicamentoId` en vez de receta (ver registrarEntrega).
const schema = z.union([
  z.object({
    simulacionId: z.string().min(1),
    cedula: z.string().trim().min(1).max(30),
    recetaId: z.string().min(1).nullable(),
    medicamentoId: z.string().min(1),
    cantidad: z.number().int().min(1),
    altoCostoMarcado: z.boolean(),
  }),
  z.object({
    simulacionId: z.string().min(1),
    cedula: z.string().trim().min(1).max(30),
    recetaId: z.string().min(1).nullable(),
    medicamentoId: z.string().min(1),
    rechazar: z.literal(true),
    altoCostoMarcado: z.boolean(),
  }),
]);

export async function POST(req: NextRequest) {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  try {
    if ("rechazar" in parsed.data) {
      await rechazarRenglonSimulacion({
        simulacionId: parsed.data.simulacionId,
        usuarioId: usuario.id,
        cedula: parsed.data.cedula,
        recetaId: parsed.data.recetaId,
        medicamentoId: parsed.data.medicamentoId,
        altoCostoMarcado: parsed.data.altoCostoMarcado,
      });
    } else {
      await dispensarRenglonSimulacion({
        simulacionId: parsed.data.simulacionId,
        usuarioId: usuario.id,
        cedula: parsed.data.cedula,
        recetaId: parsed.data.recetaId,
        medicamentoId: parsed.data.medicamentoId,
        cantidad: parsed.data.cantidad,
        altoCostoMarcado: parsed.data.altoCostoMarcado,
      });
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
