/**
 * Siembra del módulo Odontología: el módulo, la matrícula de los usuarios de prueba y
 * casos de práctica de historia clínica con odontograma. Idempotente (se omite lo que ya
 * existe por id/título). Se llama desde seed.ts.
 */
import type { PrismaClient } from "@prisma/client";
import { esperadoVacio, normalizarEsperado, type EsperadoOdontologia } from "../src/lib/modulos/odontologia/historia";
import type { CodigoHallazgo, Marca, Superficie } from "../src/lib/modulos/odontologia/odontograma";
import { pasosParaCaso, requiereRadiografia } from "../src/lib/modulos/odontologia/pasos";

/** Atajo para escribir odontogramas: m(36, "CARIES", "O", "M") → una marca por cara. */
function m(diente: number, hallazgo: CodigoHallazgo, ...superficies: Superficie[]): Marca[] {
  return superficies.length ? superficies.map((superficie) => ({ diente, hallazgo, superficie })) : [{ diente, hallazgo }];
}

/** Atajo para la placa: p(16, "V", "M"). */
function p(diente: number, ...superficies: ("V" | "L" | "M" | "D")[]) {
  return superficies.map((superficie) => ({ diente, superficie }));
}

function haceAnios(anios: number, mes = 3, dia = 14) {
  const hoy = new Date();
  return new Date(Date.UTC(hoy.getUTCFullYear() - anios, mes, dia));
}

type Caso = {
  titulo: string;
  descripcion: string;
  descripcionDificil: string;
  resultadoEsperado: string;
  paciente: { id: string } & Record<string, unknown>;
  denticion: "PERMANENTE" | "TEMPORAL" | "MIXTA";
  motivoConsulta: string;
  relatoAnamnesis: string;
  relatoExamen?: string;
  relatoRadiografia?: string;
  esperado: Partial<EsperadoOdontologia>;
};

