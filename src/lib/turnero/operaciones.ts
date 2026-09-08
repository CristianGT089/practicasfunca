/**
 * Operaciones del turnero: mutan la DB y notifican al bus de eventos para que las
 * pantallas conectadas (SSE) se actualicen al instante. Los route handlers solo validan
 * entrada y llaman acá.
 */
import { prisma } from "@/lib/nucleo/prisma";
import { leerServicios } from "./config";
import { emitirCambio } from "./eventos";
import { siguienteTicket } from "./fila";

export async function abrirSesion(turneroId: string) {
  const turnero = await prisma.turnero.findUnique({ where: { id: turneroId } });
  if (!turnero || !turnero.activo) throw new Error("Turnero no encontrado");

  // Cierra cualquier sesión abierta previa de este turnero (solo una activa a la vez).
  await prisma.sesionTurnero.updateMany({
    where: { turneroId, estado: "ABIERTA" },
    data: { estado: "CERRADA", cerradaEn: new Date() },
  });

  const sesion = await prisma.sesionTurnero.create({
    data: {
      turneroId,
      numeroEspacios: turnero.numeroEspacios,
      espacios: {
        create: Array.from({ length: turnero.numeroEspacios }, (_, i) => ({
          numero: i + 1,
          nombre: `Espacio ${i + 1}`,
        })),
      },
    },
  });
  return sesion;
}

export async function emitirTicket(
  sesionId: string,
  servicioCodigo: string,
  prioritario: boolean,
  categoria: string | null
) {
  const sesion = await prisma.sesionTurnero.findUnique({
    where: { id: sesionId },
    include: { turnero: true },
  });
  if (!sesion || sesion.estado !== "ABIERTA") throw new Error("La sesión no está abierta");

  const servicios = leerServicios(sesion.turnero.servicios);
  const servicio = servicios.find((s) => s.codigo === servicioCodigo);
  if (!servicio) throw new Error("Servicio inválido");

  const emitidosDelServicio = await prisma.ticket.count({ where: { sesionId, servicioCodigo } });
  const codigo = `${servicio.prefijo}-${String(emitidosDelServicio + 1).padStart(3, "0")}`;

  const ticket = await prisma.ticket.create({
    data: {
      sesionId,
      codigo,
      servicioCodigo,
      prioritario,
      categoria: prioritario ? categoria : null,
    },
  });

  emitirCambio(sesionId);
  return ticket;
}

export async function llamarSiguiente(sesionId: string, espacioNumero: number) {
  const sesion = await prisma.sesionTurnero.findUnique({
    where: { id: sesionId },
    include: {
      turnero: true,
      espacios: true,
      tickets: { where: { estado: "EN_ESPERA" } },
    },
  });
  if (!sesion || sesion.estado !== "ABIERTA") throw new Error("La sesión no está abierta");

  const espacio = sesion.espacios.find((e) => e.numero === espacioNumero);
  if (!espacio) throw new Error("Espacio inválido");

  // Historial reciente para la regla INTERCALADA (últimos llamados, del más nuevo al más viejo).
  const recientes = await prisma.ticket.findMany({
    where: { sesionId, llamadoEn: { not: null } },
    orderBy: { llamadoEn: "desc" },
    take: 5,
    select: { prioritario: true },
  });

  const elegido = siguienteTicket(
    sesion.tickets.map((t) => ({ id: t.id, prioritario: t.prioritario, emitidoEn: t.emitidoEn })),
    sesion.turnero.reglaPrioridad,
    recientes
  );
  if (!elegido) return { ticket: null as null };

  const [ticket] = await prisma.$transaction([
    prisma.ticket.update({
      where: { id: elegido.id },
      data: { estado: "LLAMADO", espacioNumero, llamadoEn: new Date() },
    }),
    // Libera el ticket anterior del espacio (si lo había, cuenta como no atendido explícito no —
    // simplemente deja de ser el actual; el admin debió cerrarlo antes).
    prisma.espacio.update({
      where: { id: espacio.id },
      data: { estado: "LLAMANDO", ticketActualId: elegido.id },
    }),
  ]);

  emitirCambio(sesionId);
  return { ticket };
}

export async function cerrarTicket(ticketId: string, resultado: "ATENDIDO" | "NO_SE_PRESENTO") {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new Error("Ticket no encontrado");

  await prisma.$transaction([
    prisma.ticket.update({
      where: { id: ticketId },
      data: { estado: resultado, cerradoEn: new Date() },
    }),
    prisma.espacio.updateMany({
      where: { ticketActualId: ticketId },
      data: { estado: "LIBRE", ticketActualId: null },
    }),
  ]);

  emitirCambio(ticket.sesionId);
}

export async function rellamar(ticketId: string) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new Error("Ticket no encontrado");
  // No cambia de estado: solo re-anuncia. Marca la hora para que el tablero lo suba.
  await prisma.ticket.update({ where: { id: ticketId }, data: { llamadoEn: new Date() } });
  emitirCambio(ticket.sesionId);
}

export async function ajustarEspacios(sesionId: string, numeroEspacios: number) {
  const sesion = await prisma.sesionTurnero.findUnique({
    where: { id: sesionId },
    include: { espacios: { orderBy: { numero: "asc" } } },
  });
  if (!sesion || sesion.estado !== "ABIERTA") throw new Error("La sesión no está abierta");
  if (numeroEspacios < 1 || numeroEspacios > 20) throw new Error("Número de espacios fuera de rango (1–20)");

  const actual = sesion.espacios.length;

  if (numeroEspacios > actual) {
    await prisma.espacio.createMany({
      data: Array.from({ length: numeroEspacios - actual }, (_, i) => ({
        sesionId,
        numero: actual + i + 1,
        nombre: `Espacio ${actual + i + 1}`,
      })),
    });
  } else if (numeroEspacios < actual) {
    const sobran = sesion.espacios.slice(numeroEspacios);
    if (sobran.some((e) => e.estado !== "LIBRE")) {
      throw new Error("No se pueden quitar espacios que están atendiendo un turno");
    }
    await prisma.espacio.deleteMany({ where: { id: { in: sobran.map((e) => e.id) } } });
  }

  await prisma.sesionTurnero.update({ where: { id: sesionId }, data: { numeroEspacios } });
  emitirCambio(sesionId);
}

export async function cerrarSesion(sesionId: string) {
  await prisma.sesionTurnero.update({
    where: { id: sesionId },
    data: { estado: "CERRADA", cerradaEn: new Date() },
  });
  emitirCambio(sesionId);
}
