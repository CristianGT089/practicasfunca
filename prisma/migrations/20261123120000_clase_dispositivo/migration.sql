-- Desde qué equipo sigue cada estudiante la clase (celular, chromebook, windows, mac o linux).
ALTER TABLE "asistencias_clase" ADD COLUMN "dispositivo" TEXT;
ALTER TABLE "recorridos_clase" ADD COLUMN "dispositivo" TEXT;
