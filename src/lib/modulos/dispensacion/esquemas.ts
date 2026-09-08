import { z } from "zod";

const renglonSchema = z.object({
  medicamentoId: z.string().min(1),
  cantidad: z.number().int().min(1),
  cantidadTachada: z.number().int().min(1).nullable().default(null),
  posologia: z.string().trim().max(120).nullable().default(null),
});

const formulaSchema = z.object({
  medico: z.string().trim().min(1).max(80),
  registroMedico: z.string().trim().min(1).max(40),
  ips: z.string().trim().max(80).nullable().default(null),
  fechaEmision: z.string(),
  diasVigencia: z.number().int().min(1).max(365).default(30),
  cargadaEnSistema: z.boolean().default(true),
  nota: z.string().trim().max(300).nullable().default(null),
  renglones: z.array(renglonSchema).min(1),
});

export const casoSchema = z.object({
  titulo: z.string().trim().min(1).max(120),
  contexto: z.string().trim().max(400).nullable().default(null),
  pacienteId: z.string().min(1),
  documentoPresentado: z.string().trim().max(30).nullable().default(null),
  orden: z.number().int().min(0).default(0),
  activo: z.boolean().default(true),
  formulas: z.array(formulaSchema).min(1),
});
