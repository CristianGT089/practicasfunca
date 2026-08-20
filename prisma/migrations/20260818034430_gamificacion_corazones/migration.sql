-- CreateEnum
CREATE TYPE "ModoJuego" AS ENUM ('FACIL', 'DIFICIL');

-- AlterEnum
ALTER TYPE "EstadoIntento" ADD VALUE 'PERDIDO';

-- AlterTable
ALTER TABLE "acciones" ADD COLUMN     "esError" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "escenarios" ADD COLUMN     "recetaPresentada" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "intentos" ADD COLUMN     "modo" "ModoJuego" NOT NULL DEFAULT 'FACIL',
ADD COLUMN     "vidas" INTEGER NOT NULL DEFAULT 3;
