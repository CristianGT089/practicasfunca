-- AlterTable
ALTER TABLE "escenarios" ADD COLUMN     "recetaFisicaCantidad" TEXT,
ADD COLUMN     "recetaFisicaCantidadTachada" TEXT,
ADD COLUMN     "recetaFisicaControlado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recetaFisicaDiasVigencia" INTEGER,
ADD COLUMN     "recetaFisicaFechaEmision" TIMESTAMP(3),
ADD COLUMN     "recetaFisicaMedicamento" TEXT,
ADD COLUMN     "recetaFisicaMedico" TEXT,
ADD COLUMN     "recetaFisicaPacienteNombre" TEXT,
ADD COLUMN     "recetaFisicaPosologia" TEXT,
ADD COLUMN     "recetaFisicaRegistroMedico" TEXT;
