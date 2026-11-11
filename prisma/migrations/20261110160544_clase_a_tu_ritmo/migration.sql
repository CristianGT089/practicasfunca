-- CreateTable
CREATE TABLE "asignaciones_clase" (
    "id" TEXT NOT NULL,
    "leccion" TEXT NOT NULL,
    "docenteId" TEXT NOT NULL,
    "grupoId" TEXT,
    "mensaje" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asignaciones_clase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recorridos_clase" (
    "id" TEXT NOT NULL,
    "asignacionId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "diapositiva" INTEGER NOT NULL DEFAULT 0,
    "maxima" INTEGER NOT NULL DEFAULT 0,
    "iniciadoEn" TIMESTAMP(3),
    "terminadoEn" TIMESTAMP(3),
    "revisado" BOOLEAN NOT NULL DEFAULT false,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recorridos_clase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "asignaciones_clase_activa_idx" ON "asignaciones_clase"("activa");

-- CreateIndex
CREATE UNIQUE INDEX "recorridos_clase_asignacionId_usuarioId_key" ON "recorridos_clase"("asignacionId", "usuarioId");

-- AddForeignKey
ALTER TABLE "asignaciones_clase" ADD CONSTRAINT "asignaciones_clase_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_clase" ADD CONSTRAINT "asignaciones_clase_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "grupos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recorridos_clase" ADD CONSTRAINT "recorridos_clase_asignacionId_fkey" FOREIGN KEY ("asignacionId") REFERENCES "asignaciones_clase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recorridos_clase" ADD CONSTRAINT "recorridos_clase_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
