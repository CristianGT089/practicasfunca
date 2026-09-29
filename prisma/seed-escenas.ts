/**
 * Personas animadas y guiones de la práctica virtual (ver docs/escena.md). Se aplican a
 * casos existentes por título; se puede volver a correr sin duplicar nada.
 */
import type { PrismaClient } from "@prisma/client";
import type { Guion } from "../src/lib/escena/guion";

const ESCENAS: { titulo: string; personaje: string; guion: Guion }[] = [
  {
    titulo: "Cliente pide Diazepam",
    personaje: "gloria",
    guion: {
      animoInicial: 1,
      entrada: "¡Por fin! Llevo media hora esperando. Necesito un Diazepam para dormir, que llevo días sin pegar el ojo.",
      frases: {
        sinReceta: "No, no traigo fórmula. Siempre me lo venden sin eso.",
        negarCedula: "¿Mi cédula? ¿Y para qué? Solo quiero unas pastillas para dormir.",
        error: "¿Y ahora qué pasa?",
        rechazo: "¿Cómo así que no me lo va a vender?",
        venta: "Por fin. Gracias.",
      },
      respuestas: {
        saludo: [
          {
            texto: "Buenas tardes, señora. Disculpe la espera. Cuénteme, ¿en qué le ayudo?",
            efecto: 1,
            respuesta: "Mmm, bueno. Es que no duermo nada, necesito el Diazepam.",
          },
          { texto: "¿Qué necesita?", efecto: 0, respuesta: "Ya le dije: Diazepam." },
          { texto: "Todos esperamos, señora. Dígame rápido.", efecto: -1, respuesta: "¡Qué grosería! Uno aquí esperando y encima eso." },
        ],
        alNegarCedula: [
          {
            texto: "El Diazepam es un medicamento controlado: por ley necesito la fórmula y verificar su identidad.",
            efecto: 1,
            respuesta: "Pues no la voy a mostrar. Si no me lo vende, me voy a otra parte.",
          },
          { texto: "Sin cédula no hay nada.", efecto: -1, respuesta: "¡Pues qué servicio tan malo!" },
        ],
        alRechazar: [
          {
            texto:
              "Sin fórmula no puedo venderlo: es controlado y sin control médico puede ser peligroso. Le recomiendo pedir cita por el insomnio.",
            efecto: 2,
            respuesta: "Uy… bueno, entiendo. Voy a pedir la cita.",
          },
          { texto: "No se puede, es la norma.", efecto: 0, respuesta: "Siempre la misma respuesta. Qué pereza." },
          { texto: "No insista, señora, no se lo voy a vender.", efecto: -2, respuesta: "¡Quiero hablar con su jefe!" },
        ],
      },
    },
  },
  {
    titulo: "Beatriz Núñez pide Diazepam",
    personaje: "gloria",
    guion: {
      animoInicial: 2,
      entrada: "Buenas. Vengo por el Diazepam de mi fórmula. Tengo afán, me están esperando afuera.",
      frases: {
        pedirCedula: "Tome, aquí está mi cédula.",
        entregarReceta: "Aquí está la fórmula. El médico me la dio hace unos días.",
        error: "¿Pasa algo con mi fórmula?",
        rechazo: "¿Cómo que la tiene que revisar el supervisor? ¿Qué tiene de malo?",
        venta: "Gracias, qué bueno que fue rápido.",
      },
      respuestas: {
        saludo: [
          {
            texto: "Buenos días, doña Beatriz. Con gusto la atiendo. ¿Me permite la fórmula y su cédula?",
            efecto: 1,
            respuesta: "Sí, claro, pero rapidito, por favor.",
          },
          { texto: "Siguiente. ¿Qué necesita?", efecto: 0, respuesta: "El Diazepam, ya le dije." },
          { texto: "Espere un momento, estoy ocupado.", efecto: -1, respuesta: "¿Más espera? Llevo rato aquí." },
        ],
        alRechazar: [
          {
            texto:
              "La cantidad tiene una corrección a mano, y en un medicamento controlado eso lo revisa mi supervisor. Ya mismo lo llamo, es un momento.",
            efecto: 2,
            respuesta: "Ah, bueno… si es por seguridad, espero.",
          },
          { texto: "Eso no lo decido yo.", efecto: 0, respuesta: "¿Pues entonces quién?" },
          { texto: "Esa fórmula está alterada.", efecto: -2, respuesta: "¿Me está diciendo tramposa? ¡Qué falta de respeto!" },
        ],
      },
    },
  },
];

export async function sembrarEscenas(prisma: PrismaClient) {
  for (const e of ESCENAS) {
    const { count } = await prisma.escenario.updateMany({
      where: { titulo: e.titulo },
      data: { personaje: e.personaje, guion: e.guion },
    });
    if (count === 0) console.log("Escena: no se encontró el caso", e.titulo);
  }
  console.log("Escenas de práctica virtual:", ESCENAS.length, "casos con persona animada.");
}
