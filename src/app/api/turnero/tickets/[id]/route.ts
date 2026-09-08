import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/nucleo/auth";
import { cerrarTicket, rellamar } from "@/lib/turnero/operaciones";

const schema = z.union([
  z.object({ resultado: z.enum(["ATENDIDO", "NO_SE_PRESENTO"]) }),
  z.object({ rellamar: z.literal(true) }),
]);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  try {
    if ("rellamar" in parsed.data) await rellamar(id);
    else await cerrarTicket(id, parsed.data.resultado);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
