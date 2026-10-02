-- AlterTable
ALTER TABLE "simulaciones" ADD COLUMN     "dictado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dictadoPausado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dictadoSecciones" TEXT;
