/**
 * Los equipos desde los que se sigue la clase, sin React: lo puede importar el servidor (rutas de
 * la API) para validar lo que envía el estudiante. El hook y la detección están en dispositivo.ts.
 */
export type Dispositivo = "celular" | "chromebook" | "windows" | "mac" | "linux";

export const DISPOSITIVOS: { id: Dispositivo; nombre: string; icono: string }[] = [
  { id: "celular", nombre: "Celular o tableta", icono: "📱" },
  { id: "chromebook", nombre: "Chromebook", icono: "💻" },
  { id: "windows", nombre: "Windows", icono: "🪟" },
  { id: "mac", nombre: "Mac", icono: "🍎" },
  { id: "linux", nombre: "Linux", icono: "🐧" },
];

/** ¿Es un valor válido? (lo usa el servidor al recibir el equipo del estudiante). */
export const esDispositivo = (v: unknown): v is Dispositivo => typeof v === "string" && DISPOSITIVOS.some((d) => d.id === v);
