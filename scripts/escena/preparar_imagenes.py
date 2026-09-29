#!/usr/bin/env python3
"""
Prepara las imágenes de una persona animada para la práctica virtual.

- Persona (1:1 sobre fondo gris claro liso): recorta el fondo desde los bordes superior y
  laterales (el borde de abajo es el cuerpo), suaviza el contorno, reduce a 900 px y guarda
  WebP con transparencia.
- Escena y primer plano (16:9): solo convierte a WebP.

Uso:
  python3 scripts/escena/preparar_imagenes.py persona  <entrada.png> <salida.webp>
  python3 scripts/escena/preparar_imagenes.py escena   <entrada.png> <salida.webp>

Requiere Pillow (pip install pillow). Ver docs/escena.md.
"""
import sys
from PIL import Image, ImageChops, ImageDraw, ImageFilter

CENTINELA = (255, 0, 255, 255)
GRIS_FONDO = (210, 210, 212)


def persona(entrada: str, salida: str, lado: int = 900) -> None:
    im = Image.open(entrada).convert("RGBA")
    w, h = im.size
    marcada = im.copy()
    semillas = [(x, 0) for x in range(0, w, 25)]
    semillas += [(0, y) for y in range(0, int(h * 0.9), 25)] + [(w - 1, y) for y in range(0, int(h * 0.9), 25)]
    for s in semillas:
        px = marcada.getpixel(s)
        if px != CENTINELA and sum(abs(a - b) for a, b in zip(px[:3], GRIS_FONDO)) < 40:
            ImageDraw.floodfill(marcada, s, CENTINELA, thresh=22)
    r, g, b, _ = marcada.split()
    diferencia = ImageChops.difference(Image.merge("RGB", (r, g, b)), Image.new("RGB", (w, h), CENTINELA[:3]))
    mascara = diferencia.convert("L").point(lambda v: 255 if v > 8 else 0)
    mascara = mascara.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
    im.putalpha(mascara)
    im.resize((lado, lado), Image.LANCZOS).save(salida, "WEBP", quality=84, method=6)


def escena(entrada: str, salida: str) -> None:
    im = Image.open(entrada)
    im = im.convert("RGBA" if im.mode in ("RGBA", "LA", "P") else "RGB")
    im.save(salida, "WEBP", quality=82, method=6)


if __name__ == "__main__":
    if len(sys.argv) != 4 or sys.argv[1] not in ("persona", "escena"):
        print(__doc__)
        sys.exit(1)
    (persona if sys.argv[1] == "persona" else escena)(sys.argv[2], sys.argv[3])
    print("Listo:", sys.argv[3])
