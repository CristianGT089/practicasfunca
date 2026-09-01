-- CreateEnum
CREATE TYPE "OrigenMedicamento" AS ENUM ('PRACTICA', 'CATALOGO_REAL');

-- AlterTable
ALTER TABLE "medicamentos" ADD COLUMN     "concentracion" TEXT,
ADD COLUMN     "formaFarmaceutica" TEXT,
ADD COLUMN     "laboratorio" TEXT,
ADD COLUMN     "numeroLote" TEXT,
ADD COLUMN     "origen" "OrigenMedicamento" NOT NULL DEFAULT 'PRACTICA',
ADD COLUMN     "registroInvima" TEXT;
