# Escena de la práctica virtual (personas animadas)

Casos de práctica virtual al estilo *Papers, Please*: la persona aparece detrás del
mostrador, habla en burbujas, reacciona a lo que hace el estudiante y le pasa documentos que
se abren con un clic. Hoy está integrada en **Farmacia**; el componente es genérico.

## Piezas

| Pieza | Dónde |
|---|---|
| Componente de la escena | `src/components/escena/EscenaVentanilla.tsx` (+ `.module.css`) |
| Catálogo de personas y escenas | `src/lib/escena/personajes.ts` |
| Guion (frases, respuestas, trato) | `src/lib/escena/guion.ts` |
| Imágenes | `public/personajes/<slug>/`, `public/escenas/<slug>/` |
| Datos por caso | `Escenario.personaje` (slug) y `Escenario.guion` (JSON) |
| Editor para docentes | Admin → Práctica virtual → "Persona y diálogo" |
| Casos de ejemplo | `prisma/seed-escenas.ts` (Gloria en dos casos de Diazepam) |

## Capas

1. **Fondo** 16:9, sin personas. La pantalla vacía (`pantallaTurno`) muestra el turno.
2. **Persona** 1:1, fondo transparente. Cambia de frame según la acción.
3. **Primer plano** (mostrador) 16:9, transparente arriba. Tapa a la persona desde la cintura.

En pantallas angostas la escena pasa a 1:1 y el lienzo 16:9 se recorta por los lados.

## Frames de una persona

`base` es obligatorio; los demás son opcionales (si faltan, se usa `base`).

| Frame | Cuándo |
|---|---|
| `base` | Esperando, escuchando |
| `entregandoDocumento` | Al pedirle la fórmula; el papel es clicable (`zonaDocumento`, en % de la imagen) |
| `seNiega` | Al negarse a mostrar la cédula, o cuando no se le vende |
| `hablando`, `parpadeo`, `contento`, `tranquilo` | Previstos; aún no hay imágenes de Gloria |

## Agregar una persona

1. Generar las imágenes con el mismo estilo (1:1, fondo gris claro liso, misma pose y encuadre
   en todos los frames, sin texto legible en los documentos).
2. Prepararlas: `python3 scripts/escena/preparar_imagenes.py persona entrada.png public/personajes/<slug>/base.webp`
   (y así con cada frame).
3. Agregarla en `PERSONAJES` (`lib/escena/personajes.ts`) con la zona del documento.
4. Asignarla a un caso desde "Persona y diálogo".

## Guion y trato

- `entrada`: lo primero que dice. `animoInicial`: 0 furiosa … 4 satisfecha.
- `frases`: lo que dice en cada momento (entrega la cédula, se niega, entrega la fórmula, no
  trae fórmula, el estudiante se equivoca, venta, rechazo).
- `respuestas`: en el saludo, cuando se niega a dar la cédula y al explicar un rechazo, el
  estudiante elige entre opciones con efecto −2 a +2 en el ánimo. Se registran como acción
  `RESPONDER { momento, indice }`, que nunca cuesta corazones.
- **Trato:** cada respuesta vale según su efecto frente a la mejor y la peor opción de ese
  momento; el promedio pesa el **15 %** de la nota (`finalizar`). La decisión clínica se
  califica igual que antes: la correcta puede molestar al paciente, y lo que se evalúa es
  cómo se maneja.
