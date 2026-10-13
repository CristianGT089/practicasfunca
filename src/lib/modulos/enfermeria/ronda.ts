/**
 * Casos de la jornada presencial de Enfermería "Ronda de medicamentos". Cada caso es un
 * paciente que interpreta un compañero con su tarjeta y una manilla de identificación. En la
 * estación de enfermería el estudiante lo busca por el documento de la manilla, revisa el
 * kárdex (la orden médica) y diligencia la hoja de enfermería: signos vitales que toma al
 * compañero, decisión de administrar o no cada medicamento (con el motivo) y, si el caso lo
 * pide, un cálculo. Se califica con `revisarHoja` (hoja.ts).
 *
 * Los casos viven en el código (no en la base de datos): la jornada guarda solo sus códigos.
 * Material de práctica: pacientes y médicos ficticios.
 */
import type { EsperadoEnfermeria, TomaSignos } from "./hoja";

export type OrdenRonda = {
  medicamento: string;
  dosis: string;
  via: string;
  frecuencia: string;
  /** Hora en que toca en esta ronda. */
  hora: string;
  medico: string;
  /** Días antes de la ronda en que se escribió la orden. */
  emitidaHaceDias: number;
  /** Días de vigencia desde la emisión (si es menor que emitidaHaceDias, está vencida). */
  vigenciaDias: number;
  firmada: boolean;
  /** Solo para PRN o dosis ya dadas: última administración registrada en el kárdex. */
  ultimaAdministracion?: string;
  nota?: string;
};

export type CalculoRonda = { clave: string; pregunta: string; unidad: string; valor: number; tolerancia: number };

export type CasoRonda = {
  codigo: string;
  titulo: string;
  /** Qué se practica (para el docente al elegir los casos). */
  situacion: string;
  paciente: {
    nombre: string;
    tipoDocumento: "CC" | "TI" | "RC";
    documento: string;
    edad: number;
    sexo: "F" | "M";
    servicio: string;
    cama: string;
    diagnostico: string;
    /** Va en la manilla roja. Vacío = manilla blanca. */
    alergias: string[];
    pesoKg?: number;
  };
  horaRonda: string;
  ordenes: OrdenRonda[];
  /** Lo que el compañero cuenta y cómo actúa (en la tarjeta). */
  guion: string[];
  /** Lo que el compañero muestra cuando le toman los signos (en la tarjeta). */
  signos: Partial<Omit<TomaSignos, "hora">>;
  calculo?: CalculoRonda;
  /** Lo que se califica (además de los signos, que salen de `signos`). */
  esperado: Omit<EsperadoEnfermeria, "signos">;
  /** Qué debía hacer y por qué (para el repaso en clase). */
  explicacion: string;
};

const nada = { conciencia: null, valoracion: null, braden: null, glasgow: null, downton: null, balance: null } as const;
const DRA = "Dra. Patricia Lozano";
const DR = "Dr. Andrés Quintero";

