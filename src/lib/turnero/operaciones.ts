/**
 * Operaciones del turnero: mutan la DB y notifican al bus de eventos para que las
 * pantallas conectadas (SSE) se actualicen al instante. Los route handlers solo validan
 * entrada y llaman acá.
 */
import { prisma } from "@/lib/nucleo/prisma";
import { eliminarUsuarios } from "@/lib/nucleo/estudiantesTemporales";
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
  categoria: string | null,
  cedula?: string | null
) {
  const sesion = await prisma.sesionTurnero.findUnique({
    where: { id: sesionId },
    include: { turnero: true, simulacion: true },
  });
  if (!sesion || sesion.estado !== "ABIERTA") throw new Error("La sesión no está abierta");

  const servicios = leerServicios(sesion.turnero.servicios);
  const servicio = servicios.find((s) => s.codigo === servicioCodigo);
  if (!servicio) throw new Error("Servicio inválido");

  // En el turnero de una Simulación, el turno se pide por cédula: si no corresponde a un
  // paciente generado para esa simulación, se rechaza acá — no se puede sacar turno para
  // "nadie". El turnero de mostrador libre (sin Simulación) no exige esto.
  let pacienteId: string | null = null;
  if (sesion.simulacion) {
    const documento = cedula?.trim();
    if (!documento) throw new Error("Esta simulación requiere la cédula del paciente para sacar turno");
    const paciente = await prisma.paciente.findFirst({
      where: { cedula: documento, simulacionId: sesion.simulacion.id },
    });
    if (!paciente) throw new Error("Esa cédula no corresponde a ningún paciente de esta simulación");
    pacienteId = paciente.id;
  }

  const emitidosDelServicio = await prisma.ticket.count({ where: { sesionId, servicioCodigo } });
  const codigo = `${servicio.prefijo}-${String(emitidosDelServicio + 1).padStart(3, "0")}`;

  const ticket = await prisma.ticket.create({
    data: {
      sesionId,
      codigo,
      servicioCodigo,
      prioritario,
      categoria: prioritario ? categoria : null,
      pacienteId,
    },
    include: { paciente: { select: { nombre: true } } },
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

/**
 * Acción combinada para un puesto que opera su propio espacio (ej. un computador de
 * dispensación): cierra el turno que estaba atendiendo (si había uno) y de una vez llama
 * al siguiente. Así el estudiante no depende de que alguien lo haga desde Control — un
 * solo botón en su pantalla cuando termina con la persona.
 */
export async function operarMiEspacio(
  sesionId: string,
  espacioNumero: number,
  resultadoActual: "ATENDIDO" | "NO_SE_PRESENTO" | null
) {
  const sesion = await prisma.sesionTurnero.findUnique({
    where: { id: sesionId },
    include: { espacios: true },
  });
  if (!sesion || sesion.estado !== "ABIERTA") throw new Error("La sesión no está abierta");

  const espacio = sesion.espacios.find((e) => e.numero === espacioNumero);
  if (!espacio) throw new Error("Espacio inválido");

  if (espacio.ticketActualId && resultadoActual) {
    await cerrarTicket(espacio.ticketActualId, resultadoActual);
  }

  return llamarSiguiente(sesionId, espacioNumero);
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

/**
 * Cierra la sesión y borra con ella los puestos temporales que se crearon para esta sesión
 * desde Control (si los hay) — el admin no tiene que acordarse de un paso de limpieza
 * aparte. Los puestos creados desde Estudiantes (sin sesionTurneroId) no se tocan.
 */
export async function cerrarSesion(sesionId: string): Promise<{ puestosEliminados: number }> {
  const puestos = await prisma.usuario.findMany({ where: { sesionTurneroId: sesionId }, select: { id: true } });
  const puestosEliminados = await eliminarUsuarios(puestos.map((u) => u.id));

  await prisma.sesionTurnero.update({
    where: { id: sesionId },
    data: { estado: "CERRADA", cerradaEn: new Date() },
  });
  emitirCambio(sesionId);

  return { puestosEliminados };
}
