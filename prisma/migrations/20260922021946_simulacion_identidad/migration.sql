-- CreateEnum
CREATE TYPE "TipoRecogida" AS ENUM ('EL_MISMO', 'TERCERO_AUTORIZADO', 'SUPLANTACION');

-- AlterTable
ALTER TABLE "pacientes" ADD COLUMN     "personaRecogeCedula" TEXT,
ADD COLUMN     "personaRecogeNombre" TEXT,
ADD COLUMN     "personaRecogeRelacion" TEXT,
ADD COLUMN     "tipoRecogida" "TipoRecogida" NOT NULL DEFAULT 'EL_MISMO';
