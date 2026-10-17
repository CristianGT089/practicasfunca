-- CreateEnum
CREATE TYPE "TipoCita" AS ENUM ('VALORACION', 'CONTROL', 'TRATAMIENTO', 'URGENCIA');

-- CreateEnum
CREATE TYPE "EstadoCita" AS ENUM ('PROGRAMADA', 'CONFIRMADA', 'ATENDIDA', 'NO_ASISTIO', 'CANCELADA');

-- CreateTable
CREATE TABLE "citas_odontologia" (
    "id" TEXT NOT NULL,
    "simulacionId" TEXT,
    "unidad" INTEGER NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "duracionMin" INTEGER NOT NULL,
    "tipo" "TipoCita" NOT NULL,
    "motivo" TEXT NOT NULL,
    "pacienteNombre" TEXT NOT NULL,
    "pacienteDocumento" TEXT NOT NULL,
    "pacienteTelefono" TEXT,
    "acudienteNombre" TEXT,
    "estado" "EstadoCita" NOT NULL DEFAULT 'PROGRAMADA',
    "solicitadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaPedidaPorPaciente" BOOLEAN NOT NULL DEFAULT false,
    "observaciones" TEXT,
    "deRelleno" BOOLEAN NOT NULL DEFAULT false,
    "atencionId" TEXT,
    "creadaPorId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "citas_odontologia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "citas_odontologia_simulacionId_inicio_idx" ON "citas_odontologia"("simulacionId", "inicio");

-- CreateIndex
CREATE INDEX "citas_odontologia_inicio_idx" ON "citas_odontologia"("inicio");

-- AddForeignKey
ALTER TABLE "citas_odontologia" ADD CONSTRAINT "citas_odontologia_simulacionId_fkey" FOREIGN KEY ("simulacionId") REFERENCES "simulaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
