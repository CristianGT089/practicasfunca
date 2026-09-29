-- AlterEnum
ALTER TYPE "TipoSimulacion" ADD VALUE 'ODONTOLOGIA';

-- AlterTable
ALTER TABLE "atenciones_jornada" ADD COLUMN     "actualizadaEn" TIMESTAMP(3),
ADD COLUMN     "casoOdontologiaId" TEXT,
ADD COLUMN     "cerradaEn" TIMESTAMP(3),
ADD COLUMN     "detalle" JSONB,
ADD COLUMN     "historia" JSONB,
ADD COLUMN     "remision" TEXT,
ADD COLUMN     "usuarioId" TEXT;

-- CreateTable
CREATE TABLE "casos_jornada_odontologia" (
    "id" TEXT NOT NULL,
    "simulacionId" TEXT NOT NULL,
    "escenarioOdontologiaId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "casos_jornada_odontologia_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "atenciones_jornada" ADD CONSTRAINT "atenciones_jornada_casoOdontologiaId_fkey" FOREIGN KEY ("casoOdontologiaId") REFERENCES "casos_jornada_odontologia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "casos_jornada_odontologia" ADD CONSTRAINT "casos_jornada_odontologia_simulacionId_fkey" FOREIGN KEY ("simulacionId") REFERENCES "simulaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "casos_jornada_odontologia" ADD CONSTRAINT "casos_jornada_odontologia_escenarioOdontologiaId_fkey" FOREIGN KEY ("escenarioOdontologiaId") REFERENCES "escenarios_odontologia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
