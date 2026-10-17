import type { ReactNode } from "react";
import type { PasoRecorrido } from "@/components/nucleo/Recorrido";

const Nota = ({ children }: { children: ReactNode }) => <p className="mt-2 rounded-xl bg-blue-50 px-3 py-2 text-xs text-slate-700">{children}</p>;

type TipoJornada = "FARMACIA" | "DISPENSARIO" | "ODONTOLOGIA" | "ENFERMERIA" | "RECEPCION";
type Estado = "BORRADOR" | "ABIERTA" | "EN_REVISION" | "CERRADA";

const ESPACIO: Record<TipoJornada, string> = {
  FARMACIA: "ventanilla",
  DISPENSARIO: "ventanilla",
  RECEPCION: "puesto de recepción",
  ODONTOLOGIA: "unidad",
  ENFERMERIA: "estación",
};

const PDF: Record<TipoJornada, string> = {
  FARMACIA: "las recetas: cada estudiante que hace de paciente lleva la suya, con lo que debe hacer al pie",
  DISPENSARIO: "las recetas: cada estudiante que hace de paciente lleva la suya, con lo que debe hacer al pie",
  RECEPCION: "las facturas y etiquetas: cada estudiante es el transportador de su pedido",
  ODONTOLOGIA: "las tarjetas: cada compañero que interpreta un paciente recibe la suya",
  ENFERMERIA: "las manillas (para recortar) y las tarjetas de los pacientes",
};

/**
 * Recorrido guiado de la pantalla de una jornada, uno por estado: prepararla, acompañarla,
 * confirmar y calificar, leer el reporte. Los pasos cuyo elemento no está (según el tipo o la
 * modalidad) se omiten solos.
 */
