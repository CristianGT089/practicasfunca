"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Paso = {
  eyebrow: string;
  titulo: string;
  porque: string;
  como: string[];
  ir?: { href: string; label: string };
  /** Consejos por módulo: solo se muestran los de los módulos del docente. */
  consejos?: { modulo: string; etiqueta: string; texto: string }[];
};

/**
 * Pasos de la guía, en el orden en que se trabaja una práctica: preparar el grupo, crear la
 * jornada, dejar todo listo, acompañarla y calificarla.
 */
const PASOS: Paso[] = [
  {
    eyebrow: "Bienvenida",
    titulo: "Así funciona Prácticas FUNCA",
    porque:
      "La plataforma simula los servicios donde tus estudiantes harán su práctica: farmacia, dispensario, consultorio odontológico y servicio de enfermería. Tú preparas la jornada y ellos atienden casos en los computadores del aula, mientras la plataforma registra y califica lo que hacen.",
    como: [
      "Una jornada es una sesión presencial de práctica con un grupo: tiene sus casos, sus computadores y su turnero.",
      "Además está la práctica virtual: casos que cada estudiante resuelve en línea, a su ritmo.",
      "Todo lo frecuente está en el Inicio, a uno o dos clics. Esta guía te tomará unos cinco minutos.",
    ],
  },
  {
    eyebrow: "Paso 1",
    titulo: "Tu grupo y tus estudiantes",
    porque:
      "Los casos de cada jornada se crean con los nombres de los estudiantes del grupo, y las notas quedan en la cuenta de cada uno. Por eso se empieza por el grupo.",
    como: [
      "En Estudiantes ▸ Grupos crea el grupo (por ejemplo, «Farmacia 2026-2 noche») y elige sus módulos.",
      "En Estudiantes ▸ Estudiantes crea sus cuentas y entrégales la contraseña. Ellos pueden cambiarla después.",
      "Si un estudiante olvida su contraseña, se la puedes restablecer desde esa misma lista.",
    ],
    ir: { href: "/admin/grupos", label: "Ir a mis grupos" },
  },
  {
    eyebrow: "Paso 2",
    titulo: "Crear una jornada",
    porque:
      "El asistente te pregunta todo al principio: el tipo de práctica, el grupo, cuántos estudiantes vienen y cuántos espacios hay (ventanillas, unidades o camas). Así, al iniciar, no tienes que configurar nada más.",
    como: [
      "Pulsa «Nueva jornada» en el Inicio y sigue el asistente.",
      "Elige el grupo y marca quiénes asisten. Los casos se reparten entre ellos.",
      "La jornada queda como «Lista para iniciar». Puedes revisarla, cambiarla o descartarla mientras tanto.",
    ],
    ir: { href: "/admin/simulacion?nueva=1", label: "Crear una jornada" },
    consejos: [
      { modulo: "farmacia", etiqueta: "Farmacia", texto: "Elige entre Farmacia (venta con fórmula), Dispensario (entrega por EPS, con pendientes) o Recepción técnica de medicamentos e insumos." },
      { modulo: "dispensacion", etiqueta: "Dispensación", texto: "En el dispensario puedes activar situaciones (fórmula vencida, quien reclama no es el paciente, faltantes…) para que el estudiante las resuelva según la norma." },
      { modulo: "odontologia", etiqueta: "Salud Oral", texto: "Elige el consultorio con casos simulados, pacientes reales (los estudiantes en parejas) o «Dictar un caso», donde todo el grupo registra a la vez." },
      { modulo: "enfermeria", etiqueta: "Enfermería", texto: "La «Ronda de medicamentos» crea los pacientes con su manilla, el kárdex y la hoja de administración." },
    ],
  },
  {
    eyebrow: "Paso 3",
    titulo: "Antes de iniciar: dejar todo listo",
    porque:
      "Lo ideal es que, cuando los estudiantes lleguen, solo tengas que pulsar «Iniciar jornada». Todo lo de esta lista se hace con la jornada todavía en borrador.",
    como: [
      "Descarga e imprime el PDF de la jornada: recetas, tarjetas de casos, manillas o pedidos, según el tipo. Al pie de cada receta va lo que debe hacer el estudiante que la lleva.",
      "Entra con las cuentas de los computadores (aparecen en la jornada) en cada equipo del aula. Cada cuenta ya sabe qué ventanilla o unidad es, y verás en vivo cuáles ya entraron.",
      "Abre el tablero del turnero en el video beam. Muestra una pantalla de espera y se activa solo al iniciar.",
      "Revisa quién empieza en cada puesto y quiénes hacen de pacientes.",
    ],
    ir: { href: "/admin/simulacion", label: "Ver mis jornadas" },
  },
  {
    eyebrow: "Paso 4",
    titulo: "Durante la jornada",
    porque:
      "Al iniciar, el turnero empieza a llamar y cada computador recibe sus pacientes. Tu pantalla de la jornada muestra el avance en vivo, así que puedes acompañar a los estudiantes y no estar pendiente del sistema.",
    como: [
      "Desde la jornada ves qué está atendiendo cada puesto y qué casos faltan.",
      "Puedes agregar computadores o estudiantes si llega alguien tarde.",
      "Cuando acabe la práctica, pulsa «Finalizar». El turnero se cierra con la jornada.",
    ],
    consejos: [
      { modulo: "dispensacion", etiqueta: "Dispensario", texto: "Si al paciente no le entregan todo, queda un pendiente (Res. 1604/2013, 48 horas) y puede volver a otra ventanilla a reclamarlo con su constancia." },
      { modulo: "farmacia", etiqueta: "Recepción técnica", texto: "En la recepción, el estudiante verifica cada ítem del pedido contra la factura (lote, vencimiento, INVIMA, cadena de frío) y decide qué acepta y qué rechaza (Res. 1403/2007)." },
      { modulo: "odontologia", etiqueta: "Salud Oral", texto: "Con un menor de edad el estudiante debe registrar al acudiente y su consentimiento. Al terminar, agenda el control en la agenda de la jornada, dentro de los 3 días hábiles." },
      { modulo: "enfermeria", etiqueta: "Enfermería", texto: "En la ronda se califica la verificación de los correctos: paciente (manilla), medicamento, dosis, vía y hora." },
    ],
  },
  {
    eyebrow: "Paso 5",
    titulo: "Finalizar y calificar",
    porque:
      "La plataforma propone la nota de cada estudiante con lo que registró, pero tú confirmas quién atendió cada caso antes de que la nota quede en firme.",
    como: [
      "Al finalizar, la jornada pasa a «Por confirmar». Revisa quién atendió cada caso y corrige si alguien usó el computador de otro.",
      "Pulsa «Calificar». La jornada queda «Calificada», con su reporte.",
      "El reporte muestra la nota por estudiante y los errores más comunes del grupo, y se puede descargar en CSV para la planilla.",
      "Las notas de la práctica virtual están en Calificaciones.",
    ],
    ir: { href: "/admin/calificaciones", label: "Ir a Calificaciones" },
  },
  {
    eyebrow: "Paso 6",
    titulo: "El contenido de tus módulos",
    porque:
      "Los casos salen de los catálogos de cada módulo. Si los ajustas a lo que ves en clase, las jornadas y la práctica virtual lo reflejan.",
    como: [
      "En Contenido encuentras los catálogos de tus módulos y los casos de la práctica virtual.",
      "Con «Ver como estudiante» pruebas un caso tal como lo verán ellos.",
    ],
    ir: { href: "/admin/escenarios", label: "Casos de práctica virtual" },
    consejos: [
      { modulo: "farmacia", etiqueta: "Farmacia", texto: "Medicamentos, catálogo real y pacientes de los casos." },
      { modulo: "odontologia", etiqueta: "Salud Oral", texto: "Casos clínicos, historias, la agenda real del consultorio y el tarifario." },
      { modulo: "dispensacion", etiqueta: "Dispensación", texto: "Casos y autorizaciones de las EPS." },
      { modulo: "enfermeria", etiqueta: "Enfermería", texto: "La hoja de administración de medicamentos." },
    ],
  },
  {
    eyebrow: "Último paso",
    titulo: "Tu cuenta",
    porque: "Desde el menú con tu nombre, arriba a la derecha, manejas tu cuenta y puedes volver a esta guía cuando quieras.",
    como: [
      "«Cambiar contraseña»: pon una que puedas recordar.",
      "«Vista estudiante»: abre la plataforma como la ven tus estudiantes.",
      "«Guía de inicio»: vuelve a esta guía.",
    ],
  },
];

