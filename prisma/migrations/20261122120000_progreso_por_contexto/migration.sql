-- Cada clase a tu ritmo tiene su propio progreso ("ritmo:<recorridoId>"); "" = en vivo / repaso.
ALTER TABLE "progresos_clase" ADD COLUMN "contexto" TEXT NOT NULL DEFAULT '';

DROP INDEX "progresos_clase_usuarioId_leccion_actividad_key";
CREATE UNIQUE INDEX "progresos_clase_usuarioId_leccion_contexto_actividad_key" ON "progresos_clase"("usuarioId", "leccion", "contexto", "actividad");

-- Los recorridos que ya empezaron conservan su reporte tal como se veía (antes el progreso era compartido).
INSERT INTO "progresos_clase" ("id", "usuarioId", "leccion", "contexto", "actividad", "datos", "completado", "actualizadoEn")
SELECT 'mig' || md5(random()::text || p."id" || r."id"), p."usuarioId", p."leccion", 'ritmo:' || r."id", p."actividad", p."datos", p."completado", p."actualizadoEn"
FROM "progresos_clase" p
JOIN "recorridos_clase" r ON r."usuarioId" = p."usuarioId" AND r."iniciadoEn" IS NOT NULL
JOIN "asignaciones_clase" a ON a."id" = r."asignacionId" AND a."leccion" = p."leccion"
WHERE p."contexto" = '';
