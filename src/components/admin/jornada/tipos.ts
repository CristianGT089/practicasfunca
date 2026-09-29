export type Participante = { id: string; nombre: string; invitado: boolean; usuarioId: string | null };

export type CriterioReporte = { clave: string; descripcion: string; cumplido: boolean; detalle?: string };

export type AtencionReporte = {
  id: string;
  ticketCodigo: string | null;
  espacioNumero: number | null;
  llamadoEn: string | null;
  pacienteNombre: string;
  situaciones: string[];
  participante: { id: string; nombre: string; invitado: boolean } | null;
  criterios: CriterioReporte[];
  puntaje: number | null;
  cerrada?: boolean;
  rubrica?: unknown;
  comentario?: string | null;
  /** Odontología: revisión del odontograma (ver RevisionOdontograma). */
  detalle?: { revisionOdontologia?: unknown } | null;
};

export type Reporte = {
  simulacion: {
    id: string;
    nombre: string;
    tipo: "FARMACIA" | "DISPENSARIO" | "ODONTOLOGIA";
    estado: string;
    grupo: string | null;
    situaciones: string[];
    abiertaEn: string | null;
    cerradaEn: string | null;
  };
  atenciones: AtencionReporte[];
  porEstudiante: { id: string; nombre: string; invitado: boolean; atenciones: number; promedio: number | null }[];
  erroresComunes: { clave: string; veces: number }[];
};

export const hora = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }) : "—";
