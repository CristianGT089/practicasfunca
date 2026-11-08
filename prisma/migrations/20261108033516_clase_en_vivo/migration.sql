-- CreateTable
CREATE TABLE "sesiones_clase" (
    "id" TEXT NOT NULL,
    "leccion" TEXT NOT NULL,
    "diapositiva" INTEGER NOT NULL DEFAULT 0,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "docenteId" TEXT NOT NULL,
    "grupoId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cerradaEn" TIMESTAMP(3),

    CONSTRAINT "sesiones_clase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asistencias_clase" (
    "id" TEXT NOT NULL,
    "sesionId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "diapositiva" INTEGER NOT NULL DEFAULT 0,
    "siguiendo" BOOLEAN NOT NULL DEFAULT true,
    "primeraVez" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimaVez" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asistencias_clase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progresos_clase" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "leccion" TEXT NOT NULL,
    "actividad" TEXT NOT NULL,
    "datos" JSONB NOT NULL DEFAULT '{}',
    "completado" BOOLEAN NOT NULL DEFAULT false,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "progresos_clase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sesiones_clase_activa_idx" ON "sesiones_clase"("activa");

-- CreateIndex
CREATE UNIQUE INDEX "asistencias_clase_sesionId_usuarioId_key" ON "asistencias_clase"("sesionId", "usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "progresos_clase_usuarioId_leccion_actividad_key" ON "progresos_clase"("usuarioId", "leccion", "actividad");

-- AddForeignKey
ALTER TABLE "sesiones_clase" ADD CONSTRAINT "sesiones_clase_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones_clase" ADD CONSTRAINT "sesiones_clase_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "grupos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencias_clase" ADD CONSTRAINT "asistencias_clase_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "sesiones_clase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencias_clase" ADD CONSTRAINT "asistencias_clase_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progresos_clase" ADD CONSTRAINT "progresos_clase_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