/**
 * Guía de inicio para docentes: los pasos de una práctica, de crear el grupo a calificar,
 * con consejos solo de los módulos que enseña. Al terminarla (u omitirla) el Inicio deja de
 * ofrecerla; sigue disponible desde el menú de la cuenta.
 */
export default function GuiaDocentePage() {
  const router = useRouter();
  const [paso, setPaso] = useState(0);
  const [modulos, setModulos] = useState<string[] | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setModulos((d.modulos ?? []).map((m: { slug: string }) => m.slug)));
  }, []);

  const terminar = async (destino: string) => {
    await fetch("/api/auth/guia", { method: "POST" });
    router.push(destino);
  };

  const actual = PASOS[paso];
  const ultimo = paso === PASOS.length - 1;
  const consejos = (actual.consejos ?? []).filter((c) => modulos?.includes(c.modulo));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Guía de inicio</p>
          <h1 className="titulo-pagina mt-1">Cómo usar Prácticas FUNCA</h1>
        </div>
        <button onClick={() => terminar("/admin")} className="text-sm font-semibold text-slate-500 hover:text-blue-800">
          Salir de la guía
        </button>
      </div>

      <div>
        <div className="flex gap-1.5" aria-hidden>
          {PASOS.map((p, i) => (
            <button
              key={p.titulo}
              onClick={() => setPaso(i)}
              className={`h-1.5 flex-1 rounded-full transition-colors ${i <= paso ? "bg-gold-500" : "bg-blue-100"}`}
              title={p.titulo}
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {paso + 1} de {PASOS.length}
        </p>
      </div>

      <section className="tarjeta p-6 sm:p-8" aria-live="polite">
        <p className="text-xs font-bold uppercase tracking-wider text-gold-700">{actual.eyebrow}</p>
        <h2 className="mt-1 font-heading text-2xl font-bold text-blue-900">{actual.titulo}</h2>
        <p className="mt-3 text-slate-600 leading-relaxed">{actual.porque}</p>

        <h3 className="mt-6 text-sm font-semibold text-blue-900">Cómo se hace</h3>
        <ol className="mt-2 flex flex-col gap-2.5">
          {actual.como.map((c, i) => (
            <li key={c} className="flex gap-3 text-sm text-slate-700">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-bold text-blue-800">{i + 1}</span>
              <span className="pt-0.5">{c}</span>
            </li>
          ))}
        </ol>

        {consejos.length > 0 && (
          <div className="mt-6 flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-blue-900">En tus módulos</h3>
            {consejos.map((c) => (
              <div key={c.etiqueta + c.texto} className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-slate-700">
                <span className="pildora mr-2 bg-blue-100 text-blue-800">{c.etiqueta}</span>
                {c.texto}
              </div>
            ))}
          </div>
        )}

        {actual.ir && (
          <Link href={actual.ir.href} className="mt-6 inline-block text-sm font-semibold text-blue-800 hover:underline">
            {actual.ir.label} →
          </Link>
        )}
      </section>

      <div className="flex items-center justify-between gap-3">
        <button onClick={() => setPaso(paso - 1)} disabled={paso === 0} className="btn-suave px-5 py-2.5 disabled:invisible">
          ← Anterior
        </button>
        {ultimo ? (
          <button onClick={() => terminar("/admin")} className="btn-cta">
            Terminar e ir al Inicio
          </button>
        ) : (
          <button onClick={() => setPaso(paso + 1)} className="btn-primario px-5 py-2.5">
            Siguiente →
          </button>
        )}
      </div>
    </div>
  );
}
