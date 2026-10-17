-- CreateEnum
CREATE TYPE "DecisionRecogida" AS ENUM ('PACIENTE', 'TERCERO', 'NO_ENTREGA');

-- AlterTable
ALTER TABLE "pacientes" ADD COLUMN     "estudianteId" TEXT,
ADD COLUMN     "tipoDocumento" TEXT NOT NULL DEFAULT 'CC';

-- CreateTable
CREATE TABLE "recogidas_simulacion" (
    "id" TEXT NOT NULL,
    "simulacionId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "decision" "DecisionRecogida" NOT NULL,
    "documentoQuienReclama" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recogidas_simulacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recogidas_simulacion_pacienteId_key" ON "recogidas_simulacion"("pacienteId");

-- AddForeignKey
ALTER TABLE "pacientes" ADD CONSTRAINT "pacientes_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recogidas_simulacion" ADD CONSTRAINT "recogidas_simulacion_simulacionId_fkey" FOREIGN KEY ("simulacionId") REFERENCES "simulaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recogidas_simulacion" ADD CONSTRAINT "recogidas_simulacion_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
