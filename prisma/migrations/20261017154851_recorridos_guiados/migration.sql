/*
  Warnings:

  - You are about to drop the column `guiaVistaEn` on the `usuarios` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "usuarios" DROP COLUMN "guiaVistaEn",
ADD COLUMN     "guiasVistas" TEXT[] DEFAULT ARRAY[]::TEXT[];
