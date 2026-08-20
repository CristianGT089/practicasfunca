-- AlterTable
ALTER TABLE "escenarios" ADD COLUMN     "descripcionDificil" TEXT,
ADD COLUMN     "soloTurno" BOOLEAN NOT NULL DEFAULT false;
