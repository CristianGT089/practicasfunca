-- CreateEnum
CREATE TYPE "EstadoIntentoTurno" AS ENUM ('EN_PROGRESO', 'COMPLETADO', 'PERDIDO');

-- AlterTable
ALTER TABLE "intentos" ADD COLUMN     "intentoTurnoId" TEXT;

-- CreateTable
CREATE TABLE "turnos" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "umbralDesbloqueo" INTEGER NOT NULL DEFAULT 70,
    "requiereDesbloqueo" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "turnos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "turno_items" (
    "id" TEXT NOT NULL,
    "turnoId" TEXT NOT NULL,
    "escenarioId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,

    CONSTRAINT "turno_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intentos_turno" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "turnoId" TEXT NOT NULL,
    "estado" "EstadoIntentoTurno" NOT NULL DEFAULT 'EN_PROGRESO',
    "vidas" INTEGER NOT NULL DEFAULT 3,
    "indice" INTEGER NOT NULL DEFAULT 0,
    "puntajeFinal" DOUBLE PRECISION,
    "iniciadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizadoEn" TIMESTAMP(3),

    CONSTRAINT "intentos_turno_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "turno_items" ADD CONSTRAINT "turno_items_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "turnos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turno_items" ADD CONSTRAINT "turno_items_escenarioId_fkey" FOREIGN KEY ("escenarioId") REFERENCES "escenarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intentos_turno" ADD CONSTRAINT "intentos_turno_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intentos_turno" ADD CONSTRAINT "intentos_turno_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "turnos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intentos" ADD CONSTRAINT "intentos_intentoTurnoId_fkey" FOREIGN KEY ("intentoTurnoId") REFERENCES "intentos_turno"("id") ON DELETE SET NULL ON UPDATE CASCADE;
