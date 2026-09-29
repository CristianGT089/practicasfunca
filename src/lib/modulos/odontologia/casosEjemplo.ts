/**
 * Casos de ejemplo de Odontología: 5 para la práctica virtual y 5 para la jornada
 * presencial. Los presenciales no aparecen en la lista de práctica virtual (`soloTurno`),
 * para que los estudiantes no los conozcan antes; solo se eligen al crear una jornada.
 *
 * Idempotente: se omite todo caso cuyo título ya exista. Lo usan el seed local y el script
 * de producción (scripts/modulos/odontologia/crear-casos.ts), que no toca usuarios.
 */
import type { PrismaClient } from "@prisma/client";
import { esperadoVacio, normalizarEsperado, type EsperadoOdontologia } from "./historia";
import type { CodigoHallazgo, Marca, Superficie } from "./odontograma";
import { pasosParaCaso, requiereRadiografia } from "./pasos";

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
  /** true = solo para jornadas presenciales (no sale en la práctica virtual). */
  presencial?: boolean;
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

export const CASOS_ODONTOLOGIA: Caso[] = [

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
  },  {
    titulo: "Adolescente con brackets y encías que sangran",
    descripcion:
      "Mariana tiene 15 años y usa ortodoncia hace un año. Le sangran las encías al cepillarse. " +
      "Pregúntale cómo se cepilla y con qué frecuencia, revisa bien alrededor de los brackets y mide la placa con el revelador.",
    descripcionDificil: "Adolescente de 15 años con ortodoncia; consulta porque le sangran las encías.",
    resultadoEsperado: "ATENCION_EN_CONSULTA",
    paciente: {
      id: "odo-pac-mariana",
      nombres: "Mariana",
      primerApellido: "Gutiérrez",
      segundoApellido: "Castaño",
      tipoDocumento: "TI",
      documento: "1034567821",
      sexo: "F",
      fechaNacimiento: haceAnios(15, 6, 11),
      eps: "Sura",
      profesion: null,
      ocupacion: "Estudiante de décimo grado",
      estadoCivil: "Soltera",
      telefono: "3126549870",
      direccion: "Calle 45 # 28-12, Medellín",
      contactoEmergencia: "Claudia Castaño",
      parentescoContacto: "Madre",
      telefonoContacto: "3148887711",
    },
    denticion: "PERMANENTE",
    motivoConsulta: "Me sangran las encías cuando me cepillo, sobre todo donde tengo los brackets.",
    relatoAnamnesis:
      "Desde hace un par de meses le sangran las encías al cepillarse, sin dolor. Tiene ortodoncia fija hace un año y va a control cada mes.\n\n" +
      "Salud general: sana, sin alergias ni medicamentos.\n\n" +
      "Odontológico: le hicieron una resina en una muela de abajo a la derecha hace dos años y una limpieza el año pasado. " +
      "Se cepilla una vez al día, en la mañana, no usa seda dental ni cepillo interproximal. Se come las uñas cuando está nerviosa.",
    relatoExamen:
      "Encía inflamada y enrojecida alrededor de los brackets, que sangra al pasar la sonda. Se observa onicofagia (uñas mordidas).",
    esperado: {
      antecedentesOdontologicos: ["operatoria", "profilaxis", "ortodoncia"],
      examenEstomatologico: ["mucosa_gingival", "habitos"],
      examenDental: ["sangrado", "inflamacion"],
      odontograma: [
        ...m(17, "SELLANTE_REALIZADO"),
        ...m(27, "SELLANTE_REALIZADO"),
        ...m(36, "CARIES", "O"),
        ...m(46, "OBTURADO_BUEN_ESTADO", "O"),
        ...m(12, "ROTACION"),
      ],
      placa: [
        ...p(16, "V", "M"),
        ...p(13, "V"),
        ...p(14, "V"),
        ...p(15, "V"),
        ...p(23, "V"),
        ...p(24, "V"),
        ...p(25, "V"),
        ...p(26, "V", "D"),
        ...p(33, "V"),
        ...p(34, "V"),
        ...p(36, "L"),
        ...p(43, "V"),
        ...p(44, "V"),
        ...p(46, "L"),
      ],
    },
  },
  {
    presencial: true,
    titulo: "Presencial: obturación rota y cordal sin salir",
    descripcion:
      "Hernán consulta porque se le partió una calza. Es hipertenso. Hay un diente que no se ve en boca: confírmalo con radiografía antes de marcarlo.",
    descripcionDificil: "Adulto de 41 años al que se le partió una calza.",
    resultadoEsperado: "ATENCION_EN_CONSULTA",
    paciente: {
      id: "odo-pac-hernan",
      nombres: "Hernán Darío",
      primerApellido: "Quintero",
      segundoApellido: "Ramos",
      tipoDocumento: "CC",
      documento: "80456123",
      sexo: "M",
      fechaNacimiento: haceAnios(41, 1, 23),
      eps: "Famisanar",
      profesion: "Bachiller",
      ocupacion: "Mensajero en moto",
      estadoCivil: "Unión libre",
      telefono: "3014569872",
      direccion: "Carrera 78 # 6-40, Bogotá",
      contactoEmergencia: "Yenny Castro",
      parentescoContacto: "Compañera",
      telefonoContacto: "3107418529",
    },
    denticion: "PERMANENTE",
    motivoConsulta: "Se me partió una calza de una muela de abajo y ahora me duele cuando como.",
    relatoAnamnesis:
      "Hace una semana, comiendo, se le partió una calza de una muela de abajo a la derecha; desde entonces le duele un poco al masticar y con el frío, pero el dolor se le pasa rápido.\n\n" +
      "Salud general: es hipertenso y toma losartán todos los días; le dijeron que la tiene controlada. No tiene alergias.\n\n" +
      "Odontológico: le han hecho varias calzas, tiene una corona en una muela de arriba a la derecha y le sacaron una muela de abajo a la izquierda hace años. " +
      "No recuerda que le hayan sacado ninguna cordal.",
    relatoExamen: "Mucosas sin alteraciones. Presión arterial en la consulta: 130/85.",
    relatoRadiografia: "Sin lesiones periapicales.",
    esperado: {
      alertaMedica: ["hipertension"],
      antecedentesPersonales: ["presion_arterial", "tratamiento_medico", "medicamentos"],
      antecedentesOdontologicos: ["operatoria", "exodoncias", "coronas"],
      examenEstomatologico: ["odontalgias", "sensibilidad"],
      odontograma: [
        ...m(46, "OBTURADO_MAL_ESTADO", "O", "D"),
        ...m(47, "CARIES", "O"),
        ...m(16, "CORONA_BUEN_ESTADO"),
        ...m(36, "AUSENTE"),
        ...m(38, "SIN_ERUPCIONAR"),
      ],
      requiereRadiografia: true,
    },
  },
  {
    presencial: true,
    titulo: "Presencial: embarazada con sangrado de encías",
    descripcion:
      "Daniela tiene cinco meses de embarazo y le sangran las encías. Registra el embarazo en la alerta médica y mide la placa con el revelador.",
    descripcionDificil: "Mujer de 27 años que consulta por sangrado de encías.",
    resultadoEsperado: "ATENCION_EN_CONSULTA",
    paciente: {
      id: "odo-pac-daniela",
      nombres: "Daniela",
      primerApellido: "Ruiz",
      segundoApellido: "Pineda",
      tipoDocumento: "CC",
      documento: "1012345678",
      sexo: "F",
      fechaNacimiento: haceAnios(27, 8, 3),
      eps: "Compensar",
      profesion: "Licenciada en pedagogía infantil",
      ocupacion: "Docente de preescolar",
      estadoCivil: "Casada",
      telefono: "3165552040",
      direccion: "Calle 13 # 5-22, Zipaquirá",
      contactoEmergencia: "Andrés Pérez",
      parentescoContacto: "Esposo",
      telefonoContacto: "3175551010",
    },
    denticion: "PERMANENTE",
    motivoConsulta: "Estoy embarazada y me sangran mucho las encías, me da miedo cepillarme.",
    relatoAnamnesis:
      "Tiene cinco meses de embarazo. Desde el tercer mes le sangran las encías al cepillarse y a veces sola; por eso se cepilla menos.\n\n" +
      "Salud general: embarazo controlado; toma ácido fólico y sulfato ferroso. Sin alergias.\n\n" +
      "Odontológico: tiene un par de calzas y le sacaron las dos cordales de arriba. Su última limpieza fue hace dos años.",
    relatoExamen:
      "Encía inflamada, enrojecida y que sangra al tocarla, sobre todo en los dientes de adelante abajo, con cálculos por lingual.",
    esperado: {
      alertaMedica: ["embarazo"],
      antecedentesPersonales: ["embarazo", "medicamentos"],
      antecedentesOdontologicos: ["operatoria", "exodoncias", "profilaxis"],
      examenEstomatologico: ["mucosa_gingival"],
      examenDental: ["sangrado", "inflamacion", "calculos"],
      odontograma: [
        ...m(18, "AUSENTE"),
        ...m(28, "AUSENTE"),
        ...m(26, "CARIES", "O"),
        ...m(14, "OBTURADO_BUEN_ESTADO", "O"),
      ],
      placa: [
        ...p(16, "V"),
        ...p(26, "V"),
        ...p(31, "L"),
        ...p(32, "L"),
        ...p(33, "L"),
        ...p(36, "L"),
        ...p(41, "L"),
        ...p(42, "L"),
        ...p(43, "L"),
        ...p(46, "L"),
      ],
    },
  },
  {
    presencial: true,
    titulo: "Presencial: diabético con encías retraídas",
    descripcion:
      "Álvaro es diabético y siente que se le mueven los dientes. Hay enfermedad periodontal avanzada: piensa si se puede tratar en la consulta general.",
    descripcionDificil: "Hombre de 58 años que siente los dientes flojos.",
    resultadoEsperado: "REMISION_ESPECIALISTA",
    paciente: {
      id: "odo-pac-alvaro",
      nombres: "Álvaro Enrique",
      primerApellido: "Sierra",
      segundoApellido: "Gómez",
      tipoDocumento: "CC",
      documento: "79234567",
      sexo: "M",
      fechaNacimiento: haceAnios(58, 10, 8),
      eps: "Nueva EPS",
      profesion: null,
      ocupacion: "Conductor de bus",
      estadoCivil: "Casado",
      telefono: "3118765432",
      direccion: "Diagonal 49 sur # 72-15, Bogotá",
      contactoEmergencia: "Marleny Gómez",
      parentescoContacto: "Esposa",
      telefonoContacto: "3104561239",
    },
    denticion: "PERMANENTE",
    motivoConsulta: "Siento que se me mueven los dientes y me sale sangre y mal sabor.",
    relatoAnamnesis:
      "Hace meses nota que los dientes de abajo se le mueven, le sangran las encías y siente mal aliento y mal sabor; a veces le sale pus.\n\n" +
      "Salud general: tiene diabetes tipo 2 hace diez años; toma metformina pero reconoce que no siempre la toma y no va a los controles. Sin alergias.\n\n" +
      "Odontológico: le han sacado varias muelas y tiene una corona en un diente de arriba a la izquierda que le molesta. Nunca le han hecho un tratamiento de encías.",
    relatoExamen:
      "Halitosis marcada. Encía retraída en todo el sector inferior, con bolsas profundas, sangrado, cálculos abundantes y salida de pus en los incisivos inferiores.",
    esperado: {
      alertaMedica: ["diabetes"],
      antecedentesPersonales: ["diabetes", "tratamiento_medico", "medicamentos"],
      antecedentesOdontologicos: ["exodoncias", "coronas"],
      examenEstomatologico: ["mucosa_gingival", "halitosis"],
      examenDental: ["sangrado", "supuracion", "calculos", "retracciones", "bolsas"],
      odontograma: [
        ...m(36, "AUSENTE"),
        ...m(46, "AUSENTE"),
        ...m(17, "RESTO_RADICULAR"),
        ...m(24, "CORONA_MAL_ESTADO"),
        ...m(44, "OBTURADO_MAL_ESTADO", "O"),
      ],
    },
  },
  {
    presencial: true,
    titulo: "Presencial: niño de 4 años con una bolita en la encía",
    descripcion:
      "Samuel viene con su mamá porque le salió una bolita en la encía. Es dentición temporal. Varias lesiones y un niño pequeño: piensa si se resuelve en la consulta general.",
    descripcionDificil: "Niño de 4 años con una bolita en la encía.",
    resultadoEsperado: "REMISION_ESPECIALISTA",
    paciente: {
      id: "odo-pac-samuel",
      nombres: "Samuel",
      primerApellido: "Ospina",
      segundoApellido: "Díaz",
      tipoDocumento: "RC",
      documento: "1098765432",
      sexo: "M",
      fechaNacimiento: haceAnios(4, 2, 17),
      eps: "Salud Total",
      profesion: null,
      ocupacion: "Jardín infantil",
      estadoCivil: null,
      telefono: "3015558899",
      direccion: "Calle 8 # 3-14, Facatativá",
      contactoEmergencia: "Lina Díaz",
      parentescoContacto: "Madre",
      telefonoContacto: "3015558899",
    },
    denticion: "TEMPORAL",
    motivoConsulta: "Al niño le salió una bolita en la encía de abajo y a veces le duele.",
    relatoAnamnesis:
      "(Lo cuenta la mamá.) Hace dos semanas le vio una bolita en la encía de abajo a la izquierda que a veces bota algo y le duele al comer.\n\n" +
      "Salud general: sano, vacunas al día, sin alergias ni medicamentos.\n\n" +
      "Hábitos: toma tetero con leche y panela para dormir. Lo cepillan una vez al día. Nunca ha ido al odontólogo.",
    relatoExamen: "Fístula en la encía vestibular inferior izquierda. Placa blanda abundante.",
    esperado: {
      examenEstomatologico: ["habitos", "odontalgias"],
      examenDental: ["abscesos"],
      odontograma: [
        ...m(74, "RESTO_RADICULAR"),
        ...m(54, "CARIES", "O", "M"),
        ...m(64, "CARIES", "O"),
        ...m(55, "SELLANTE_POR_HACER"),
        ...m(85, "SELLANTE_POR_HACER"),
      ],
    },
  },
  {
    presencial: true,
    titulo: "Presencial: adulta mayor con válvula cardíaca",
    descripcion:
      "Doña Rosa tiene una válvula cardíaca y toma anticoagulante. Quiere arreglarse las coronas de adelante. Antes de cualquier procedimiento, piensa qué necesita saber su médico.",
    descripcionDificil: "Mujer de 72 años que quiere cambiarse las coronas de adelante.",
    resultadoEsperado: "INTERCONSULTA_MEDICA",
    paciente: {
      id: "odo-pac-rosa",
      nombres: "Rosa Elvira",
      primerApellido: "Martínez",
      segundoApellido: "de López",
      tipoDocumento: "CC",
      documento: "41567890",
      sexo: "F",
      fechaNacimiento: haceAnios(72, 4, 30),
      eps: "Sanitas",
      profesion: "Modista",
      ocupacion: "Pensionada",
      estadoCivil: "Viuda",
      telefono: "6017654321",
      direccion: "Carrera 15 # 90-20, Bogotá",
      contactoEmergencia: "Luis Fernando López",
      parentescoContacto: "Hijo",
      telefonoContacto: "3159998877",
    },
    denticion: "PERMANENTE",
    motivoConsulta: "Quiero cambiarme las coronas de adelante, ya están feas y se me mueven.",
    relatoAnamnesis:
      "Las coronas de los dos dientes de adelante se ven oscuras en el borde y siente que se mueven un poco. También nota un hueco en un colmillo de abajo.\n\n" +
      "Salud general: hace cinco años le pusieron una válvula en el corazón; toma warfarina todos los días y losartán para la presión. Sin alergias.\n\n" +
      "Odontológico: le han sacado muchas muelas, usa una prótesis removible que le lastima, tiene esas dos coronas y a un colmillo de arriba le hicieron tratamiento de conducto.",
    relatoExamen: "Reborde alveolar inferior irritado por la prótesis. Retracciones gingivales generalizadas.",
    relatoRadiografia: "Pérdida ósea horizontal leve generalizada.",
    esperado: {
      alertaMedica: ["cardiopatia", "anticoagulado", "hipertension"],
      antecedentesPersonales: ["cardiopatias", "presion_arterial", "cirugias", "tratamiento_medico", "medicamentos"],
      antecedentesOdontologicos: ["exodoncias", "conductos", "coronas", "protesis"],
      examenEstomatologico: ["reborde_alveolar"],
      examenDental: ["retracciones"],
      odontograma: [
        ...[18, 17, 16, 28, 27, 26, 36, 37, 38, 46, 47, 48].flatMap((d) => m(d, "AUSENTE")),
        ...m(11, "CORONA_MAL_ESTADO"),
        ...m(21, "CORONA_MAL_ESTADO"),
        ...m(13, "ENDODONCIA_REALIZADA"),
        ...m(43, "CARIES", "V"),
        ...m(33, "OBTURADO_BUEN_ESTADO", "V"),
      ],
      requiereRadiografia: true,
    },
  },
];

/**
 * Crea el módulo (si no existe) y los casos que falten. `usuarioIds`: a quién matricular
 * en el módulo (solo el seed local lo usa; en producción se matricula por grupos).
 */
export async function sembrarCasosOdontologia(prisma: PrismaClient, usuarioIds: string[] = []) {
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

  let creados = 0;
  for (const caso of CASOS_ODONTOLOGIA) {
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
    await prisma.escenario.create({
      data: {
        moduloId: modulo.id,
        titulo: caso.titulo,
        descripcion: caso.descripcion,
        descripcionDificil: caso.descripcionDificil,
        resultadoEsperado: caso.resultadoEsperado,
        soloTurno: caso.presencial ?? false,
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
    creados += 1;
    console.log(caso.presencial ? "Creado (presencial):" : "Creado (virtual):", caso.titulo);
  }
  return { creados, total: CASOS_ODONTOLOGIA.length };
}
