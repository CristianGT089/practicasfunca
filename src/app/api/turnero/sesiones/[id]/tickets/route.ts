import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/nucleo/auth";
import { emitirTicket } from "@/lib/turnero/operaciones";

const schema = z.object({
  servicioCodigo: z.string().min(1),
  prioritario: z.boolean().default(false),
  categoria: z.string().min(1).nullable().default(null),
  // Solo obligatoria cuando la sesión pertenece a una Simulación (lo valida emitirTicket).
  cedula: z.string().trim().min(1).max(30).nullable().default(null),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  try {
    const ticket = await emitirTicket(
      id,
      parsed.data.servicioCodigo,
      parsed.data.prioritario,
      parsed.data.categoria,
      parsed.data.cedula
    );
    return NextResponse.json(
      { codigo: ticket.codigo, prioritario: ticket.prioritario, pacienteNombre: ticket.paciente?.nombre ?? null },
      { status: 201 }
    );
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
