import { z } from "zod";

const opcional = (max: number) => z.string().trim().max(max).nullable().default(null);

export const pacienteSchema = z.object({
  nombres: z.string().trim().min(1).max(80),
  primerApellido: z.string().trim().min(1).max(60),
  segundoApellido: opcional(60),
  tipoDocumento: z.enum(["CC", "TI", "RC", "CE"]),
  documento: z.string().trim().min(3).max(20),
  sexo: z.enum(["M", "F"]),
  fechaNacimiento: z.string().min(8),
  eps: opcional(60),
  profesion: opcional(60),
  ocupacion: opcional(60),
  estadoCivil: opcional(30),
  telefono: opcional(30),
  direccion: opcional(120),
  contactoEmergencia: opcional(80),
  parentescoContacto: opcional(40),
  telefonoContacto: opcional(30),
});

/**
 * Caso de Odontología tal como lo edita el docente. `esperado` se valida aparte con
 * `normalizarEsperado` (descarta dientes/códigos inválidos en vez de rechazar el caso).
 */
export const casoOdontologiaSchema = z.object({
  titulo: z.string().trim().min(1).max(120),
  descripcion: z.string().trim().min(1).max(2000),
  descripcionDificil: opcional(2000),
  activo: z.boolean().default(true),
  // true = solo para jornadas presenciales: no aparece en la práctica virtual.
  soloTurno: z.boolean().default(false),
  resultadoEsperado: z.enum(["ATENCION_EN_CONSULTA", "REMISION_ESPECIALISTA", "INTERCONSULTA_MEDICA"]),
  denticion: z.enum(["PERMANENTE", "TEMPORAL", "MIXTA"]),
  motivoConsulta: z.string().trim().min(1).max(500),
  relatoAnamnesis: z.string().trim().min(1).max(5000),
  relatoExamen: opcional(5000),
  relatoRadiografia: opcional(5000),
  paciente: pacienteSchema,
  esperado: z.unknown(),
});

export type CasoOdontologiaEntrada = z.infer<typeof casoOdontologiaSchema>;
