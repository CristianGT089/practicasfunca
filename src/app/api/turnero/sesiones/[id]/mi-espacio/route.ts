import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/nucleo/auth";
import { operarMiEspacio } from "@/lib/turnero/operaciones";

/**
 * Para un puesto que opera su propio espacio (ej. dispensación): cualquier usuario
 * logueado, no solo admin — es la persona físicamente sentada ahí la que decide cuándo
 * terminó. Nunca puede tocar otro espacio, ajustar la sesión, ni emitir turnos.
 */
const schema = z.object({
  espacio: z.number().int().min(1),
  resultado: z.enum(["ATENDIDO", "NO_SE_PRESENTO"]).nullable().default(null),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const usuario = await requireUser();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  try {
    const { ticket } = await operarMiEspacio(id, parsed.data.espacio, parsed.data.resultado);
    if (!ticket) return NextResponse.json({ vacia: true });
    return NextResponse.json({ codigo: ticket.codigo, espacio: parsed.data.espacio });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
