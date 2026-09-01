-- Multi-módulo: agrega Modulo/Matricula, generaliza Escenario/Turno con moduloId,
-- extrae los campos de Farmacia a EscenarioFarmacia/FarmaciaItemEscenario (antes
-- items_escenario), amplía TipoAccion/ResultadoEsperado de enum a texto libre por
-- módulo, y crea el esqueleto de Enfermería y Primera Infancia.
--
-- Escrita a mano (no autogenerada) para poder hacer el backfill de datos existentes
-- de Farmacia sin perderlos.

-- ===== 1. Nuevas tablas base =====

CREATE TABLE "modulos" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "colorTema" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "modulos_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "modulos_slug_key" ON "modulos"("slug");

CREATE TABLE "matriculas" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "moduloId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "matriculas_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "matriculas_usuarioId_moduloId_key" ON "matriculas"("usuarioId", "moduloId");
ALTER TABLE "matriculas" ADD CONSTRAINT "matriculas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "matriculas" ADD CONSTRAINT "matriculas_moduloId_fkey" FOREIGN KEY ("moduloId") REFERENCES "modulos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed del módulo Farmacia (necesario para el backfill de moduloId más abajo).
INSERT INTO "modulos" ("id", "slug", "nombre", "descripcion", "colorTema", "activo")
VALUES ('modulo-farmacia', 'farmacia', 'Farmacia', 'Simulador de auxiliar en farmacia', '#2563eb', true);

-- ===== 2. moduloId en Escenario / Turno (backfill a Farmacia) =====

ALTER TABLE "escenarios" ADD COLUMN "moduloId" TEXT;
UPDATE "escenarios" SET "moduloId" = 'modulo-farmacia';
ALTER TABLE "escenarios" ALTER COLUMN "moduloId" SET NOT NULL;
ALTER TABLE "escenarios" ADD CONSTRAINT "escenarios_moduloId_fkey" FOREIGN KEY ("moduloId") REFERENCES "modulos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "turnos" ADD COLUMN "moduloId" TEXT;
UPDATE "turnos" SET "moduloId" = 'modulo-farmacia';
ALTER TABLE "turnos" ALTER COLUMN "moduloId" SET NOT NULL;
ALTER TABLE "turnos" ADD CONSTRAINT "turnos_moduloId_fkey" FOREIGN KEY ("moduloId") REFERENCES "modulos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ===== 3. Extensión EscenarioFarmacia + FarmaciaItemEscenario (mueve datos de Escenario / items_escenario) =====

