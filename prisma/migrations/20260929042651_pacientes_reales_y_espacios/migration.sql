-- AlterTable
ALTER TABLE "atenciones_jornada" ADD COLUMN     "comentario" TEXT,
ADD COLUMN     "denticion" TEXT,
ADD COLUMN     "pacienteReal" JSONB,
ADD COLUMN     "rubrica" JSONB;

-- AlterTable
ALTER TABLE "simulaciones" ADD COLUMN     "pacientesReales" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "espacioNumero" INTEGER;
