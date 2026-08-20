-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ESTUDIANTE', 'ADMIN');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('ENTRADA', 'SALIDA', 'AJUSTE');

-- CreateEnum
CREATE TYPE "ResultadoEsperado" AS ENUM ('VENTA_CORRECTA', 'RECHAZO_CORRECTO');

-- CreateEnum
CREATE TYPE "TipoAccion" AS ENUM ('BUSCAR_MEDICAMENTO', 'VER_FICHA_PACIENTE', 'VERIFICAR_RECETA', 'VERIFICAR_ALERGIA', 'VERIFICAR_STOCK', 'VERIFICAR_VENCIMIENTO', 'REGISTRAR_CONTROLADO', 'AGREGAR_A_VENTA', 'QUITAR_DE_VENTA', 'COMPLETAR_VENTA', 'RECHAZAR_VENTA', 'AJUSTAR_INVENTARIO');

-- CreateEnum
CREATE TYPE "EstadoIntento" AS ENUM ('EN_PROGRESO', 'COMPLETADO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "usuario" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'ESTUDIANTE',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicamentos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "principioActivo" TEXT NOT NULL,
    "presentacion" TEXT NOT NULL,
    "requiereReceta" BOOLEAN NOT NULL DEFAULT false,
    "esControlado" BOOLEAN NOT NULL DEFAULT false,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "precio" INTEGER NOT NULL,
    "loteVencimiento" TIMESTAMP(3),
    "tags" TEXT[],
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medicamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_inventario" (
    "id" TEXT NOT NULL,
    "medicamentoId" TEXT NOT NULL,
    "tipo" "TipoMovimiento" NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "motivo" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pacientes" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cedula" TEXT NOT NULL,
    "edad" INTEGER NOT NULL,
    "alergias" TEXT[],
    "antecedentes" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pacientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escenarios" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "pacienteId" TEXT,
    "resultadoEsperado" "ResultadoEsperado" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "escenarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items_escenario" (
    "id" TEXT NOT NULL,
    "escenarioId" TEXT NOT NULL,
    "medicamentoId" TEXT NOT NULL,
    "cantidadEsperada" INTEGER,

    CONSTRAINT "items_escenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pasos_esperados" (
    "id" TEXT NOT NULL,
    "escenarioId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "tipoAccion" "TipoAccion" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "parametros" JSONB,
    "obligatorio" BOOLEAN NOT NULL DEFAULT true,
    "peso" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "pasos_esperados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intentos" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "escenarioId" TEXT NOT NULL,
    "estado" "EstadoIntento" NOT NULL DEFAULT 'EN_PROGRESO',
    "iniciadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizadoEn" TIMESTAMP(3),
    "puntajeProceso" DOUBLE PRECISION,
    "puntajeResultado" DOUBLE PRECISION,
    "puntajeFinal" DOUBLE PRECISION,

    CONSTRAINT "intentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acciones" (
    "id" TEXT NOT NULL,
    "intentoId" TEXT NOT NULL,
    "tipo" "TipoAccion" NOT NULL,
    "payload" JSONB,
    "esCorrecta" BOOLEAN,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "acciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_usuario_key" ON "usuarios"("usuario");

-- CreateIndex
CREATE UNIQUE INDEX "pacientes_cedula_key" ON "pacientes"("cedula");

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_medicamentoId_fkey" FOREIGN KEY ("medicamentoId") REFERENCES "medicamentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escenarios" ADD CONSTRAINT "escenarios_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_escenario" ADD CONSTRAINT "items_escenario_escenarioId_fkey" FOREIGN KEY ("escenarioId") REFERENCES "escenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_escenario" ADD CONSTRAINT "items_escenario_medicamentoId_fkey" FOREIGN KEY ("medicamentoId") REFERENCES "medicamentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pasos_esperados" ADD CONSTRAINT "pasos_esperados_escenarioId_fkey" FOREIGN KEY ("escenarioId") REFERENCES "escenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intentos" ADD CONSTRAINT "intentos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intentos" ADD CONSTRAINT "intentos_escenarioId_fkey" FOREIGN KEY ("escenarioId") REFERENCES "escenarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acciones" ADD CONSTRAINT "acciones_intentoId_fkey" FOREIGN KEY ("intentoId") REFERENCES "intentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
