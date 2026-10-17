-- AlterEnum
ALTER TYPE "TipoSimulacion" ADD VALUE 'RECEPCION';

-- AlterTable
ALTER TABLE "atenciones_jornada" ADD COLUMN     "entregaProveedorId" TEXT;

-- CreateTable
CREATE TABLE "entregas_proveedor" (
    "id" TEXT NOT NULL,
    "simulacionId" TEXT NOT NULL,
    "factura" TEXT NOT NULL,
    "ordenCompra" TEXT NOT NULL,
    "proveedor" TEXT NOT NULL,
    "nitProveedor" TEXT NOT NULL,
    "estudianteId" TEXT,
    "transportador" TEXT NOT NULL,
    "situaciones" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "orden" INTEGER NOT NULL DEFAULT 0,
    "espacioNumero" INTEGER,
    "iniciadaEn" TIMESTAMP(3),
    "actaFirmadaEn" TIMESTAMP(3),
    "observaciones" TEXT,
    "usuarioId" TEXT,

    CONSTRAINT "entregas_proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items_recepcion" (
    "id" TEXT NOT NULL,
    "entregaId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "presentacion" TEXT NOT NULL,
    "laboratorio" TEXT,
    "esDispositivo" BOOLEAN NOT NULL DEFAULT false,
    "requiereFrio" BOOLEAN NOT NULL DEFAULT false,
    "registroInvima" TEXT NOT NULL,
    "cantidadPedida" INTEGER NOT NULL,
    "cantidadFacturada" INTEGER NOT NULL,
    "loteFacturado" TEXT NOT NULL,
    "vencimientoFacturado" TIMESTAMP(3) NOT NULL,
    "cantidadLlega" INTEGER NOT NULL,
    "loteReal" TEXT NOT NULL,
    "vencimientoReal" TIMESTAMP(3) NOT NULL,
    "registroEtiqueta" TEXT,
    "temperaturaLlegada" DOUBLE PRECISION,
    "empaqueIntegro" BOOLEAN NOT NULL DEFAULT true,
    "defecto" TEXT,
    "registro" JSONB,
    "actualizadoEn" TIMESTAMP(3),

    CONSTRAINT "items_recepcion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "entregas_proveedor_simulacionId_factura_key" ON "entregas_proveedor"("simulacionId", "factura");

-- AddForeignKey
ALTER TABLE "atenciones_jornada" ADD CONSTRAINT "atenciones_jornada_entregaProveedorId_fkey" FOREIGN KEY ("entregaProveedorId") REFERENCES "entregas_proveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas_proveedor" ADD CONSTRAINT "entregas_proveedor_simulacionId_fkey" FOREIGN KEY ("simulacionId") REFERENCES "simulaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_recepcion" ADD CONSTRAINT "items_recepcion_entregaId_fkey" FOREIGN KEY ("entregaId") REFERENCES "entregas_proveedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
