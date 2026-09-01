-- AlterTable
ALTER TABLE "medicamentos" ADD COLUMN     "claveUnica" TEXT;

-- Índice único PARCIAL: solo exige unicidad de claveUnica dentro del catálogo real
-- (CATALOGO_REAL). Los medicamentos de práctica no la usan y no deben verse afectados.
CREATE UNIQUE INDEX "medicamentos_catalogo_real_clave_unica"
  ON "medicamentos" ("claveUnica")
  WHERE "origen" = 'CATALOGO_REAL' AND "claveUnica" IS NOT NULL;
