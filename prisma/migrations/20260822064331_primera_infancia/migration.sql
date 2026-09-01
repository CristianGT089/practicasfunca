/*
  Warnings:

  - You are about to drop the column `cuidador` on the `ninos` table. All the data in the column will be lost.
  - You are about to drop the column `edadMeses` on the `ninos` table. All the data in the column will be lost.
  - Made the column `fechaNacimiento` on table `ninos` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "escenarios_primera_infancia" ADD COLUMN     "hitosEsperados" JSONB;

-- AlterTable
ALTER TABLE "ninos" DROP COLUMN "cuidador",
DROP COLUMN "edadMeses",
ADD COLUMN     "cuidadorNombre" TEXT,
ADD COLUMN     "esquemaVacunacionAlDia" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "semanasGestacionNacimiento" INTEGER,
ADD COLUMN     "vacunasPendientes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "fechaNacimiento" SET NOT NULL;

-- CreateTable
CREATE TABLE "registros_crecimiento" (
    "id" TEXT NOT NULL,
    "ninoId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "pesoKg" DOUBLE PRECISION NOT NULL,
    "tallaCm" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "registros_crecimiento_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "registros_crecimiento" ADD CONSTRAINT "registros_crecimiento_ninoId_fkey" FOREIGN KEY ("ninoId") REFERENCES "ninos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