export function recorridoJornada(j: { tipo: TipoJornada; estado: Estado; dictado: boolean; pacientesReales: boolean }): {
  id: string;
  pasos: PasoRecorrido[];
} {
  const espacio = ESPACIO[j.tipo];
  const conTurnero = j.tipo === "FARMACIA" || j.tipo === "DISPENSARIO" || j.tipo === "RECEPCION";

  if (j.estado === "BORRADOR") {
    return {
      id: "jornada-preparar",
      pasos: [
        {
          titulo: "Deja la jornada lista",
          texto: "Todo lo de esta pantalla se hace antes de que lleguen los estudiantes. Así, en clase, solo pulsas «Iniciar».",
        },
        {
          guia: "participantes",
          titulo: "Quiénes vienen",
          texto: "Los estudiantes de la jornada. Si alguien no vino o llegó uno más, cámbialo aquí: los casos se reparten entre ellos.",
        },
        {
          guia: j.tipo === "RECEPCION" ? "control" : "casos",
          titulo: j.tipo === "RECEPCION" ? "Los pedidos" : j.tipo === "ENFERMERIA" ? "Los pacientes de la ronda" : "Los casos",
          texto: (
            <>
              {j.tipo === "RECEPCION"
                ? "Cada pedido trae su factura y lo que llega de verdad, con novedades para detectar (lote, vencimiento, INVIMA, cadena de frío)."
                : j.tipo === "ODONTOLOGIA"
                  ? "Cada caso tiene el compañero que lo interpreta. Puedes cambiar los casos antes de iniciar."
                  : j.tipo === "ENFERMERIA"
                    ? "Cada paciente tiene su manilla, kárdex y una situación para practicar."
                    : "Los pacientes se crean con los nombres de tus estudiantes. Revisa cada uno; los que no te sirvan se regeneran."}
              {j.tipo === "DISPENSARIO" && (
                <Nota>Si quien reclama no es el paciente, o es un menor con su acudiente, la receta lo dice al pie para que lo actúen.</Nota>
              )}
            </>
          ),
        },
        {
          guia: "pdf",
          titulo: "Imprime el material",
          texto: `Descarga e imprime ${PDF[j.tipo]}.`,
        },
        {
          guia: "computadores",
          titulo: "Los computadores del aula",
          texto: conTurnero
            ? "Aquí ves en vivo qué computadores ya entraron. Abre el tablero en el video beam y la pantalla de registro: muestran una espera y se activan solos al iniciar."
            : "Aquí ves en vivo qué computadores ya entraron con su cuenta. Esperan a que inicies la jornada.",
        },
        {
          guia: "cuentas",
          titulo: "Una cuenta por computador",
          texto: `Entra en cada computador con su cuenta. Cada una ya sabe qué ${espacio} es: no hay que elegir nada allá.`,
        },
        {
          guia: "espacios",
          titulo: `Quién empieza en cada ${espacio}`,
          texto: "Elige el estudiante que arranca en cada puesto. Durante la jornada puedes rotarlos.",
        },
        {
          guia: "control",
          titulo: "El dictado",
          texto: "Lee el caso en voz alta; todo el grupo lo registra a la vez, cada uno en su cuenta, y cada uno saca su nota.",
        },
        {
          guia: "iniciar",
          titulo: "Cuando estén todos, inicia",
          texto: j.dictado
            ? "Al iniciar, los estudiantes ven el formulario del dictado en su pantalla."
            : conTurnero
              ? "Al iniciar se abre el turnero: los pacientes sacan turno y cada ventanilla empieza a llamar."
              : "Al iniciar, cada computador recibe sus pacientes.",
        },
      ],
    };
  }

  if (j.estado === "ABIERTA") {
    return {
      id: "jornada-curso",
      pasos: [
        {
          guia: "control",
          titulo: "La jornada, en vivo",
          texto: (
            <>
              {j.dictado
                ? "Desde aquí pausas el dictado y lo terminas cuando todos hayan registrado."
                : `Aquí ves qué atiende cada ${espacio} y quién está en cada uno. Puedes rotar a los estudiantes cuando quieras.`}
              {j.tipo === "DISPENSARIO" && (
                <Nota>Si a un paciente no le entregan todo, queda un pendiente (48 horas) y puede volver a otra ventanilla con su constancia.</Nota>
              )}
              {j.tipo === "ODONTOLOGIA" && !j.dictado && (
                <Nota>Con un menor, el estudiante registra al acudiente y su consentimiento, y agenda el control dentro de 3 días hábiles.</Nota>
              )}
            </>
          ),
        },
        {
          guia: "cuentas",
          titulo: "¿Se dañó un computador?",
          texto: "Agrega otro aquí: recibe su cuenta en el momento.",
        },
        {
          guia: "participantes",
          titulo: "¿Llegó alguien tarde?",
          texto: "Agrégalo a la jornada y asígnale un puesto.",
        },
        {
          guia: "finalizar",
          titulo: "Al terminar la clase",
          texto: "Pulsa «Finalizar jornada»: se cierra el turnero y pasas a confirmar quién atendió a cada paciente.",
        },
      ],
    };
  }

  if (j.estado === "EN_REVISION") {
    return {
      id: "jornada-calificar",
      pasos: [
        {
          guia: "confirmacion",
          titulo: "Confirma quién atendió",
          texto: j.pacientesReales
            ? "Revisa cada historia y califícala con la rúbrica; no hay nota automática con pacientes reales."
            : "La plataforma ya propone quién atendió cada caso según el computador. Corrige si alguien usó la cuenta de otro.",
        },
        {
          guia: "calificar",
          titulo: "Califica",
          texto: "Genera la nota de cada estudiante y el reporte de la jornada. Después, la jornada queda cerrada.",
        },
      ],
    };
  }

  return {
    id: "jornada-reporte",
    pasos: [
      {
        guia: "reporte",
        titulo: "El reporte de la jornada",
        texto: "La nota de cada estudiante, el detalle de lo que hizo en cada caso y los errores más comunes del grupo, para retroalimentar en clase.",
      },
      {
        guia: "csv",
        titulo: "A tu planilla",
        texto: "Descarga las notas en un archivo que abre Excel.",
      },
    ],
  };
}
