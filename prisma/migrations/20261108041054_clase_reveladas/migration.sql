-- AlterTable
ALTER TABLE "sesiones_clase" ADD COLUMN     "reveladas" TEXT[] DEFAULT ARRAY[]::TEXT[];
