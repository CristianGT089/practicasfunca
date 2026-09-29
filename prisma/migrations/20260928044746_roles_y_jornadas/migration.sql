-- AlterEnum
ALTER TYPE "EstadoSimulacion" ADD VALUE 'EN_REVISION';

-- AlterEnum
ALTER TYPE "Rol" ADD VALUE 'DOCENTE';

-- AlterTable
ALTER TABLE "pacientes" ADD COLUMN     "situaciones" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "simulaciones" ADD COLUMN     "creadaPorId" TEXT,
ADD COLUMN     "grupoId" TEXT,
ADD COLUMN     "situaciones" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "creadoPorId" TEXT;

-- CreateTable
CREATE TABLE "grupos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grupos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participantes_jornada" (
    "id" TEXT NOT NULL,
    "simulacionId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "usuarioId" TEXT,
    "invitado" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "participantes_jornada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asignaciones_espacio" (
    "id" TEXT NOT NULL,
    "simulacionId" TEXT NOT NULL,
    "espacioNumero" INTEGER NOT NULL,
    "participanteId" TEXT,
    "desde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asignaciones_espacio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atenciones_jornada" (
    "id" TEXT NOT NULL,
    "simulacionId" TEXT NOT NULL,
    "pacienteId" TEXT,
    "participanteId" TEXT,
    "ticketCodigo" TEXT,
    "espacioNumero" INTEGER,
    "llamadoEn" TIMESTAMP(3),
    "pacienteNombre" TEXT NOT NULL,
    "pacienteCedula" TEXT NOT NULL,
    "situaciones" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "criterios" JSONB,
    "puntaje" DOUBLE PRECISION,
    "calificadaEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "atenciones_jornada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_GrupoDocentes" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_GrupoDocentes_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_GrupoEstudiantes" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_GrupoEstudiantes_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_GrupoModulos" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_GrupoModulos_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "asignaciones_espacio_simulacionId_espacioNumero_idx" ON "asignaciones_espacio"("simulacionId", "espacioNumero");

-- CreateIndex
CREATE INDEX "atenciones_jornada_simulacionId_idx" ON "atenciones_jornada"("simulacionId");

-- CreateIndex
CREATE INDEX "_GrupoDocentes_B_index" ON "_GrupoDocentes"("B");

-- CreateIndex
CREATE INDEX "_GrupoEstudiantes_B_index" ON "_GrupoEstudiantes"("B");

-- CreateIndex
CREATE INDEX "_GrupoModulos_B_index" ON "_GrupoModulos"("B");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulaciones" ADD CONSTRAINT "simulaciones_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "grupos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulaciones" ADD CONSTRAINT "simulaciones_creadaPorId_fkey" FOREIGN KEY ("creadaPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participantes_jornada" ADD CONSTRAINT "participantes_jornada_simulacionId_fkey" FOREIGN KEY ("simulacionId") REFERENCES "simulaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participantes_jornada" ADD CONSTRAINT "participantes_jornada_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_espacio" ADD CONSTRAINT "asignaciones_espacio_simulacionId_fkey" FOREIGN KEY ("simulacionId") REFERENCES "simulaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_espacio" ADD CONSTRAINT "asignaciones_espacio_participanteId_fkey" FOREIGN KEY ("participanteId") REFERENCES "participantes_jornada"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atenciones_jornada" ADD CONSTRAINT "atenciones_jornada_simulacionId_fkey" FOREIGN KEY ("simulacionId") REFERENCES "simulaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atenciones_jornada" ADD CONSTRAINT "atenciones_jornada_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atenciones_jornada" ADD CONSTRAINT "atenciones_jornada_participanteId_fkey" FOREIGN KEY ("participanteId") REFERENCES "participantes_jornada"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GrupoDocentes" ADD CONSTRAINT "_GrupoDocentes_A_fkey" FOREIGN KEY ("A") REFERENCES "grupos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GrupoDocentes" ADD CONSTRAINT "_GrupoDocentes_B_fkey" FOREIGN KEY ("B") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GrupoEstudiantes" ADD CONSTRAINT "_GrupoEstudiantes_A_fkey" FOREIGN KEY ("A") REFERENCES "grupos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GrupoEstudiantes" ADD CONSTRAINT "_GrupoEstudiantes_B_fkey" FOREIGN KEY ("B") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GrupoModulos" ADD CONSTRAINT "_GrupoModulos_A_fkey" FOREIGN KEY ("A") REFERENCES "grupos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GrupoModulos" ADD CONSTRAINT "_GrupoModulos_B_fkey" FOREIGN KEY ("B") REFERENCES "modulos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
