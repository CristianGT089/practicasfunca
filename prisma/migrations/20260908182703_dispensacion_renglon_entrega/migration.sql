-- AlterTable
ALTER TABLE "entregas_dispensacion" ADD COLUMN     "renglonFormulaId" TEXT;

-- AddForeignKey
ALTER TABLE "entregas_dispensacion" ADD CONSTRAINT "entregas_dispensacion_renglonFormulaId_fkey" FOREIGN KEY ("renglonFormulaId") REFERENCES "renglones_formula"("id") ON DELETE SET NULL ON UPDATE CASCADE;