export const CASOS_RONDA: CasoRonda[] = [
  {
    codigo: "ALERGIA_PENICILINA",
    titulo: "Ampicilina en paciente alérgico a la penicilina",
    situacion: "Verificar alergias antes de administrar",
    paciente: {
      nombre: "Jorge Iván Castaño Ruiz",
      tipoDocumento: "CC",
      documento: "79456123",
      edad: 54,
      sexo: "M",
      servicio: "Medicina interna",
      cama: "201",
      diagnostico: "Neumonía adquirida en la comunidad",
      alergias: ["Penicilina"],
    },
    horaRonda: "08:00",
    ordenes: [
      { medicamento: "Ampicilina", dosis: "1 g", via: "Intravenosa", frecuencia: "Cada 6 horas", hora: "08:00", medico: DRA, emitidaHaceDias: 0, vigenciaDias: 7, firmada: true },
      { medicamento: "Acetaminofén", dosis: "1 g", via: "Oral", frecuencia: "Cada 8 horas", hora: "08:00", medico: DRA, emitidaHaceDias: 0, vigenciaDias: 7, firmada: true },
    ],
    guion: [
      "Tienes tos y algo de fiebre desde hace 4 días.",
      "Si te preguntan por alergias: \"Sí, a la penicilina; una vez se me hinchó la cara\".",
      "Si te van a poner la ampicilina sin preguntar, no digas nada: deja que el estudiante lo detecte.",
    ],
    signos: { tas: 126, tad: 78, fc: 92, fr: 20, temperatura: 37.9, satO2: 95 },
    esperado: { ...nada, medicamentos: [{ medicamento: "ampicilina", administrar: false }, { medicamento: "acetaminofen", administrar: true }] },
    explicacion: "La ampicilina es una penicilina: con alergia documentada no se administra y se informa al médico. El acetaminofén sí.",
  },
  {
    codigo: "HOMONIMO_A",
    titulo: "Homónimos (1 de 2): María Rodríguez Pérez",
    situacion: "Identificar al paciente con dos datos (nombre y documento); usar junto con el caso 2 de 2",
    paciente: {
      nombre: "María Rodríguez Pérez",
      tipoDocumento: "CC",
      documento: "51789234",
      edad: 67,
      sexo: "F",
      servicio: "Medicina interna",
      cama: "203",
      diagnostico: "Hipertensión arterial descompensada",
      alergias: [],
    },
    horaRonda: "08:00",
    ordenes: [{ medicamento: "Enalapril", dosis: "10 mg", via: "Oral", frecuencia: "Cada 12 horas", hora: "08:00", medico: DR, emitidaHaceDias: 1, vigenciaDias: 7, firmada: true }],
    guion: [
      "Hay otra paciente que se llama casi igual que tú en la cama de al lado.",
      "Si solo te preguntan el nombre, responde \"María Rodríguez\" (sin el segundo apellido).",
      "Muestra tu manilla solo si te la piden o te la revisan.",
    ],
    signos: { tas: 152, tad: 94, fc: 76, fr: 18, temperatura: 36.6, satO2: 96 },
    esperado: { ...nada, medicamentos: [{ medicamento: "enalapril", administrar: true }] },
    explicacion: "Dos pacientes con el mismo nombre: la identificación se hace con nombre completo y documento de la manilla. A esta le corresponde el enalapril.",
  },
  {
    codigo: "HOMONIMO_B",
    titulo: "Homónimos (2 de 2): María Rodríguez Gómez",
    situacion: "Identificar al paciente con dos datos; usar junto con el caso 1 de 2",
    paciente: {
      nombre: "María Rodríguez Gómez",
      tipoDocumento: "CC",
      documento: "41256987",
      edad: 72,
      sexo: "F",
      servicio: "Medicina interna",
      cama: "204",
      diagnostico: "Diabetes mellitus tipo 2",
      alergias: [],
    },
    horaRonda: "08:00",
    ordenes: [{ medicamento: "Metformina", dosis: "850 mg", via: "Oral", frecuencia: "Con el desayuno", hora: "08:00", medico: DR, emitidaHaceDias: 2, vigenciaDias: 7, firmada: true }],
    guion: [
      "Hay otra paciente que se llama casi igual que tú en la cama de al lado.",
      "Si solo te preguntan el nombre, responde \"María Rodríguez\" (sin el segundo apellido).",
      "Ya desayunaste.",
    ],
    signos: { tas: 128, tad: 80, fc: 72, fr: 16, temperatura: 36.4, satO2: 97, glucometria: 146 },
    esperado: { ...nada, medicamentos: [{ medicamento: "metformina", administrar: true }] },
    explicacion: "A esta paciente le corresponde la metformina, no el enalapril de su homónima. Se verifica con el documento de la manilla.",
  },
  {
    codigo: "DIGOXINA_BRADICARDIA",
    titulo: "Digoxina con frecuencia cardiaca de 52",
    situacion: "Tomar el pulso antes de un medicamento que lo baja",
    paciente: {
      nombre: "Rosa Elvira Martínez",
      tipoDocumento: "CC",
      documento: "41234567",
      edad: 78,
      sexo: "F",
      servicio: "Medicina interna",
      cama: "305",
      diagnostico: "Insuficiencia cardiaca",
      alergias: [],
    },
    horaRonda: "08:00",
    ordenes: [
      { medicamento: "Digoxina", dosis: "0,25 mg", via: "Oral", frecuencia: "Cada 24 horas", hora: "08:00", medico: DRA, emitidaHaceDias: 3, vigenciaDias: 10, firmada: true, nota: "No administrar si FC < 60" },
      { medicamento: "Furosemida", dosis: "40 mg", via: "Intravenosa", frecuencia: "Cada 12 horas", hora: "08:00", medico: DRA, emitidaHaceDias: 3, vigenciaDias: 10, firmada: true },
    ],
    guion: ["Te sientes cansada y algo mareada.", "Te ahogas un poco al caminar."],
    signos: { tas: 118, tad: 72, fc: 52, fr: 20, temperatura: 36.5, satO2: 94 },
    esperado: { ...nada, medicamentos: [{ medicamento: "digoxina", administrar: false }, { medicamento: "furosemida", administrar: true }] },
    explicacion: "La digoxina baja la frecuencia cardiaca: con 52 lpm no se administra y se avisa al médico. La furosemida sí.",
  },
  {
    codigo: "INSULINA_HIPOGLUCEMIA",
    titulo: "Insulina con glucometría de 52 mg/dL",
    situacion: "Glucometría antes de la insulina",
    paciente: {
      nombre: "Luis Alberto Pineda",
      tipoDocumento: "CC",
      documento: "80123456",
      edad: 61,
      sexo: "M",
      servicio: "Medicina interna",
      cama: "207",
      diagnostico: "Diabetes mellitus tipo 2 insulinorrequiriente",
      alergias: [],
    },
    horaRonda: "07:00",
    ordenes: [{ medicamento: "Insulina NPH", dosis: "20 UI", via: "Subcutánea", frecuencia: "Antes del desayuno", hora: "07:00", medico: DR, emitidaHaceDias: 1, vigenciaDias: 7, firmada: true, nota: "Glucometría antes de cada dosis" }],
    guion: ["Estás sudando, tembloroso y con hambre.", "No has desayunado."],
    signos: { tas: 124, tad: 76, fc: 104, fr: 18, temperatura: 36.3, satO2: 97, glucometria: 52 },
    esperado: { ...nada, medicamentos: [{ medicamento: "insulina", administrar: false }] },
    explicacion: "Con 52 mg/dL (hipoglucemia) no se aplica insulina: se da el manejo de hipoglucemia según el protocolo y se avisa al médico.",
  },
  {
    codigo: "ANTIHIPERTENSIVO_HIPOTENSION",
    titulo: "Losartán con TA de 88/54",
    situacion: "Tensión arterial antes del antihipertensivo",
    paciente: {
      nombre: "Gloria Inés Vargas",
      tipoDocumento: "CC",
      documento: "39874521",
      edad: 70,
      sexo: "F",
      servicio: "Medicina interna",
      cama: "209",
      diagnostico: "Hipertensión arterial; deshidratación por diarrea",
      alergias: [],
    },
    horaRonda: "08:00",
    ordenes: [{ medicamento: "Losartán", dosis: "50 mg", via: "Oral", frecuencia: "Cada 12 horas", hora: "08:00", medico: DRA, emitidaHaceDias: 4, vigenciaDias: 10, firmada: true }],
    guion: ["Te sientes mareada al sentarte.", "Has tenido diarrea desde ayer."],
    signos: { tas: 88, tad: 54, fc: 98, fr: 18, temperatura: 36.9, satO2: 96 },
    esperado: { ...nada, medicamentos: [{ medicamento: "losartan", administrar: false }] },
    explicacion: "Con hipotensión (88/54) no se da el antihipertensivo: se informa al médico.",
  },
  {
    codigo: "PRN_ANTES_DE_TIEMPO",
    titulo: "Tramadol PRN pedido antes de tiempo",
    situacion: "Respetar el intervalo de un medicamento \"si es necesario\"",
    paciente: {
      nombre: "Camilo Andrés Rojas",
      tipoDocumento: "CC",
      documento: "1020456789",
      edad: 35,
      sexo: "M",
      servicio: "Cirugía",
      cama: "312",
      diagnostico: "Posoperatorio de apendicectomía",
      alergias: [],
    },
    horaRonda: "08:00",
    ordenes: [
      {
        medicamento: "Tramadol",
        dosis: "50 mg",
        via: "Intravenosa",
        frecuencia: "Cada 8 horas si hay dolor (PRN)",
        hora: "Si hay dolor",
        medico: DR,
        emitidaHaceDias: 0,
        vigenciaDias: 3,
        firmada: true,
        ultimaAdministracion: "05:00",
      },
    ],
    guion: ["Te duele mucho la herida (8 de 10) e insistes en que te pongan algo ya.", "Si te dicen que no se puede todavía, insiste una vez y luego acepta."],
    signos: { tas: 132, tad: 84, fc: 96, fr: 20, temperatura: 37.2, satO2: 97, dolor: 8 },
    esperado: { ...nada, medicamentos: [{ medicamento: "tramadol", administrar: false }] },
    explicacion: "La última dosis fue a las 05:00 y la orden es cada 8 horas: no se puede repetir a las 08:00. Se informa al médico el dolor no controlado.",
  },
  {
    codigo: "PEDIATRICO_ACETAMINOFEN",
    titulo: "Acetaminofén pediátrico por peso",
    situacion: "Calcular la dosis en ml a partir de mg/kg",
    paciente: {
      nombre: "Samuel Herrera Díaz",
      tipoDocumento: "TI",
      documento: "1098765432",
      edad: 6,
      sexo: "M",
      servicio: "Pediatría",
      cama: "P-04",
      diagnostico: "Fiebre; infección de vías urinarias",
      alergias: [],
      pesoKg: 20,
    },
    horaRonda: "08:00",
    ordenes: [
      {
        medicamento: "Acetaminofén jarabe (150 mg / 5 ml)",
        dosis: "15 mg/kg",
        via: "Oral",
        frecuencia: "Cada 6 horas si T° ≥ 38 °C",
        hora: "08:00",
        medico: DRA,
        emitidaHaceDias: 0,
        vigenciaDias: 5,
        firmada: true,
        nota: "Peso: 20 kg",
      },
    ],
    guion: ["Eres un niño de 6 años: estás decaído y caliente.", "Tu mamá (si alguien más hace de mamá) contesta las preguntas."],
    signos: { fc: 118, fr: 24, temperatura: 39.2, satO2: 97 },
    calculo: { clave: "ml_acetaminofen", pregunta: "¿Cuántos ml de jarabe le corresponden?", unidad: "ml", valor: 10, tolerancia: 0 },
    esperado: { ...nada, medicamentos: [{ medicamento: "acetaminofen", administrar: true }] },
    explicacion: "15 mg/kg × 20 kg = 300 mg. El jarabe tiene 150 mg en 5 ml: 300 mg = 10 ml. Con 39,2 °C sí se administra.",
  },
  {
    codigo: "GOTEO",
    titulo: "Cálculo de goteo de solución salina",
    situacion: "Calcular gotas por minuto con macrogotero",
    paciente: {
      nombre: "Ana Lucía Moreno",
      tipoDocumento: "CC",
      documento: "52987654",
      edad: 45,
      sexo: "F",
      servicio: "Medicina interna",
      cama: "211",
      diagnostico: "Gastroenteritis con deshidratación",
      alergias: [],
    },
    horaRonda: "08:00",
    ordenes: [
      {
        medicamento: "Solución salina 0,9 %",
        dosis: "1.000 ml",
        via: "Intravenosa",
        frecuencia: "Pasar en 8 horas",
        hora: "08:00",
        medico: DR,
        emitidaHaceDias: 0,
        vigenciaDias: 2,
        firmada: true,
        nota: "Equipo de macrogoteo (20 gotas = 1 ml)",
      },
    ],
    guion: ["Te sientes débil y con la boca seca.", "Has vomitado dos veces."],
    signos: { tas: 104, tad: 66, fc: 102, fr: 18, temperatura: 37.0, satO2: 98 },
    calculo: { clave: "gotas_minuto", pregunta: "¿A cuántas gotas por minuto queda el goteo?", unidad: "gotas/min", valor: 42, tolerancia: 1 },
    esperado: { ...nada, medicamentos: [{ medicamento: "solucion salina", administrar: true }] },
    explicacion: "Gotas/min = volumen (ml) × factor de goteo ÷ minutos = 1.000 × 20 ÷ 480 = 41,7 ≈ 42 gotas/min.",
  },
  {
    codigo: "ORDEN_VENCIDA",
    titulo: "Ceftriaxona con orden vencida",
    situacion: "Revisar la vigencia de la orden médica",
    paciente: {
      nombre: "Héctor Fabio Salazar",
      tipoDocumento: "CC",
      documento: "16789012",
      edad: 58,
      sexo: "M",
      servicio: "Medicina interna",
      cama: "214",
      diagnostico: "Celulitis en pierna derecha",
      alergias: [],
    },
    horaRonda: "08:00",
    ordenes: [{ medicamento: "Ceftriaxona", dosis: "1 g", via: "Intravenosa", frecuencia: "Cada 12 horas", hora: "08:00", medico: DR, emitidaHaceDias: 8, vigenciaDias: 7, firmada: true }],
    guion: ["Te sientes mejor; la pierna ya no está tan roja.", "Si te preguntan, el médico no ha pasado hoy."],
    signos: { tas: 124, tad: 80, fc: 78, fr: 16, temperatura: 36.7, satO2: 97 },
    esperado: { ...nada, medicamentos: [{ medicamento: "ceftriaxona", administrar: false }] },
    explicacion: "La orden venció ayer (7 días desde la emisión): no se administra hasta que el médico la renueve.",
  },
  {
    codigo: "ORDEN_SIN_FIRMA",
    titulo: "Dipirona con orden sin firma",
    situacion: "Una orden sin firma del médico no es válida",
    paciente: {
      nombre: "Sandra Milena Ortiz",
      tipoDocumento: "CC",
      documento: "1032456789",
      edad: 29,
      sexo: "F",
      servicio: "Urgencias - observación",
      cama: "OBS-3",
      diagnostico: "Cefalea tensional",
      alergias: [],
    },
    horaRonda: "08:00",
    ordenes: [{ medicamento: "Dipirona", dosis: "1 g", via: "Intravenosa", frecuencia: "Dosis única", hora: "08:00", medico: "(sin firma)", emitidaHaceDias: 0, vigenciaDias: 1, firmada: false }],
    guion: ["Te duele la cabeza (6 de 10) desde anoche.", "Dices que la doctora te dijo que te iban a poner algo."],
    signos: { tas: 118, tad: 76, fc: 84, fr: 16, temperatura: 36.6, satO2: 98, dolor: 6 },
    esperado: { ...nada, medicamentos: [{ medicamento: "dipirona", administrar: false }] },
    explicacion: "La orden no tiene firma del médico: no es válida. Se le pide al médico que la firme antes de administrar.",
  },
  {
    codigo: "RECHAZO",
    titulo: "Paciente que rechaza el medicamento",
    situacion: "Respetar la decisión del paciente y registrarla",
    paciente: {
      nombre: "Álvaro José Medina",
      tipoDocumento: "CC",
      documento: "19345678",
      edad: 66,
      sexo: "M",
      servicio: "Medicina interna",
      cama: "216",
      diagnostico: "Gastritis; hipertensión arterial",
      alergias: [],
    },
    horaRonda: "08:00",
    ordenes: [
      { medicamento: "Omeprazol", dosis: "20 mg", via: "Oral", frecuencia: "Cada 24 horas en ayunas", hora: "06:00", medico: DRA, emitidaHaceDias: 2, vigenciaDias: 10, firmada: true },
      { medicamento: "Amlodipino", dosis: "5 mg", via: "Oral", frecuencia: "Cada 24 horas", hora: "08:00", medico: DRA, emitidaHaceDias: 2, vigenciaDias: 10, firmada: true },
    ],
    guion: [
      "No quieres tomarte el omeprazol: \"esa pasta me cae mal, no me la tomo\".",
      "El amlodipino sí te lo tomas sin problema.",
      "Si te explican bien para qué es el omeprazol, igual dices que no.",
    ],
    signos: { tas: 138, tad: 86, fc: 74, fr: 16, temperatura: 36.5, satO2: 97 },
    esperado: { ...nada, medicamentos: [{ medicamento: "omeprazol", administrar: false }, { medicamento: "amlodipino", administrar: true }] },
    explicacion: "El paciente tiene derecho a rechazar un medicamento: se le explica, no se le obliga, se registra el rechazo y se informa al médico.",
  },
  {
    codigo: "PREECLAMPSIA",
    titulo: "Gestante con cefalea y TA de 150/100",
    situacion: "Reconocer un signo de alarma y escalar",
    paciente: {
      nombre: "Daniela Fernanda López",
      tipoDocumento: "CC",
      documento: "1015478963",
      edad: 24,
      sexo: "F",
      servicio: "Ginecobstetricia",
      cama: "G-02",
      diagnostico: "Embarazo de 34 semanas; en observación",
      alergias: [],
    },
    horaRonda: "08:00",
    ordenes: [{ medicamento: "Acetaminofén", dosis: "1 g", via: "Oral", frecuencia: "Cada 8 horas si hay dolor", hora: "08:00", medico: DR, emitidaHaceDias: 0, vigenciaDias: 2, firmada: true }],
    guion: ["Tienes un dolor de cabeza fuerte y ves \"lucecitas\".", "Pides algo para el dolor de cabeza."],
    signos: { tas: 150, tad: 100, fc: 92, fr: 18, temperatura: 36.8, satO2: 97, dolor: 7 },
    esperado: { ...nada, medicamentos: [{ medicamento: "acetaminofen", administrar: false }] },
    explicacion: "Cefalea con visión de luces y TA de 150/100 en una gestante son signos de alarma de preeclampsia: se avisa de inmediato al médico; no se trata solo el dolor.",
  },
  {
    codigo: "BRADEN_ENCAMADO",
    titulo: "Adulto mayor encamado: escala de Braden",
    situacion: "Valorar el riesgo de lesión por presión",
    paciente: {
      nombre: "Pedro Pablo Gutiérrez",
      tipoDocumento: "CC",
      documento: "17234890",
      edad: 84,
      sexo: "M",
      servicio: "Medicina interna",
      cama: "220",
      diagnostico: "Secuelas de accidente cerebrovascular",
      alergias: [],
    },
    horaRonda: "08:00",
    ordenes: [{ medicamento: "Enoxaparina", dosis: "40 mg", via: "Subcutánea", frecuencia: "Cada 24 horas", hora: "08:00", medico: DRA, emitidaHaceDias: 5, vigenciaDias: 10, firmada: true }],
    guion: [
      "Permaneces acostado: no te puedes levantar ni girar solo (no te muevas).",
      "Respondes con dificultad y sientes poco cuando te tocan.",
      "Usas pañal y suele estar húmedo; comes menos de la mitad de las comidas.",
      "Cuando te mueven, te deslizas hacia abajo en la cama.",
    ],
    signos: { tas: 130, tad: 78, fc: 80, fr: 18, temperatura: 36.6, satO2: 95 },
    esperado: { ...nada, braden: 9, medicamentos: [{ medicamento: "enoxaparina", administrar: true }] },
    explicacion:
      "Braden = 9 (riesgo alto): percepción muy limitada (2), a menudo húmedo (2), encamado (1), completamente inmóvil (1), nutrición probablemente inadecuada (2), fricción: es un problema (1). Requiere cambios de posición cada 2 horas. La enoxaparina sí se administra.",
  },
  {
    codigo: "NORMAL",
    titulo: "Ronda sin novedades",
    situacion: "Caso normal: todo correcto, administrar y registrar",
    paciente: {
      nombre: "Carmen Rosa Peña",
      tipoDocumento: "CC",
      documento: "41987321",
      edad: 59,
      sexo: "F",
      servicio: "Medicina interna",
      cama: "218",
      diagnostico: "Hipotiroidismo; dislipidemia",
      alergias: [],
    },
    horaRonda: "08:00",
    ordenes: [
      { medicamento: "Levotiroxina", dosis: "100 mcg", via: "Oral", frecuencia: "Cada 24 horas en ayunas", hora: "06:00", medico: DR, emitidaHaceDias: 3, vigenciaDias: 10, firmada: true, ultimaAdministracion: "06:00" },
      { medicamento: "Atorvastatina", dosis: "20 mg", via: "Oral", frecuencia: "Cada 24 horas", hora: "08:00", medico: DR, emitidaHaceDias: 3, vigenciaDias: 10, firmada: true },
    ],
    guion: ["Te sientes bien.", "Respondes todo con normalidad."],
    signos: { tas: 122, tad: 78, fc: 70, fr: 16, temperatura: 36.5, satO2: 98 },
    esperado: { ...nada, medicamentos: [{ medicamento: "atorvastatina", administrar: true }] },
    explicacion: "Todo correcto: se administra la atorvastatina. La levotiroxina ya se dio a las 06:00 (no se repite).",
  },
];

const POR_CODIGO = new Map(CASOS_RONDA.map((c) => [c.codigo, c]));
export const casoRonda = (codigo: string) => POR_CODIGO.get(codigo);

/** Lo esperado completo del caso (para revisarHoja): incluye los signos de la tarjeta. */
export function esperadoDeCaso(c: CasoRonda): EsperadoEnfermeria {
  return { ...c.esperado, signos: c.signos, calculos: c.calculo ? [c.calculo] : null };
}

/** Fechas de la orden respecto al día de la ronda: emitida, vence y si está vigente. */
export function vigenciaOrden(o: OrdenRonda, diaRonda: Date) {
  const dia = 24 * 3600 * 1000;
  const emitida = new Date(diaRonda.getTime() - o.emitidaHaceDias * dia);
  const vence = new Date(emitida.getTime() + o.vigenciaDias * dia);
  return { emitida, vence, vigente: o.vigenciaDias > o.emitidaHaceDias };
}

const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
/** Cada medicamento esperado corresponde a una orden del caso (sirve para las pruebas). */
export const ordenDe = (c: CasoRonda, medicamento: string) => c.ordenes.find((o) => normalizar(o.medicamento).includes(normalizar(medicamento)));