export async function sembrarOdontologia(prisma: PrismaClient, usuarioIds: string[]) {
  const modulo = await prisma.modulo.upsert({
    where: { slug: "odontologia" },
    update: {},
    create: {
      slug: "odontologia",
      nombre: "Odontología",
      descripcion: "Historia clínica odontológica y odontograma",
      colorTema: "#0e7490",
    },
  });

  for (const usuarioId of usuarioIds) {
    await prisma.matricula.upsert({
      where: { usuarioId_moduloId: { usuarioId, moduloId: modulo.id } },
      update: {},
      create: { usuarioId, moduloId: modulo.id },
    });
  }

  const casos: Caso[] = [
    {
      titulo: "Tutorial: tu primer odontograma",
      descripcion:
        "Caso guiado para aprender a usar la historia clínica.\n" +
        "1) Interroga al paciente y pasa a la historia lo que cuenta (motivo, antecedentes, alerta médica).\n" +
        "2) Haz el examen clínico y marca cada hallazgo en el odontograma con la convención y el color correctos.\n" +
        "3) Aplica el revelador de placa, pinta las superficies teñidas y calcula el índice de O'Leary.\n" +
        "4) Cierra la historia eligiendo la conducta. Pista: esta paciente se atiende en la consulta.",
      descripcionDificil: "Paciente adulta que consulta por dolor en una muela inferior.",
      resultadoEsperado: "ATENCION_EN_CONSULTA",
      paciente: {
        id: "odo-pac-luz",
        nombres: "Luz Marina",
        primerApellido: "Cárdenas",
        segundoApellido: "Rojas",
        tipoDocumento: "CC",
        documento: "52841733",
        sexo: "F",
        fechaNacimiento: haceAnios(34, 5, 2),
        eps: "Nueva EPS",
        profesion: "Contadora",
        ocupacion: "Auxiliar contable",
        estadoCivil: "Casada",
        telefono: "3104567812",
        direccion: "Cra 12 # 45-18, Bogotá",
        contactoEmergencia: "Hernando Pérez",
        parentescoContacto: "Esposo",
        telefonoContacto: "3159876543",
      },
      denticion: "PERMANENTE",
      motivoConsulta: "Me duele una muela de abajo, a la izquierda, cuando como algo dulce o tomo algo frío.",
      relatoAnamnesis:
        "Hace unas tres semanas empezó a sentir dolor en una muela inferior izquierda con los dulces y el frío; el dolor se le quita apenas retira el estímulo. No ha tomado nada para el dolor.\n\n" +
        "Salud general: dice ser sana, no toma medicamentos. Es alérgica a la penicilina (le dio ronchas y le cerró la garganta de niña). No está embarazada.\n\n" +
        "Odontológico: le han hecho calzas (resinas) varias veces, le sacaron dos cordales de arriba y una muela de abajo a la derecha hace años, y se hace limpieza cada año.",
      relatoExamen:
        "Extraoral sin alteraciones. Mucosas, lengua, paladar y frenillos normales. No hay ruido ni dolor en la ATM.\n" +
        "Encía con leve sangrado al sondaje en la zona de molares inferiores.",
      esperado: {
        alertaMedica: ["alergia_penicilina"],
        antecedentesPersonales: ["alergias"],
        antecedentesOdontologicos: ["operatoria", "exodoncias", "profilaxis"],
        examenEstomatologico: ["sensibilidad", "odontalgias"],
        examenDental: ["sangrado"],
        odontograma: [
          ...m(18, "AUSENTE"),
          ...m(28, "AUSENTE"),
          ...m(46, "AUSENTE"),
          ...m(16, "OBTURADO_BUEN_ESTADO", "O"),
          ...m(26, "OBTURADO_MAL_ESTADO", "O", "D"),
          ...m(36, "CARIES", "O", "M"),
          ...m(37, "CARIES", "O"),
          ...m(11, "OBTURADO_BUEN_ESTADO", "M"),
        ],
        placa: [
          ...p(16, "V", "M"),
          ...p(13, "V"),
          ...p(11, "V", "D"),
          ...p(21, "V"),
          ...p(24, "L"),
          ...p(26, "V", "D"),
          ...p(36, "L", "M"),
          ...p(33, "L"),
          ...p(31, "L"),
          ...p(41, "L"),
          ...p(43, "L"),
          ...p(44, "V"),
          ...p(47, "V", "L"),
        ],
      },
    },
    {
      titulo: "Adulto mayor anticoagulado con restos radiculares",
      descripcion:
        "Llega un paciente de 67 años acompañado por su hija. Toma varios medicamentos: indaga bien cuáles. " +
        "Hay dientes que no se pueden conservar. Recuerda que hay hallazgos que solo aparecen en la radiografía, " +
        "y que antes de indicar una extracción debes pensar en el riesgo de sangrado.",
      descripcionDificil: "Paciente de 67 años que quiere \"arreglarse la boca para ponerse una prótesis\".",
      resultadoEsperado: "INTERCONSULTA_MEDICA",
      paciente: {
        id: "odo-pac-jorge",
        nombres: "Jorge Enrique",
        primerApellido: "Salcedo",
        segundoApellido: "Mora",
        tipoDocumento: "CC",
        documento: "19245870",
        sexo: "M",
        fechaNacimiento: haceAnios(67, 9, 21),
        eps: "Sanitas",
        profesion: "Técnico electricista",
        ocupacion: "Pensionado",
        estadoCivil: "Viudo",
        telefono: "3006541298",
        direccion: "Calle 63 # 9-40, Bogotá",
        contactoEmergencia: "Adriana Salcedo",
        parentescoContacto: "Hija",
        telefonoContacto: "3112223344",
      },
      denticion: "PERMANENTE",
      motivoConsulta: "Quiero que me arreglen la boca para ponerme una prótesis, ya casi no puedo masticar.",
      relatoAnamnesis:
        "Dice que \"tiene la boca muy mala\" hace años; le molesta un pedazo de muela de arriba a la izquierda que le lastima la lengua.\n\n" +
        "Salud general: tiene fibrilación auricular y toma warfarina todos los días (la hija muestra la fórmula del cardiólogo); también es hipertenso y toma losartán. " +
        "Hace dos años lo hospitalizaron por la arritmia. No es alérgico a nada que sepa.\n\n" +
        "Odontológico: le han sacado varias muelas, tiene una corona en un diente de adelante al que le hicieron \"tratamiento de conducto\" hace mucho, " +
        "otra corona abajo a la derecha, y usó una prótesis removible que se le perdió.",
      relatoExamen:
        "Paciente consciente y orientado. Presión arterial en la consulta: 150/95.\n" +
        "Encía inflamada y retraída en todo el sector anteroinferior, con cálculos abundantes por lingual, sangrado espontáneo al sondaje y bolsas en molares.",
      relatoRadiografia: "Pérdida ósea horizontal generalizada, compatible con la enfermedad periodontal observada.",
      esperado: {
        alertaMedica: ["anticoagulado", "hipertension"],
        antecedentesPersonales: ["presion_arterial", "cardiopatias", "tratamiento_medico", "medicamentos"],
        antecedentesOdontologicos: ["exodoncias", "conductos", "coronas", "protesis"],
        examenEstomatologico: ["mucosa_gingival"],
        examenDental: ["sangrado", "calculos", "inflamacion", "retracciones", "bolsas"],
        odontograma: [
          ...m(18, "AUSENTE"),
          ...m(28, "AUSENTE"),
          ...m(38, "AUSENTE"),
          ...m(48, "AUSENTE"),
          ...m(36, "AUSENTE"),
          ...m(37, "AUSENTE"),
          ...m(25, "RESTO_RADICULAR"),
          ...m(14, "EXODONCIA_SIMPLE_INDICADA"),
          ...m(21, "CORONA_MAL_ESTADO"),
          ...m(21, "ENDODONCIA_REALIZADA"),
          ...m(21, "NUCLEO_BUEN_ESTADO"),
          ...m(46, "CORONA_BUEN_ESTADO"),
          ...m(47, "CARIES", "O", "D"),
        ],
        requiereRadiografia: true,
      },
    },
    {
      titulo: "Niña de 5 años con caries en dientes temporales",
      descripcion:
        "Valeria viene con su mamá porque le vieron \"un hueco negro\" en una muela. Es dentición temporal: " +
        "usa la numeración de los dientes de leche (51 a 85). Pregunta por los hábitos de la niña: cómo toma el tetero y cómo le cepillan los dientes.",
      descripcionDificil: "Niña de 5 años, la trae la mamá por \"un hueco negro en una muela\".",
      resultadoEsperado: "ATENCION_EN_CONSULTA",
      paciente: {
        id: "odo-pac-valeria",
        nombres: "Valeria",
        primerApellido: "Moreno",
        segundoApellido: "Quintero",
        tipoDocumento: "RC",
        documento: "1023456789",
        sexo: "F",
        fechaNacimiento: haceAnios(5, 1, 9),
        eps: "Compensar",
        profesion: null,
        ocupacion: "Estudiante de transición",
        estadoCivil: null,
        telefono: "3017894561",
        direccion: "Calle 2 sur # 14-33, Soacha",
        contactoEmergencia: "Yuliana Quintero",
        parentescoContacto: "Madre",
        telefonoContacto: "3017894561",
      },
      denticion: "TEMPORAL",
      motivoConsulta: "A la niña se le ve un hueco negro en una muela y a veces se queja cuando come.",
      relatoAnamnesis:
        "La mamá cuenta que la niña se queja al comer dulces desde hace un mes, sobre todo del lado izquierdo abajo.\n\n" +
        "Salud general: sana, vacunas al día, sin alergias ni medicamentos.\n\n" +
        "Hábitos: todavía toma tetero con leche achocolatada para dormir y se queda dormida con él. " +
        "Se cepilla ella sola una vez al día, en la mañana, y nunca ha ido al odontólogo. No le han aplicado flúor.",
      relatoExamen:
        "Niña colaboradora. Tejidos blandos normales. Se percibe mal aliento.\n" +
        "Placa blanda abundante en todos los dientes.",
      esperado: {
        alertaMedica: [],
        antecedentesPersonales: [],
        antecedentesOdontologicos: [],
        examenEstomatologico: ["habitos", "halitosis", "odontalgias"],
        examenDental: [],
        odontograma: [
          ...m(54, "CARIES", "O"),
          ...m(64, "CARIES", "O", "M"),
          ...m(74, "CARIES", "O", "D"),
          ...m(75, "CARIES", "O"),
          ...m(84, "EXODONCIA_SIMPLE_INDICADA"),
          ...m(85, "SELLANTE_POR_HACER"),
          ...m(55, "SELLANTE_POR_HACER"),
          ...m(65, "SELLANTE_POR_HACER"),
        ],
        placa: [
          ...p(55, "V", "L"),
          ...p(54, "V", "D"),
          ...p(52, "V"),
          ...p(51, "V"),
          ...p(61, "V"),
          ...p(62, "V"),
          ...p(64, "V", "M"),
          ...p(65, "V", "L"),
          ...p(75, "V", "L", "D"),
          ...p(74, "L", "D"),
          ...p(72, "L"),
          ...p(71, "L"),
          ...p(81, "L"),
          ...p(82, "L"),
          ...p(84, "V", "L", "M", "D"),
          ...p(85, "V", "L"),
        ],
      },
    },
    {
      titulo: "Joven con dolor intenso y cordales sin erupcionar",
      descripcion:
        "Andrés llega sin dormir por un dolor muy fuerte en una muela superior. Además tiene molestias atrás, abajo a la izquierda. " +
        "Hay dientes que no se ven en boca: no los marques como ausentes sin confirmar con una radiografía. " +
        "Piensa si lo que necesita se puede resolver en la consulta general.",
      descripcionDificil: "Joven de 22 años con dolor dental intenso que no lo deja dormir.",
      resultadoEsperado: "REMISION_ESPECIALISTA",
      paciente: {
        id: "odo-pac-andres",
        nombres: "Andrés Felipe",
        primerApellido: "Ruiz",
        segundoApellido: "Beltrán",
        tipoDocumento: "CC",
        documento: "1001234567",
        sexo: "M",
        fechaNacimiento: haceAnios(22, 7, 30),
        eps: "Salud Total",
        profesion: null,
        ocupacion: "Estudiante universitario",
        estadoCivil: "Soltero",
        telefono: "3205551234",
        direccion: "Transversal 5 # 22-10, Chía",
        contactoEmergencia: "Gloria Beltrán",
        parentescoContacto: "Madre",
        telefonoContacto: "3108887766",
      },
      denticion: "PERMANENTE",
      motivoConsulta: "Me duele muchísimo una muela de arriba a la izquierda, no me deja dormir.",
      relatoAnamnesis:
        "El dolor empezó hace cuatro días, es espontáneo, pulsátil y empeora de noche; con el frío se le dispara y le dura varios minutos. Ha tomado ibuprofeno sin mucho alivio.\n" +
        "También siente presión y le sangra la encía atrás, abajo a la izquierda, desde hace meses.\n\n" +
        "Salud general: tiene asma desde niño y usa inhalador de salbutamol cuando le da crisis (la última hace dos meses). No tiene alergias.\n\n" +
        "Odontológico: le hicieron sellantes de niño y una resina abajo a la izquierda. Nunca ha usado ortodoncia.",
      relatoExamen:
        "Tejidos blandos sin alteraciones, salvo la encía que cubre parcialmente la zona distal inferior izquierda, inflamada y dolorosa.\n" +
        "Dolor a la percusión en el sector superior izquierdo.",
      relatoRadiografia: "Sin lesiones óseas periapicales evidentes.",
      esperado: {
        alertaMedica: ["asma"],
        antecedentesPersonales: ["respiratorias", "medicamentos"],
        antecedentesOdontologicos: ["operatoria"],
        examenEstomatologico: ["odontalgias", "sensibilidad"],
        examenDental: ["inflamacion"],
        odontograma: [
          ...m(26, "ENDODONCIA_INDICADA"),
          ...m(26, "CARIES", "O", "M"),
          ...m(38, "EXODONCIA_QUIRURGICA_INDICADA"),
          ...m(18, "SIN_ERUPCIONAR"),
          ...m(28, "SIN_ERUPCIONAR"),
          ...m(48, "SIN_ERUPCIONAR"),
          ...m(12, "ROTACION"),
          ...m(17, "SELLANTE_REALIZADO"),
          ...m(27, "SELLANTE_REALIZADO"),
          ...m(47, "SELLANTE_POR_HACER"),
          ...m(35, "OBTURADO_MAL_ESTADO", "O", "D"),
        ],
        requiereRadiografia: true,
      },
    },
  ];

  for (const caso of casos) {
    const existe = await prisma.escenario.findFirst({ where: { titulo: caso.titulo, moduloId: modulo.id } });
    if (existe) {
      console.log("Ya existe, se omite:", caso.titulo);
      continue;
    }
    const { id: pacienteId, ...datosPaciente } = caso.paciente;
    await prisma.pacienteOdontologia.upsert({
      where: { id: pacienteId },
      update: {},
      create: { id: pacienteId, ...(datosPaciente as Omit<Parameters<typeof prisma.pacienteOdontologia.create>[0]["data"], "id">) },
    });
    const esperado = normalizarEsperado({ ...esperadoVacio(), ...caso.esperado });
    esperado.requiereRadiografia = requiereRadiografia(esperado);
    const creado = await prisma.escenario.create({
      data: {
        moduloId: modulo.id,
        titulo: caso.titulo,
        descripcion: caso.descripcion,
        descripcionDificil: caso.descripcionDificil,
        resultadoEsperado: caso.resultadoEsperado,
        pasos: { create: pasosParaCaso(esperado) },
        odontologia: {
          create: {
            pacienteId,
            denticion: caso.denticion,
            motivoConsulta: caso.motivoConsulta,
            relatoAnamnesis: caso.relatoAnamnesis,
            relatoExamen: caso.relatoExamen ?? null,
            relatoRadiografia: caso.relatoRadiografia ?? null,
            esperado,
          },
        },
      },
    });
    console.log("Escenario creado:", caso.titulo, "-", creado.id);
  }

  console.log("Módulo Odontología sembrado:", casos.length, "casos.");
}
