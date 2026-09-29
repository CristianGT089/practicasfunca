/**
 * Personas animadas de la práctica virtual y escenas donde aparecen. Las imágenes viven en
 * public/personajes/<slug>/ y public/escenas/<slug>/ (WebP, persona con fondo transparente
 * en 1:1; escena y primer plano en 16:9). Ver docs/escena.md.
 *
 * Puro: se usa en el cliente.
 */

/** Momentos de la persona. Un personaje puede no tener todos: se usa `base` en su lugar. */
export type Frame = "base" | "hablando" | "parpadeo" | "entregandoDocumento" | "seNiega" | "contento" | "tranquilo";

export type DefinicionPersonaje = {
  slug: string;
  /** Nombre para la ficha técnica; en la escena se muestra el nombre del paciente del caso. */
  descripcion: string;
  frames: Partial<Record<Frame, string>> & { base: string };
  /** Dónde está el papel que ofrece en el frame `entregandoDocumento` (en % de su imagen). */
  zonaDocumento?: { left: number; top: number; width: number; height: number };
};

export const PERSONAJES: Record<string, DefinicionPersonaje> = {
  gloria: {
    slug: "gloria",
    descripcion: "Mujer de unos 55 años, cárdigan vinotinto, bolso café.",
    frames: {
      base: "/personajes/gloria/base.webp",
      entregandoDocumento: "/personajes/gloria/entregando-documento.webp",
      seNiega: "/personajes/gloria/se-niega.webp",
    },
    zonaDocumento: { left: 46, top: 70, width: 39, height: 28 },
  },
};

export type DefinicionEscena = {
  slug: string;
  fondo: string;
  primerPlano: string;
  /** Pantalla vacía del fondo donde se pinta el turno (en % de la escena), si la hay. */
  pantallaTurno?: { left: number; top: number; width: number; height: number };
};

export const ESCENAS: Record<string, DefinicionEscena> = {
  farmacia: {
    slug: "farmacia",
    fondo: "/escenas/farmacia/fondo.webp",
    primerPlano: "/escenas/farmacia/mostrador.webp",
    pantallaTurno: { left: 48.6, top: 4.7, width: 10.8, height: 12.1 },
  },
};

export function obtenerPersonaje(slug: string | null | undefined): DefinicionPersonaje | null {
  return slug ? (PERSONAJES[slug] ?? null) : null;
}

export function srcFrame(p: DefinicionPersonaje, frame: Frame): string {
  return p.frames[frame] ?? p.frames.base;
}
