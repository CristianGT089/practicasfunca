import { z } from "zod";

/** Lo que llega del formulario de una cita (agenda real o de práctica). */
export const esquemaCita = z.object({
  jornada: z.string().min(1).nullable().default(null),
  unidad: z.number().int().min(1).max(40),
  inicio: z.string().datetime(),
  duracionMin: z.number().int().min(20).max(240),
  tipo: z.enum(["VALORACION", "CONTROL", "TRATAMIENTO", "URGENCIA"]),
  motivo: z.string().trim().min(1, "Escribe el motivo de la cita").max(300),
  pacienteNombre: z.string().trim().min(1, "Falta el nombre del paciente").max(120),
  pacienteDocumento: z.string().trim().min(3, "Falta el documento del paciente").max(20),
  pacienteTelefono: z.string().trim().max(30).nullable().default(null),
  acudienteNombre: z.string().trim().max(120).nullable().default(null),
  solicitadaEn: z.string().datetime().nullable().default(null),
  fechaPedidaPorPaciente: z.boolean().default(false),
  observaciones: z.string().trim().max(500).nullable().default(null),
  atencionId: z.string().min(1).nullable().default(null),
});

export const aDatos = (d: z.infer<typeof esquemaCita>) => ({
  ...d,
  inicio: new Date(d.inicio),
  solicitadaEn: d.solicitadaEn ? new Date(d.solicitadaEn) : null,
});
