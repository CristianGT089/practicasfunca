/*
  Warnings:

  - Added the required column `pacienteId` to the `entregas_simulacion` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "entregas_simulacion" DROP CONSTRAINT "entregas_simulacion_recetaElectronicaId_fkey";

-- AlterTable
ALTER TABLE "entregas_simulacion" ADD COLUMN     "medicamentoId" TEXT,
ADD COLUMN     "pacienteId" TEXT NOT NULL,
ALTER COLUMN "recetaElectronicaId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "entregas_simulacion_pacienteId_idx" ON "entregas_simulacion"("pacienteId");

-- AddForeignKey
ALTER TABLE "entregas_simulacion" ADD CONSTRAINT "entregas_simulacion_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas_simulacion" ADD CONSTRAINT "entregas_simulacion_recetaElectronicaId_fkey" FOREIGN KEY ("recetaElectronicaId") REFERENCES "recetas_electronicas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas_simulacion" ADD CONSTRAINT "entregas_simulacion_medicamentoId_fkey" FOREIGN KEY ("medicamentoId") REFERENCES "medicamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
