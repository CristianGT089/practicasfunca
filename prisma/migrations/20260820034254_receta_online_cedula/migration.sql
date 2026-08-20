-- CreateEnum
CREATE TYPE "ActitudCedula" AS ENUM ('ENTREGA', 'SE_REHUSA');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TipoAccion" ADD VALUE 'SOLICITAR_CEDULA';
ALTER TYPE "TipoAccion" ADD VALUE 'BUSCAR_RECETA_ONLINE';
ALTER TYPE "TipoAccion" ADD VALUE 'ESCALAR_A_SUPERVISOR';

-- AlterTable
ALTER TABLE "escenarios" ADD COLUMN     "actitudCedula" "ActitudCedula",
ADD COLUMN     "notaRecetaFisica" TEXT;

-- AlterTable
ALTER TABLE "pacientes" ADD COLUMN     "fechaNacimiento" TIMESTAMP(3),
ADD COLUMN     "lugarNacimiento" TEXT,
ADD COLUMN     "tipoSangre" TEXT;

-- CreateTable
CREATE TABLE "recetas_electronicas" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "medicamentoId" TEXT NOT NULL,
    "medico" TEXT NOT NULL,
    "cantidadAutorizada" INTEGER NOT NULL,
    "cantidadRedimida" INTEGER NOT NULL DEFAULT 0,
    "fechaEmision" TIMESTAMP(3) NOT NULL,
    "fechaVigencia" TIMESTAMP(3) NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recetas_electronicas_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "recetas_electronicas" ADD CONSTRAINT "recetas_electronicas_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recetas_electronicas" ADD CONSTRAINT "recetas_electronicas_medicamentoId_fkey" FOREIGN KEY ("medicamentoId") REFERENCES "medicamentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
