-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "sesionTurneroId" TEXT;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_sesionTurneroId_fkey" FOREIGN KEY ("sesionTurneroId") REFERENCES "sesiones_turnero"("id") ON DELETE SET NULL ON UPDATE CASCADE;
