-- CreateEnum
CREATE TYPE "TipoModulo" AS ENUM ('CASOS', 'SIMULADOR');

-- CreateEnum
CREATE TYPE "ResultadoEntrega" AS ENUM ('ENTREGADO', 'RECHAZADO');

-- AlterTable
ALTER TABLE "modulos" ADD COLUMN     "rutaSimulador" TEXT,
ADD COLUMN     "tipo" "TipoModulo" NOT NULL DEFAULT 'CASOS';

-- CreateTable
CREATE TABLE "casos_dispensacion" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "contexto" TEXT,
    "pacienteId" TEXT NOT NULL,
    "documentoPresentado" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "casos_dispensacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formulas_presentadas" (
    "id" TEXT NOT NULL,
    "casoId" TEXT NOT NULL,
    "medico" TEXT NOT NULL,
    "registroMedico" TEXT NOT NULL,
    "ips" TEXT,
    "fechaEmision" TIMESTAMP(3) NOT NULL,
    "diasVigencia" INTEGER NOT NULL DEFAULT 30,
    "cargadaEnSistema" BOOLEAN NOT NULL DEFAULT true,
    "nota" TEXT,

    CONSTRAINT "formulas_presentadas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "renglones_formula" (
    "id" TEXT NOT NULL,
    "formulaId" TEXT NOT NULL,
    "medicamentoId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "cantidadTachada" INTEGER,
    "posologia" TEXT,

    CONSTRAINT "renglones_formula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesiones_dispensacion" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "indiceCaso" INTEGER NOT NULL DEFAULT 0,
    "iniciadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sesiones_dispensacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entregas_dispensacion" (
    "id" TEXT NOT NULL,
    "sesionId" TEXT NOT NULL,
    "casoId" TEXT NOT NULL,
    "medicamentoId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "resultado" "ResultadoEntrega" NOT NULL,
    "motivo" TEXT,
    "recetaElectronicaId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entregas_dispensacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "entregas_dispensacion_sesionId_idx" ON "entregas_dispensacion"("sesionId");

-- AddForeignKey
ALTER TABLE "casos_dispensacion" ADD CONSTRAINT "casos_dispensacion_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formulas_presentadas" ADD CONSTRAINT "formulas_presentadas_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "casos_dispensacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "renglones_formula" ADD CONSTRAINT "renglones_formula_formulaId_fkey" FOREIGN KEY ("formulaId") REFERENCES "formulas_presentadas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "renglones_formula" ADD CONSTRAINT "renglones_formula_medicamentoId_fkey" FOREIGN KEY ("medicamentoId") REFERENCES "medicamentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones_dispensacion" ADD CONSTRAINT "sesiones_dispensacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas_dispensacion" ADD CONSTRAINT "entregas_dispensacion_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "sesiones_dispensacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas_dispensacion" ADD CONSTRAINT "entregas_dispensacion_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "casos_dispensacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas_dispensacion" ADD CONSTRAINT "entregas_dispensacion_medicamentoId_fkey" FOREIGN KEY ("medicamentoId") REFERENCES "medicamentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas_dispensacion" ADD CONSTRAINT "entregas_dispensacion_recetaElectronicaId_fkey" FOREIGN KEY ("recetaElectronicaId") REFERENCES "recetas_electronicas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
