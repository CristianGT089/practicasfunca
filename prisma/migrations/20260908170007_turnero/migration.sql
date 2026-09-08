-- CreateEnum
CREATE TYPE "ReglaPrioridad" AS ENUM ('ESTRICTA', 'INTERCALADA');

-- CreateEnum
CREATE TYPE "EstadoSesionTurnero" AS ENUM ('ABIERTA', 'CERRADA');

-- CreateEnum
CREATE TYPE "EstadoEspacio" AS ENUM ('LIBRE', 'LLAMANDO', 'ATENDIENDO', 'PAUSA');

-- CreateEnum
CREATE TYPE "EstadoTicket" AS ENUM ('EN_ESPERA', 'LLAMADO', 'ATENDIDO', 'NO_SE_PRESENTO');

-- CreateTable
CREATE TABLE "turneros" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "numeroEspacios" INTEGER NOT NULL DEFAULT 3,
    "servicios" JSONB NOT NULL,
    "categorias" JSONB NOT NULL,
    "reglaPrioridad" "ReglaPrioridad" NOT NULL DEFAULT 'ESTRICTA',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "turneros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesiones_turnero" (
    "id" TEXT NOT NULL,
    "turneroId" TEXT NOT NULL,
    "numeroEspacios" INTEGER NOT NULL,
    "estado" "EstadoSesionTurnero" NOT NULL DEFAULT 'ABIERTA',
    "iniciadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cerradaEn" TIMESTAMP(3),

    CONSTRAINT "sesiones_turnero_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "espacios_turnero" (
    "id" TEXT NOT NULL,
    "sesionId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "nombre" TEXT,
    "estado" "EstadoEspacio" NOT NULL DEFAULT 'LIBRE',
    "ticketActualId" TEXT,

    CONSTRAINT "espacios_turnero_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets_turnero" (
    "id" TEXT NOT NULL,
    "sesionId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "servicioCodigo" TEXT NOT NULL,
    "prioritario" BOOLEAN NOT NULL DEFAULT false,
    "categoria" TEXT,
    "estado" "EstadoTicket" NOT NULL DEFAULT 'EN_ESPERA',
    "espacioNumero" INTEGER,
    "emitidoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "llamadoEn" TIMESTAMP(3),
    "cerradoEn" TIMESTAMP(3),

    CONSTRAINT "tickets_turnero_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "espacios_turnero_ticketActualId_key" ON "espacios_turnero"("ticketActualId");

-- CreateIndex
CREATE UNIQUE INDEX "espacios_turnero_sesionId_numero_key" ON "espacios_turnero"("sesionId", "numero");

-- CreateIndex
CREATE INDEX "tickets_turnero_sesionId_estado_idx" ON "tickets_turnero"("sesionId", "estado");

-- AddForeignKey
ALTER TABLE "sesiones_turnero" ADD CONSTRAINT "sesiones_turnero_turneroId_fkey" FOREIGN KEY ("turneroId") REFERENCES "turneros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "espacios_turnero" ADD CONSTRAINT "espacios_turnero_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "sesiones_turnero"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "espacios_turnero" ADD CONSTRAINT "espacios_turnero_ticketActualId_fkey" FOREIGN KEY ("ticketActualId") REFERENCES "tickets_turnero"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets_turnero" ADD CONSTRAINT "tickets_turnero_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "sesiones_turnero"("id") ON DELETE CASCADE ON UPDATE CASCADE;
