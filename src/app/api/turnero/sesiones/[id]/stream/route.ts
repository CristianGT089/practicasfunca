/**
 * Stream SSE del estado de una sesión de turnero. Cada pantalla (registro / tablero /
 * control) mantiene esta conexión abierta y recibe un snapshot nuevo:
 *  - al conectar (snapshot inicial),
 *  - cada vez que `eventos.ts` señala un cambio en esta sesión,
 *  - cada 10 s como respaldo (keepalive + re-sync).
 */
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/nucleo/auth";
import { suscribirse } from "@/lib/turnero/eventos";
import { construirSnapshot } from "@/lib/turnero/snapshot";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return new Response("No autorizado", { status: 403 });

  const { id } = await params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let cerrado = false;
      let enviando = false;

      const enviar = async () => {
        if (cerrado || enviando) return;
        enviando = true;
        try {
          const snap = await construirSnapshot(id);
          const payload = snap
            ? `data: ${JSON.stringify(snap)}\n\n`
            : `event: fin\ndata: {}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          // conexión cerrada entre el check y el enqueue: ignorar
        } finally {
          enviando = false;
        }
      };

      await enviar();
      const desuscribir = suscribirse(id, () => void enviar());
      const keepalive = setInterval(() => void enviar(), 10_000);

      const cerrar = () => {
        if (cerrado) return;
        cerrado = true;
        clearInterval(keepalive);
        desuscribir();
        try {
          controller.close();
        } catch {
          // ya estaba cerrado
        }
      };

      req.signal.addEventListener("abort", cerrar);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Sin esto, un nginx delante de la app hace buffering de la respuesta y el stream
      // nunca "carga" en el navegador (los datos se acumulan en nginx en vez de salir).
      "X-Accel-Buffering": "no",
    },
  });
}
