import type { PrismaClient } from "@prisma/client";
import type { CasoOdontologiaEntrada } from "./esquemas";
import { normalizarEsperado } from "./historia";
import { pasosParaCaso, requiereRadiografia } from "./pasos";

/** Esperado saneado + checklist derivado, listos para guardar. */
function prepararCaso(entrada: CasoOdontologiaEntrada) {
  const esperado = normalizarEsperado(entrada.esperado);
  esperado.requiereRadiografia = requiereRadiografia(esperado);
  const paciente = { ...entrada.paciente, fechaNacimiento: new Date(entrada.paciente.fechaNacimiento) };
  const escenario = {
    titulo: entrada.titulo,
    descripcion: entrada.descripcion,
    descripcionDificil: entrada.descripcionDificil,
    activo: entrada.activo,
    resultadoEsperado: entrada.resultadoEsperado,
  };
  const extension = {
    denticion: entrada.denticion,
    motivoConsulta: entrada.motivoConsulta,
    relatoAnamnesis: entrada.relatoAnamnesis,
    relatoExamen: entrada.relatoExamen,
    relatoRadiografia: entrada.relatoRadiografia,
    esperado,
  };
  return { esperado, paciente, escenario, extension, pasos: pasosParaCaso(esperado) };
}

export async function crearCaso(prisma: PrismaClient, entrada: CasoOdontologiaEntrada) {
  const modulo = await prisma.modulo.findUnique({ where: { slug: "odontologia" } });
  if (!modulo) throw new Error("El módulo 'odontologia' no existe: corre el seed.");
  const { paciente, escenario, extension, pasos } = prepararCaso(entrada);
  return prisma.escenario.create({
    data: {
      ...escenario,
      moduloId: modulo.id,
      pasos: { create: pasos },
      odontologia: { create: { ...extension, paciente: { create: paciente } } },
    },
  });
}

/**
 * El paciente de un caso es solo de ese caso (se edita junto con él). El checklist se
 * regenera desde el esperado, así que cambiar el odontograma o la placa lo mantiene al día.
 */
export async function actualizarCaso(prisma: PrismaClient, escenarioId: string, entrada: CasoOdontologiaEntrada) {
  const actual = await prisma.escenarioOdontologia.findUnique({ where: { escenarioId } });
  if (!actual) return null;
  const { paciente, escenario, extension, pasos } = prepararCaso(entrada);
  return prisma.$transaction([
    prisma.pacienteOdontologia.update({ where: { id: actual.pacienteId }, data: paciente }),
    prisma.escenarioOdontologia.update({ where: { escenarioId }, data: extension }),
    prisma.pasoEsperado.deleteMany({ where: { escenarioId } }),
    prisma.escenario.update({ where: { id: escenarioId }, data: { ...escenario, pasos: { create: pasos } } }),
  ]);
}