CREATE TABLE "escenarios_farmacia" (
    "id" TEXT NOT NULL,
    "escenarioId" TEXT NOT NULL,
    "pacienteId" TEXT,
    "recetaPresentada" BOOLEAN NOT NULL DEFAULT false,
    "notaRecetaFisica" TEXT,
    "actitudCedula" "ActitudCedula",
    "recetaFisicaPacienteNombre" TEXT,
    "recetaFisicaMedicamento" TEXT,
    "recetaFisicaPosologia" TEXT,
    "recetaFisicaCantidad" TEXT,
    "recetaFisicaCantidadTachada" TEXT,
    "recetaFisicaMedico" TEXT,
    "recetaFisicaRegistroMedico" TEXT,
    "recetaFisicaFechaEmision" TIMESTAMP(3),
    "recetaFisicaDiasVigencia" INTEGER,
    "recetaFisicaControlado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "escenarios_farmacia_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "escenarios_farmacia_escenarioId_key" ON "escenarios_farmacia"("escenarioId");
ALTER TABLE "escenarios_farmacia" ADD CONSTRAINT "escenarios_farmacia_escenarioId_fkey" FOREIGN KEY ("escenarioId") REFERENCES "escenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "escenarios_farmacia" ADD CONSTRAINT "escenarios_farmacia_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "items_escenario_farmacia" (
    "id" TEXT NOT NULL,
    "escenarioFarmaciaId" TEXT NOT NULL,
    "medicamentoId" TEXT NOT NULL,
    "cantidadEsperada" INTEGER,

    CONSTRAINT "items_escenario_farmacia_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "items_escenario_farmacia" ADD CONSTRAINT "items_escenario_farmacia_escenarioFarmaciaId_fkey" FOREIGN KEY ("escenarioFarmaciaId") REFERENCES "escenarios_farmacia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "items_escenario_farmacia" ADD CONSTRAINT "items_escenario_farmacia_medicamentoId_fkey" FOREIGN KEY ("medicamentoId") REFERENCES "medicamentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: una fila de escenarios_farmacia por cada Escenario existente (todos son de Farmacia).
INSERT INTO "escenarios_farmacia" (
    "id", "escenarioId", "pacienteId", "recetaPresentada", "notaRecetaFisica", "actitudCedula",
    "recetaFisicaPacienteNombre", "recetaFisicaMedicamento", "recetaFisicaPosologia",
    "recetaFisicaCantidad", "recetaFisicaCantidadTachada", "recetaFisicaMedico",
    "recetaFisicaRegistroMedico", "recetaFisicaFechaEmision", "recetaFisicaDiasVigencia",
    "recetaFisicaControlado"
)
SELECT
    gen_random_uuid()::text, "id", "pacienteId", "recetaPresentada", "notaRecetaFisica", "actitudCedula",
    "recetaFisicaPacienteNombre", "recetaFisicaMedicamento", "recetaFisicaPosologia",
    "recetaFisicaCantidad", "recetaFisicaCantidadTachada", "recetaFisicaMedico",
    "recetaFisicaRegistroMedico", "recetaFisicaFechaEmision", "recetaFisicaDiasVigencia",
    "recetaFisicaControlado"
FROM "escenarios";

-- Backfill: mueve items_escenario -> items_escenario_farmacia (vía la escenarios_farmacia recién creada).
INSERT INTO "items_escenario_farmacia" ("id", "escenarioFarmaciaId", "medicamentoId", "cantidadEsperada")
SELECT gen_random_uuid()::text, ef."id", ie."medicamentoId", ie."cantidadEsperada"
FROM "items_escenario" ie
JOIN "escenarios_farmacia" ef ON ef."escenarioId" = ie."escenarioId";

-- Limpieza: quita de Escenario los campos que ya viven en EscenarioFarmacia, y la tabla vieja.
ALTER TABLE "escenarios" DROP CONSTRAINT "escenarios_pacienteId_fkey";
ALTER TABLE "items_escenario" DROP CONSTRAINT "items_escenario_escenarioId_fkey";
ALTER TABLE "items_escenario" DROP CONSTRAINT "items_escenario_medicamentoId_fkey";
DROP TABLE "items_escenario";

ALTER TABLE "escenarios"
    DROP COLUMN "actitudCedula",
    DROP COLUMN "notaRecetaFisica",
    DROP COLUMN "pacienteId",
    DROP COLUMN "recetaFisicaCantidad",
    DROP COLUMN "recetaFisicaCantidadTachada",
    DROP COLUMN "recetaFisicaControlado",
    DROP COLUMN "recetaFisicaDiasVigencia",
    DROP COLUMN "recetaFisicaFechaEmision",
    DROP COLUMN "recetaFisicaMedicamento",
    DROP COLUMN "recetaFisicaMedico",
    DROP COLUMN "recetaFisicaPacienteNombre",
    DROP COLUMN "recetaFisicaPosologia",
    DROP COLUMN "recetaFisicaRegistroMedico",
    DROP COLUMN "recetaPresentada";

-- ===== 4. TipoAccion / ResultadoEsperado: de enum de Postgres a texto libre por módulo =====
-- (cast trivial enum::text, preserva los valores existentes)

ALTER TABLE "acciones" ALTER COLUMN "tipo" TYPE TEXT USING "tipo"::text;
ALTER TABLE "pasos_esperados" ALTER COLUMN "tipoAccion" TYPE TEXT USING "tipoAccion"::text;
ALTER TABLE "escenarios" ALTER COLUMN "resultadoEsperado" TYPE TEXT USING "resultadoEsperado"::text;

DROP TYPE "TipoAccion";
DROP TYPE "ResultadoEsperado";

-- ===== 5. Resultado obtenido explícito en Intento =====

ALTER TABLE "intentos" ADD COLUMN "resultadoObtenido" TEXT;

-- ===== 6. Esqueleto Enfermería =====

CREATE TABLE "pacientes_enfermeria" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "edad" INTEGER NOT NULL,
    "alergias" TEXT[],
    "antecedentes" TEXT,
    "habitacion" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pacientes_enfermeria_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ordenes_medicas" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "medicamento" TEXT NOT NULL,
    "dosis" TEXT NOT NULL,
    "via" TEXT NOT NULL,
    "frecuencia" TEXT NOT NULL,
    "medico" TEXT NOT NULL,
    "fechaEmision" TIMESTAMP(3) NOT NULL,
    "fechaVigencia" TIMESTAMP(3) NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ordenes_medicas_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "ordenes_medicas" ADD CONSTRAINT "ordenes_medicas_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes_enfermeria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "escenarios_enfermeria" (
    "id" TEXT NOT NULL,
    "escenarioId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "ordenMedicaId" TEXT,
    "contexto" TEXT,

    CONSTRAINT "escenarios_enfermeria_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "escenarios_enfermeria_escenarioId_key" ON "escenarios_enfermeria"("escenarioId");
ALTER TABLE "escenarios_enfermeria" ADD CONSTRAINT "escenarios_enfermeria_escenarioId_fkey" FOREIGN KEY ("escenarioId") REFERENCES "escenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "escenarios_enfermeria" ADD CONSTRAINT "escenarios_enfermeria_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes_enfermeria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "escenarios_enfermeria" ADD CONSTRAINT "escenarios_enfermeria_ordenMedicaId_fkey" FOREIGN KEY ("ordenMedicaId") REFERENCES "ordenes_medicas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ===== 7. Esqueleto Primera Infancia (sin UI/contenido todavía) =====

CREATE TABLE "ninos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "edadMeses" INTEGER NOT NULL,
    "cuidador" TEXT,
    "antecedentes" TEXT,
    "fechaNacimiento" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ninos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "escenarios_primera_infancia" (
    "id" TEXT NOT NULL,
    "escenarioId" TEXT NOT NULL,
    "ninoId" TEXT NOT NULL,
    "contexto" TEXT,

    CONSTRAINT "escenarios_primera_infancia_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "escenarios_primera_infancia_escenarioId_key" ON "escenarios_primera_infancia"("escenarioId");
ALTER TABLE "escenarios_primera_infancia" ADD CONSTRAINT "escenarios_primera_infancia_escenarioId_fkey" FOREIGN KEY ("escenarioId") REFERENCES "escenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "escenarios_primera_infancia" ADD CONSTRAINT "escenarios_primera_infancia_ninoId_fkey" FOREIGN KEY ("ninoId") REFERENCES "ninos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
