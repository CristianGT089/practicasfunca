/**
 * Estado completo de una sesión de turnero, tal como lo consumen las tres pantallas
 * (control, registro, tablero). Lo usan el GET inicial y cada envío del stream SSE.
 */
import { prisma } from "@/lib/nucleo/prisma";
import { leerCategorias, leerServicios, type CategoriaPrioridad, type Servicio } from "./config";

export type TicketVista = {
  id: string;
  codigo: string;
  servicioCodigo: string;
  servicioNombre: string;
  prioritario: boolean;
  categoria: string | null;
  categoriaNombre: string | null;
  estado: "EN_ESPERA" | "LLAMADO" | "ATENDIDO" | "NO_SE_PRESENTO";
  espacioNumero: number | null;
  emitidoEn: string;
  llamadoEn: string | null;
};

export type EspacioVista = {
  numero: number;
  nombre: string | null;
  estado: "LIBRE" | "LLAMANDO" | "ATENDIENDO" | "PAUSA";
  ticket: TicketVista | null;
};

export type PuestoVista = { id: string; nombre: string; usuario: string };

export type SnapshotTurnero = {
  sesion: {
    id: string;
    estado: "ABIERTA" | "CERRADA";
    numeroEspacios: number;
    turnero: {
      id: string;
      nombre: string;
      reglaPrioridad: "ESTRICTA" | "INTERCALADA";
      servicios: Servicio[];
      categorias: CategoriaPrioridad[];
    };
  };
  espacios: EspacioVista[];
  enEspera: TicketVista[];
  llamados: TicketVista[];
  contadores: { enEspera: number; atendidos: number; noShow: number };
  // Cuentas temporales creadas desde Control para esta sesión (se borran al cerrarla).
  puestos: PuestoVista[];
  actualizadoEn: string;
};

export async function construirSnapshot(sesionId: string): Promise<SnapshotTurnero | null> {
  const sesion = await prisma.sesionTurnero.findUnique({
    where: { id: sesionId },
    include: {
      turnero: true,
      espacios: { orderBy: { numero: "asc" }, include: { ticketActual: true } },
      tickets: { orderBy: { emitidoEn: "asc" } },
      puestos: { orderBy: { creadoEn: "asc" }, select: { id: true, nombre: true, usuario: true } },
    },
  });
  if (!sesion) return null;

  const servicios = leerServicios(sesion.turnero.servicios);
  const categorias = leerCategorias(sesion.turnero.categorias);
  const nombreServicio = (codigo: string) => servicios.find((s) => s.codigo === codigo)?.nombre ?? codigo;
  const nombreCategoria = (codigo: string | null) =>
    codigo ? categorias.find((c) => c.codigo === codigo)?.nombre ?? codigo : null;

  const aVista = (t: {
    id: string;
    codigo: string;
    servicioCodigo: string;
    prioritario: boolean;
    categoria: string | null;
    estado: TicketVista["estado"];
    espacioNumero: number | null;
    emitidoEn: Date;
    llamadoEn: Date | null;
  }): TicketVista => ({
    id: t.id,
    codigo: t.codigo,
    servicioCodigo: t.servicioCodigo,
    servicioNombre: nombreServicio(t.servicioCodigo),
    prioritario: t.prioritario,
    categoria: t.categoria,
    categoriaNombre: nombreCategoria(t.categoria),
    estado: t.estado,
    espacioNumero: t.espacioNumero,
    emitidoEn: t.emitidoEn.toISOString(),
    llamadoEn: t.llamadoEn?.toISOString() ?? null,
  });

  const enEspera = sesion.tickets.filter((t) => t.estado === "EN_ESPERA").map(aVista);

  const llamados = sesion.tickets
    .filter((t) => t.llamadoEn !== null)
    .sort((a, b) => (b.llamadoEn?.getTime() ?? 0) - (a.llamadoEn?.getTime() ?? 0))
    .slice(0, 8)
    .map(aVista);

  const espacios: EspacioVista[] = sesion.espacios.map((e) => ({
    numero: e.numero,
    nombre: e.nombre,
    estado: e.estado,
    ticket: e.ticketActual ? aVista(e.ticketActual) : null,
  }));

  return {
    sesion: {
      id: sesion.id,
      estado: sesion.estado,
      numeroEspacios: sesion.numeroEspacios,
      turnero: {
        id: sesion.turnero.id,
        nombre: sesion.turnero.nombre,
        reglaPrioridad: sesion.turnero.reglaPrioridad,
        servicios,
        categorias,
      },
    },
    espacios,
    enEspera,
    llamados,
    contadores: {
      enEspera: enEspera.length,
      atendidos: sesion.tickets.filter((t) => t.estado === "ATENDIDO").length,
      noShow: sesion.tickets.filter((t) => t.estado === "NO_SE_PRESENTO").length,
    },
    puestos: sesion.puestos,
    actualizadoEn: new Date().toISOString(),
  };
}
