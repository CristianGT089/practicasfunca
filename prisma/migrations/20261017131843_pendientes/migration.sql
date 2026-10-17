-- CreateEnum
CREATE TYPE "ModalidadPendiente" AS ENUM ('ESTABLECIMIENTO', 'DOMICILIO');

-- AlterTable
ALTER TABLE "pacientes" ADD COLUMN     "direccionDomicilio" TEXT,
ADD COLUMN     "pendientePrefiere" "ModalidadPendiente";

-- CreateTable
CREATE TABLE "existencias_simulacion" (
    "id" TEXT NOT NULL,
    "simulacionId" TEXT NOT NULL,
    "medicamentoId" TEXT NOT NULL,
    "inicial" INTEGER NOT NULL,
    "reposicion" INTEGER NOT NULL DEFAULT 0,
    "llegaEn" TIMESTAMP(3),

    CONSTRAINT "existencias_simulacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pendientes_simulacion" (
    "id" TEXT NOT NULL,
    "simulacionId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "recetaElectronicaId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "modalidad" "ModalidadPendiente" NOT NULL,
    "direccion" TEXT,
    "telefono" TEXT,
    "usuarioId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entregadoEn" TIMESTAMP(3),

    CONSTRAINT "pendientes_simulacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "existencias_simulacion_simulacionId_medicamentoId_key" ON "existencias_simulacion"("simulacionId", "medicamentoId");

-- CreateIndex
CREATE UNIQUE INDEX "pendientes_simulacion_simulacionId_numero_key" ON "pendientes_simulacion"("simulacionId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "pendientes_simulacion_recetaElectronicaId_key" ON "pendientes_simulacion"("recetaElectronicaId");

-- AddForeignKey
ALTER TABLE "existencias_simulacion" ADD CONSTRAINT "existencias_simulacion_simulacionId_fkey" FOREIGN KEY ("simulacionId") REFERENCES "simulaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "existencias_simulacion" ADD CONSTRAINT "existencias_simulacion_medicamentoId_fkey" FOREIGN KEY ("medicamentoId") REFERENCES "medicamentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pendientes_simulacion" ADD CONSTRAINT "pendientes_simulacion_simulacionId_fkey" FOREIGN KEY ("simulacionId") REFERENCES "simulaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pendientes_simulacion" ADD CONSTRAINT "pendientes_simulacion_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pendientes_simulacion" ADD CONSTRAINT "pendientes_simulacion_recetaElectronicaId_fkey" FOREIGN KEY ("recetaElectronicaId") REFERENCES "recetas_electronicas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
