-- CreateEnum
CREATE TYPE "CategoriaAfiliado" AS ENUM ('SUBSIDIADO', 'CONTRIBUTIVO_A', 'CONTRIBUTIVO_B', 'CONTRIBUTIVO_C');

-- CreateEnum
CREATE TYPE "TipoSimulacion" AS ENUM ('FARMACIA', 'DISPENSARIO');

-- CreateEnum
CREATE TYPE "EstadoSimulacion" AS ENUM ('BORRADOR', 'ABIERTA', 'CERRADA');

-- AlterTable
ALTER TABLE "pacientes" ADD COLUMN     "categoriaAfiliado" "CategoriaAfiliado",
ADD COLUMN     "diagnostico" TEXT,
ADD COLUMN     "esAltoCosto" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "simulacionId" TEXT;

-- AlterTable
ALTER TABLE "tickets_turnero" ADD COLUMN     "pacienteId" TEXT;

-- CreateTable
CREATE TABLE "simulaciones" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoSimulacion" NOT NULL,
    "estado" "EstadoSimulacion" NOT NULL DEFAULT 'BORRADOR',
    "turneroId" TEXT NOT NULL,
    "sesionTurneroId" TEXT,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "abiertaEn" TIMESTAMP(3),
    "cerradaEn" TIMESTAMP(3),

    CONSTRAINT "simulaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entregas_simulacion" (
    "id" TEXT NOT NULL,
    "simulacionId" TEXT NOT NULL,
    "recetaElectronicaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "resultado" "ResultadoEntrega" NOT NULL,
    "cuotaModeradora" INTEGER NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entregas_simulacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "simulaciones_sesionTurneroId_key" ON "simulaciones"("sesionTurneroId");

-- CreateIndex
CREATE INDEX "entregas_simulacion_simulacionId_idx" ON "entregas_simulacion"("simulacionId");

-- AddForeignKey
ALTER TABLE "pacientes" ADD CONSTRAINT "pacientes_simulacionId_fkey" FOREIGN KEY ("simulacionId") REFERENCES "simulaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets_turnero" ADD CONSTRAINT "tickets_turnero_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulaciones" ADD CONSTRAINT "simulaciones_turneroId_fkey" FOREIGN KEY ("turneroId") REFERENCES "turneros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulaciones" ADD CONSTRAINT "simulaciones_sesionTurneroId_fkey" FOREIGN KEY ("sesionTurneroId") REFERENCES "sesiones_turnero"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas_simulacion" ADD CONSTRAINT "entregas_simulacion_simulacionId_fkey" FOREIGN KEY ("simulacionId") REFERENCES "simulaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas_simulacion" ADD CONSTRAINT "entregas_simulacion_recetaElectronicaId_fkey" FOREIGN KEY ("recetaElectronicaId") REFERENCES "recetas_electronicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas_simulacion" ADD CONSTRAINT "entregas_simulacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
