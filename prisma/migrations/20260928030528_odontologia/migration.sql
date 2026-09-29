-- CreateTable
CREATE TABLE "pacientes_odontologia" (
    "id" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "primerApellido" TEXT NOT NULL,
    "segundoApellido" TEXT,
    "tipoDocumento" TEXT NOT NULL,
    "documento" TEXT NOT NULL,
    "sexo" TEXT NOT NULL,
    "fechaNacimiento" TIMESTAMP(3) NOT NULL,
    "eps" TEXT,
    "profesion" TEXT,
    "ocupacion" TEXT,
    "estadoCivil" TEXT,
    "telefono" TEXT,
    "direccion" TEXT,
    "contactoEmergencia" TEXT,
    "parentescoContacto" TEXT,
    "telefonoContacto" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pacientes_odontologia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escenarios_odontologia" (
    "id" TEXT NOT NULL,
    "escenarioId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "denticion" TEXT NOT NULL,
    "motivoConsulta" TEXT NOT NULL,
    "relatoAnamnesis" TEXT NOT NULL,
    "relatoExamen" TEXT,
    "relatoRadiografia" TEXT,
    "esperado" JSONB NOT NULL,

    CONSTRAINT "escenarios_odontologia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "escenarios_odontologia_escenarioId_key" ON "escenarios_odontologia"("escenarioId");

-- AddForeignKey
ALTER TABLE "escenarios_odontologia" ADD CONSTRAINT "escenarios_odontologia_escenarioId_fkey" FOREIGN KEY ("escenarioId") REFERENCES "escenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escenarios_odontologia" ADD CONSTRAINT "escenarios_odontologia_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes_odontologia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
