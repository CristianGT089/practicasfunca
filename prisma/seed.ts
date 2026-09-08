import { PrismaClient, ActitudCedula } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DIA = 24 * 60 * 60 * 1000;
const hoy = new Date();
const enElPasado = new Date(hoy.getTime() - 30 * DIA);
const enElFuturo = new Date(hoy.getTime() + 365 * DIA);

async function main() {
  // ---------- Usuarios ----------
  const hashAdmin = await bcrypt.hash("admin123", 10);
  const hashEstudiante = await bcrypt.hash("estudiante123", 10);

  await prisma.usuario.upsert({
    where: { usuario: "admin" },
    update: {},
    create: { nombre: "Administrador", usuario: "admin", passwordHash: hashAdmin, rol: "ADMIN" },
  });

  const estudiante1 = await prisma.usuario.upsert({
    where: { usuario: "estudiante1" },
    update: {},
    create: {
      nombre: "Estudiante de Prueba",
      usuario: "estudiante1",
      passwordHash: hashEstudiante,
      rol: "ESTUDIANTE",
    },
  });

  // ---------- Medicamentos ----------
  const acetaminofen = await prisma.medicamento.upsert({
    where: { id: "med-acetaminofen" },
    update: {},
    create: {
      id: "med-acetaminofen",
      nombre: "Acetaminofén",
      principioActivo: "Paracetamol",
      presentacion: "Tableta 500mg",
      requiereReceta: false,
      esControlado: false,
      stock: 120,
      precio: 3500,
      tags: ["analgesico", "antipiretico"],
    },
  });

  const amoxicilina = await prisma.medicamento.upsert({
    where: { id: "med-amoxicilina" },
    update: {},
    create: {
      id: "med-amoxicilina",
      nombre: "Amoxicilina",
      principioActivo: "Amoxicilina",
      presentacion: "Cápsula 500mg",
      requiereReceta: true,
      esControlado: false,
      stock: 60,
      precio: 12000,
      tags: ["antibiotico", "penicilina"],
    },
  });

  const diazepam = await prisma.medicamento.upsert({
    where: { id: "med-diazepam" },
    update: {},
    create: {
      id: "med-diazepam",
      nombre: "Diazepam",
      principioActivo: "Diazepam",
      presentacion: "Tableta 10mg",
      requiereReceta: true,
      esControlado: true,
      stock: 20,
      precio: 8000,
      tags: ["ansiolitico", "controlado"],
    },
  });

  const loratadina = await prisma.medicamento.upsert({
    where: { id: "med-loratadina" },
    update: {},
    create: {
      id: "med-loratadina",
      nombre: "Loratadina",
      principioActivo: "Loratadina",
      presentacion: "Tableta 10mg",
      requiereReceta: false,
      esControlado: false,
      stock: 90,
      precio: 4200,
      tags: ["antihistaminico"],
    },
  });

  const ibuprofeno = await prisma.medicamento.upsert({
    where: { id: "med-ibuprofeno" },
    update: {},
    create: {
      id: "med-ibuprofeno",
      nombre: "Ibuprofeno",
      principioActivo: "Ibuprofeno",
      presentacion: "Tableta 400mg",
      requiereReceta: false,
      esControlado: false,
      stock: 75,
      precio: 4000,
      tags: ["antiinflamatorio", "aine"],
    },
  });

  await prisma.medicamento.upsert({
    where: { id: "med-losartan" },
    update: {},
    create: {
      id: "med-losartan",
      nombre: "Losartán",
      principioActivo: "Losartán potásico",
      presentacion: "Tableta 50mg",
      requiereReceta: false,
      esControlado: false,
      stock: 40,
      precio: 9500,
      tags: ["antihipertensivo"],
    },
  });

  const tramadol = await prisma.medicamento.upsert({
    where: { id: "med-tramadol" },
    update: {},
    create: {
      id: "med-tramadol",
      nombre: "Tramadol",
      principioActivo: "Tramadol",
      presentacion: "Cápsula 50mg",
      requiereReceta: true,
      esControlado: true,
      stock: 15,
      precio: 11000,
      tags: ["opioide", "controlado", "analgesico"],
    },
  });

  const ciprofloxacina = await prisma.medicamento.upsert({
    where: { id: "med-ciprofloxacina" },
    update: {},
    create: {
      id: "med-ciprofloxacina",
      nombre: "Ciprofloxacina",
      principioActivo: "Ciprofloxacina",
      presentacion: "Tableta 500mg",
      requiereReceta: true,
      esControlado: false,
      stock: 0,
      precio: 13500,
      tags: ["antibiotico", "quinolona"],
    },
  });

  const omeprazol = await prisma.medicamento.upsert({
    where: { id: "med-omeprazol" },
    update: {},
    create: {
      id: "med-omeprazol",
      nombre: "Omeprazol",
      principioActivo: "Omeprazol",
      presentacion: "Cápsula 20mg",
      requiereReceta: false,
      esControlado: false,
      stock: 5,
      precio: 6000,
      tags: ["antiacido"],
      loteVencimiento: enElPasado,
    },
  });

  const cefalexina = await prisma.medicamento.upsert({
    where: { id: "med-cefalexina" },
    update: {},
    create: {
      id: "med-cefalexina",
      nombre: "Cefalexina",
      principioActivo: "Cefalexina",
      presentacion: "Cápsula 500mg",
      requiereReceta: true,
      esControlado: false,
      stock: 45,
      precio: 14000,
      tags: ["antibiotico", "cefalosporina"],
    },
  });

  const multivitaminico = await prisma.medicamento.upsert({
    where: { id: "med-tutorial-multivitaminico" },
    update: {},
    create: {
      id: "med-tutorial-multivitaminico",
      nombre: "Multivitamínico (ejemplo)",
      principioActivo: "Complejo vitamínico",
      presentacion: "Tableta masticable",
      requiereReceta: false,
      esControlado: false,
      stock: 200,
      precio: 5000,
      tags: ["tutorial"],
      loteVencimiento: enElFuturo,
    },
  });

  // ---------- Pacientes ----------
  const paraPractica = await prisma.paciente.upsert({
    where: { cedula: "0000000000" },
    update: {},
    create: {
      nombre: "Paciente de Práctica",
      cedula: "0000000000",
      edad: 30,
      alergias: [],
      antecedentes: "Ninguno — paciente de ejemplo para el tutorial",
    },
  });

  const maria = await prisma.paciente.upsert({
    where: { cedula: "1010101010" },
    update: {},
    create: {
      nombre: "María Gómez",
      cedula: "1010101010",
      edad: 34,
      alergias: ["penicilina"],
      antecedentes: "Ninguno relevante",
    },
  });

  const carlos = await prisma.paciente.upsert({
    where: { cedula: "1020304050" },
    update: {},
    create: {
      nombre: "Carlos Ruiz",
      cedula: "1020304050",
      edad: 52,
      alergias: ["aine"],
      antecedentes: "Gastritis crónica",
    },
  });

  const jorge = await prisma.paciente.upsert({
    where: { cedula: "1030405060" },
    update: {},
    create: {
      nombre: "Jorge Pérez",
      cedula: "1030405060",
      edad: 61,
      alergias: [],
      antecedentes: "Diabetes tipo 2, hipertensión controlada",
    },
  });

  const lucia = await prisma.paciente.upsert({
    where: { cedula: "1040506070" },
    update: {},
    create: {
      nombre: "Lucía Fernández",
      cedula: "1040506070",
      edad: 28,
      alergias: ["quinolona"],
      antecedentes: "Ninguno relevante",
    },
  });

  const pedro = await prisma.paciente.upsert({
    where: { cedula: "1050607080" },
    update: {},
    create: {
      nombre: "Pedro Martínez",
      cedula: "1050607080",
      edad: 70,
      alergias: [],
      antecedentes: "Hipertensión, insuficiencia renal leve",
    },
  });

  const diego = await prisma.paciente.upsert({
    where: { cedula: "1060708090" },
    update: {},
    create: {
      nombre: "Diego Salazar",
      cedula: "1060708090",
      edad: 45,
      alergias: [],
      antecedentes: "Ninguno relevante",
      fechaNacimiento: new Date(hoy.getFullYear() - 45, 3, 12),
      lugarNacimiento: "Bucaramanga, Santander",
      tipoSangre: "O+",
    },
  });

  const ana = await prisma.paciente.upsert({
    where: { cedula: "1070809010" },
    update: {},
    create: {
      nombre: "Ana Torres",
      cedula: "1070809010",
      edad: 29,
      alergias: [],
      antecedentes: "Ninguno relevante",
      fechaNacimiento: new Date(hoy.getFullYear() - 29, 6, 3),
      lugarNacimiento: "Medellín, Antioquia",
      tipoSangre: "A+",
    },
  });

  const rafael = await prisma.paciente.upsert({
    where: { cedula: "1080901020" },
    update: {},
    create: {
      nombre: "Rafael Ibarra",
      cedula: "1080901020",
      edad: 38,
      alergias: [],
      antecedentes: "Ninguno relevante",
      fechaNacimiento: new Date(hoy.getFullYear() - 38, 10, 21),
      lugarNacimiento: "Cali, Valle del Cauca",
      tipoSangre: "B+",
    },
  });

  const sofia = await prisma.paciente.upsert({
    where: { cedula: "1091021030" },
    update: {},
    create: {
      nombre: "Sofía Ramírez",
      cedula: "1091021030",
      edad: 24,
      alergias: [],
      antecedentes: "Ninguno relevante",
      fechaNacimiento: new Date(hoy.getFullYear() - 24, 1, 17),
      lugarNacimiento: "Bogotá, D.C.",
      tipoSangre: "O-",
    },
  });

  const camilo = await prisma.paciente.upsert({
    where: { cedula: "1102030405" },
    update: {},
    create: {
      nombre: "Camilo Herrera",
      cedula: "1102030405",
      edad: 56,
      alergias: [],
      antecedentes: "Hipertensión controlada",
      fechaNacimiento: new Date(hoy.getFullYear() - 56, 8, 9),
      lugarNacimiento: "Barranquilla, Atlántico",
      tipoSangre: "AB+",
    },
  });

  const beatriz = await prisma.paciente.upsert({
    where: { cedula: "1112131415" },
    update: {},
    create: {
      nombre: "Beatriz Núñez",
      cedula: "1112131415",
      edad: 67,
      alergias: [],
      antecedentes: "Ansiedad diagnosticada, en tratamiento",
      fechaNacimiento: new Date(hoy.getFullYear() - 67, 5, 30),
      lugarNacimiento: "Cartagena, Bolívar",
      tipoSangre: "A-",
    },
  });

  // ---------- Pacientes exclusivos de la prueba final (Turno) ----------
  const natalia = await prisma.paciente.upsert({
    where: { cedula: "1122334455" },
    update: {},
    create: {
      nombre: "Natalia Rendón",
      cedula: "1122334455",
      edad: 31,
      alergias: [],
      antecedentes: "Ninguno relevante",
      fechaNacimiento: new Date(hoy.getFullYear() - 31, 2, 14),
      lugarNacimiento: "Pereira, Risaralda",
      tipoSangre: "O+",
    },
  });

  const marta = await prisma.paciente.upsert({
    where: { cedula: "1133445566" },
    update: {},
    create: {
      nombre: "Marta Suárez",
      cedula: "1133445566",
      edad: 43,
      alergias: ["antihistaminico"],
      antecedentes: "Ninguno relevante",
      fechaNacimiento: new Date(hoy.getFullYear() - 43, 9, 2),
      lugarNacimiento: "Manizales, Caldas",
      tipoSangre: "B-",
    },
  });

  const julian = await prisma.paciente.upsert({
    where: { cedula: "1144556677" },
    update: {},
    create: {
      nombre: "Julián Cárdenas",
      cedula: "1144556677",
      edad: 39,
      alergias: [],
      antecedentes: "Gastritis leve",
      fechaNacimiento: new Date(hoy.getFullYear() - 39, 11, 5),
      lugarNacimiento: "Ibagué, Tolima",
      tipoSangre: "A+",
    },
  });

  const rodrigo = await prisma.paciente.upsert({
    where: { cedula: "1155667788" },
    update: {},
    create: {
      nombre: "Rodrigo Peña",
      cedula: "1155667788",
      edad: 58,
      alergias: [],
      antecedentes: "Dolor lumbar crónico",
      fechaNacimiento: new Date(hoy.getFullYear() - 58, 4, 19),
      lugarNacimiento: "Neiva, Huila",
      tipoSangre: "AB-",
    },
  });

  // ---------- Recetas electrónicas (historial en línea) ----------
  await prisma.recetaElectronica.deleteMany({
    where: { pacienteId: { in: [diego.id, ana.id, sofia.id, camilo.id] } },
  });
  await prisma.recetaElectronica.createMany({
    data: [
      {
        pacienteId: diego.id,
        medicamentoId: tramadol.id,
        medico: "Dra. Patricia León",
        cantidadAutorizada: 10,
        cantidadRedimida: 0,
        fechaEmision: new Date(hoy.getTime() - 5 * DIA),
        fechaVigencia: new Date(hoy.getTime() + 25 * DIA),
      },
      {
        pacienteId: ana.id,
        medicamentoId: amoxicilina.id,
        medico: "Dr. Andrés Cortés",
        cantidadAutorizada: 10,
        cantidadRedimida: 0,
        fechaEmision: new Date(hoy.getTime() - 2 * DIA),
        fechaVigencia: new Date(hoy.getTime() + 28 * DIA),
      },
      // Rafael no tiene ninguna receta electrónica registrada a su nombre (caso "no encontrada").
      {
        // Sofía sí tiene una receta electrónica, pero ya venció por fecha (caso "vencida").
        pacienteId: sofia.id,
        medicamentoId: cefalexina.id,
        medico: "Dra. Marcela Ospina",
        cantidadAutorizada: 12,
        cantidadRedimida: 0,
        fechaEmision: new Date(hoy.getTime() - 45 * DIA),
        fechaVigencia: new Date(hoy.getTime() - 15 * DIA),
      },
      {
        pacienteId: camilo.id,
        medicamentoId: cefalexina.id,
        medico: "Dr. Iván Restrepo",
        cantidadAutorizada: 10,
        cantidadRedimida: 10, // ya redimida por completo en una visita anterior
        fechaEmision: new Date(hoy.getTime() - 20 * DIA),
        fechaVigencia: new Date(hoy.getTime() + 10 * DIA),
      },
    ],
  });

  // ---------- Escenarios ----------
  const moduloFarmacia = await prisma.modulo.upsert({
    where: { slug: "farmacia" },
    update: {},
    create: { slug: "farmacia", nombre: "Farmacia", descripcion: "Simulador de auxiliar en farmacia", colorTema: "#2563eb" },
  });

  // Forma "plana" (compatible con el shape anterior a la migración multi-módulo): mezcla
  // los campos genéricos de Escenario con los específicos de Farmacia (pacienteId, receta
  // física/online, cédula). El helper se encarga de repartirlos en la tabla de extensión.
  type DatosEscenarioFarmaciaSeed = {
    titulo: string;
    descripcion: string;
    descripcionDificil?: string;
    soloTurno?: boolean;
    resultadoEsperado: string;
    pasos?: {
      create: {
        orden: number;
        tipoAccion: string;
        descripcion: string;
        parametros?: object;
        peso?: number;
        obligatorio?: boolean;
      }[];
    };
    pacienteId?: string | null;
    recetaPresentada?: boolean;
    notaRecetaFisica?: string | null;
    actitudCedula?: "ENTREGA" | "SE_REHUSA" | null;
    recetaFisicaPacienteNombre?: string | null;
    recetaFisicaMedicamento?: string | null;
    recetaFisicaPosologia?: string | null;
    recetaFisicaCantidad?: string | null;
    recetaFisicaCantidadTachada?: string | null;
    recetaFisicaMedico?: string | null;
    recetaFisicaRegistroMedico?: string | null;
    recetaFisicaFechaEmision?: Date | null;
    recetaFisicaDiasVigencia?: number | null;
    recetaFisicaControlado?: boolean;
    items?: { create: { medicamentoId: string; cantidadEsperada?: number }[] };
  };

  async function crearEscenarioSiNoExiste(titulo: string, datos: DatosEscenarioFarmaciaSeed) {
    const existe = await prisma.escenario.findFirst({ where: { titulo } });
    if (existe) {
      console.log("Ya existe, se omite:", titulo);
      return;
    }
    const {
      pacienteId,
      recetaPresentada,
      notaRecetaFisica,
      actitudCedula,
      recetaFisicaPacienteNombre,
      recetaFisicaMedicamento,
      recetaFisicaPosologia,
      recetaFisicaCantidad,
      recetaFisicaCantidadTachada,
      recetaFisicaMedico,
      recetaFisicaRegistroMedico,
      recetaFisicaFechaEmision,
      recetaFisicaDiasVigencia,
      recetaFisicaControlado,
      items,
      ...generico
    } = datos;

    const creado = await prisma.escenario.create({
      data: {
        ...generico,
        moduloId: moduloFarmacia.id,
        farmacia: {
          create: {
            pacienteId,
            recetaPresentada,
            notaRecetaFisica,
            actitudCedula,
            recetaFisicaPacienteNombre,
            recetaFisicaMedicamento,
            recetaFisicaPosologia,
            recetaFisicaCantidad,
            recetaFisicaCantidadTachada,
            recetaFisicaMedico,
            recetaFisicaRegistroMedico,
            recetaFisicaFechaEmision,
            recetaFisicaDiasVigencia,
            recetaFisicaControlado,
            items,
          },
        },
      },
    });
    console.log("Escenario creado:", titulo, "-", creado.id);
  }

  // 0. Tutorial — recorre cada botón del simulador, sin riesgo de "reprobar"
  await crearEscenarioSiNoExiste("Tutorial: cómo usar el simulador", {
    titulo: "Tutorial: cómo usar el simulador",
    descripcion:
      "Este caso no es real, es para que aprendas dónde está cada botón antes de resolver los casos que sí califican. Sigue los pasos en orden:\n" +
      "1. En 'Buscar medicamento', escribe 'Multivitamínico' para encontrarlo.\n" +
      "2. En 'Identidad del cliente', haz clic en 'Solicitar cédula' — así se ve la identificación física antes que nada.\n" +
      "3. Con la cédula en mano, haz clic en 'Buscar en el sistema por esta cédula' para traer su ficha (alergias, antecedentes). Fíjate que la alergia no aparece marcada en la lista de medicamentos: eso lo tienes que cruzar tú mismo con la 'familia' del medicamento.\n" +
      "4. Fíjate en las etiquetas de stock y vencimiento junto a cada medicamento — esas sí son automáticas.\n" +
      "5. Haz clic en 'Verificar receta' (aunque este producto no la necesita, así conoces el botón).\n" +
      "6. Busca 'Diazepam' en el buscador — es un medicamento controlado — y haz clic en 'Registrar controlado' (no lo vamos a vender, solo es para que conozcas ese botón).\n" +
      "7. Vuelve a buscar 'Multivitamínico' y haz clic en 'Agregar a venta'.\n" +
      "8. En la columna derecha ('Venta actual'), haz clic en 'Quitar' para practicar cómo se corrige un error.\n" +
      "9. Agrega el Multivitamínico a la venta una vez más.\n" +
      "10. Haz clic en 'Completar venta' para terminar.\n" +
      "Al final verás tu resultado con una lista de todo lo que hiciste bien — esa es la misma pantalla que verás en los casos reales.",
    pacienteId: paraPractica.id,
    resultadoEsperado: "VENTA_CORRECTA",
    items: { create: [{ medicamentoId: multivitaminico.id, cantidadEsperada: 1 }] },
    pasos: {
      create: [
        {
          orden: 2,
          tipoAccion: "SOLICITAR_CEDULA",
          descripcion: "Solicitaste la cédula del paciente",
          peso: 1,
        },
        {
          orden: 3,
          tipoAccion: "VER_FICHA_PACIENTE",
          descripcion: "Buscaste la ficha del paciente en el sistema por su cédula",
          peso: 1,
        },
        {
          orden: 4,
          tipoAccion: "VERIFICAR_RECETA",
          descripcion: "Probaste el botón de verificar receta",
          peso: 1,
        },
        {
          orden: 5,
          tipoAccion: "REGISTRAR_CONTROLADO",
          descripcion: "Probaste el botón de registrar un medicamento controlado (con Diazepam)",
          parametros: { medicamentoId: diazepam.id },
          peso: 1,
        },
        {
          orden: 6,
          tipoAccion: "AGREGAR_A_VENTA",
          descripcion: "Agregaste el Multivitamínico a la venta por primera vez",
          parametros: { medicamentoId: multivitaminico.id },
          peso: 1,
        },
        {
          orden: 7,
          tipoAccion: "QUITAR_DE_VENTA",
          descripcion: "Practicaste cómo quitar un producto de la venta",
          parametros: { medicamentoId: multivitaminico.id },
          peso: 1,
        },
        {
          orden: 8,
          tipoAccion: "AGREGAR_A_VENTA",
          descripcion: "Volviste a agregar el Multivitamínico a la venta",
          parametros: { medicamentoId: multivitaminico.id },
          peso: 1,
        },
        {
          orden: 9,
          tipoAccion: "COMPLETAR_VENTA",
          descripcion: "Completaste la venta",
          peso: 2,
        },
      ],
    },
  });

  // 1. Venta libre simple — caso base
  await crearEscenarioSiNoExiste("Cliente pide Acetaminofén", {
    titulo: "Cliente pide Acetaminofén",
    descripcion:
      "Un cliente llega pidiendo Acetaminofén para el dolor de cabeza. No requiere receta. Atiéndelo y completa la venta correctamente.",
    descripcionDificil: "Un cliente pide Acetaminofén.",
    resultadoEsperado: "VENTA_CORRECTA",
    items: { create: [{ medicamentoId: acetaminofen.id, cantidadEsperada: 1 }] },
    pasos: {
      create: [
        {
          orden: 2,
          tipoAccion: "AGREGAR_A_VENTA",
          descripcion: "Agregó el medicamento a la venta (el stock disponible ya se ve junto al nombre, sin necesidad de un botón aparte)",
          parametros: { medicamentoId: acetaminofen.id },
          peso: 1,
        },
        { orden: 3, tipoAccion: "COMPLETAR_VENTA", descripcion: "Completó la venta", peso: 2 },
      ],
    },
  });

  // 2. María Gómez / Amoxicilina — sin receta, cédula entregada, no encontrada online, alérgica a penicilina
  await crearEscenarioSiNoExiste("María Gómez pide Amoxicilina", {
    titulo: "María Gómez pide Amoxicilina",
    descripcion:
      "María Gómez llega a la farmacia pidiendo Amoxicilina para una infección. No trae receta médica en mano, solo dice que 'el médico se la mandó por teléfono'. Antes de vender, revisa su ficha de paciente y valida su identidad.",
    descripcionDificil: "María Gómez pide Amoxicilina. No trae receta física.",
    pacienteId: maria.id,
    resultadoEsperado: "RECHAZO_CORRECTO",
    actitudCedula: ActitudCedula.ENTREGA,
    items: { create: [{ medicamentoId: amoxicilina.id, cantidadEsperada: 1 }] },
    pasos: {
      create: [
        {
          orden: 2,
          tipoAccion: "SOLICITAR_CEDULA",
          descripcion: "Solicitó la cédula antes que nada para validar la identidad",
          peso: 1,
        },
        {
          orden: 3,
          tipoAccion: "VER_FICHA_PACIENTE",
          descripcion: "Buscó su ficha en el sistema por la cédula (penicilina en su lista de alergias — hay que cruzarlo con la familia de la Amoxicilina)",
          peso: 2,
        },
        {
          orden: 4,
          tipoAccion: "BUSCAR_RECETA_ONLINE",
          descripcion: "Buscó la receta en línea (no se encontró ninguna a su nombre para este medicamento)",
          peso: 2,
        },
        {
          orden: 5,
          tipoAccion: "RECHAZAR_VENTA",
          descripcion: "Rechazó la venta señalando ambos motivos: sin receta válida y alergia",
          parametros: { motivos: ["sin_receta", "alergia"] },
          peso: 3,
        },
      ],
    },
  });

  // 3. Jorge Pérez / Amoxicilina — CON receta física, sin alergias
  await crearEscenarioSiNoExiste("Jorge Pérez pide Amoxicilina", {
    titulo: "Jorge Pérez pide Amoxicilina",
    descripcion:
      "Jorge Pérez llega con una receta médica física para Amoxicilina, indicada por una infección respiratoria. No tiene alergias registradas. Verifica todo y completa la venta.",
    descripcionDificil: "Jorge Pérez pide Amoxicilina. Trae una receta física.",
    pacienteId: jorge.id,
    resultadoEsperado: "VENTA_CORRECTA",
    recetaPresentada: true,
    recetaFisicaPacienteNombre: "Jorge Pérez",
    recetaFisicaMedicamento: "Amoxicilina 500mg",
    recetaFisicaPosologia: "1 cápsula cada 8 horas por 7 días",
    recetaFisicaCantidad: "21 cápsulas",
    recetaFisicaMedico: "Dra. Camila Rojas",
    recetaFisicaRegistroMedico: "RM-48213",
    recetaFisicaFechaEmision: new Date(hoy.getTime() - 1 * DIA),
    recetaFisicaDiasVigencia: 30,
    items: { create: [{ medicamentoId: amoxicilina.id, cantidadEsperada: 1 }] },
    pasos: {
      create: [
        {
          orden: 2,
          tipoAccion: "SOLICITAR_CEDULA",
          descripcion: "Solicitó la cédula para validar identidad, aunque ya traiga receta física",
          peso: 1,
        },
        {
          orden: 3,
          tipoAccion: "VER_FICHA_PACIENTE",
          descripcion: "Buscó su ficha en el sistema por la cédula (sin alergias registradas — Amoxicilina es penicilina, pero este paciente no tiene esa alergia)",
          peso: 2,
        },
        {
          orden: 4,
          tipoAccion: "VERIFICAR_RECETA",
          descripcion: "Verificó la receta médica presentada",
          peso: 2,
        },
        {
          orden: 5,
          tipoAccion: "AGREGAR_A_VENTA",
          descripcion: "Agregó el medicamento a la venta",
          parametros: { medicamentoId: amoxicilina.id },
          peso: 1,
        },
        { orden: 6, tipoAccion: "COMPLETAR_VENTA", descripcion: "Completó la venta", peso: 2 },
      ],
    },
  });

  // 4. Cliente anónimo / Tramadol — sin receta, cédula rehusada
  await crearEscenarioSiNoExiste("Cliente pide Tramadol", {
    titulo: "Cliente pide Tramadol",
    descripcion:
      "Un cliente pide Tramadol 'para un dolor fuerte de espalda' pero no presenta ninguna receta médica. Es un medicamento controlado. Al pedirle la cédula para intentar validar una receta electrónica, se niega a mostrarla. Decide qué hacer.",
    descripcionDificil: "Un cliente pide Tramadol. No trae receta física.",
    resultadoEsperado: "RECHAZO_CORRECTO",
    actitudCedula: ActitudCedula.SE_REHUSA,
    items: { create: [{ medicamentoId: tramadol.id, cantidadEsperada: 1 }] },
    pasos: {
      create: [
        {
          orden: 2,
          tipoAccion: "VERIFICAR_RECETA",
          descripcion: "Intentó verificar la receta médica física",
          peso: 1,
        },
        {
          orden: 3,
          tipoAccion: "SOLICITAR_CEDULA",
          descripcion: "Solicitó la cédula para intentar validar identidad (el cliente se negó a mostrarla)",
          peso: 2,
        },
        {
          orden: 4,
          tipoAccion: "RECHAZAR_VENTA",
          descripcion: "Rechazó la venta sin buscar atajos: sin receta y sin poder validar identidad",
          parametros: { motivos: ["sin_receta", "identidad_no_validada"] },
          peso: 3,
        },
      ],
    },
  });

  // 5. Pedro Martínez / Diazepam — CON receta física, controlado
  await crearEscenarioSiNoExiste("Pedro Martínez pide Diazepam", {
    titulo: "Pedro Martínez pide Diazepam",
    descripcion:
      "Pedro Martínez presenta una receta médica vigente para Diazepam, formulada por su médico tratante. Verifica todo el proceso y regístralo como corresponde a un medicamento controlado.",
    descripcionDificil: "Pedro Martínez pide Diazepam. Trae una receta física.",
    pacienteId: pedro.id,
    resultadoEsperado: "VENTA_CORRECTA",
    recetaPresentada: true,
    recetaFisicaPacienteNombre: "Pedro Martínez",
    recetaFisicaMedicamento: "Diazepam 10mg",
    recetaFisicaPosologia: "1 tableta al acostarse, por 10 días",
    recetaFisicaCantidad: "10 tabletas",
    recetaFisicaMedico: "Dr. Felipe Aranda",
    recetaFisicaRegistroMedico: "RM-51067",
    recetaFisicaFechaEmision: new Date(hoy.getTime() - 2 * DIA),
    recetaFisicaDiasVigencia: 15,
    recetaFisicaControlado: true,
    items: { create: [{ medicamentoId: diazepam.id, cantidadEsperada: 1 }] },
    pasos: {
      create: [
        {
          orden: 2,
          tipoAccion: "SOLICITAR_CEDULA",
          descripcion: "Solicitó la cédula para validar identidad antes de vender un controlado",
          peso: 1,
        },
        {
          orden: 3,
          tipoAccion: "VER_FICHA_PACIENTE",
          descripcion: "Buscó su ficha en el sistema por la cédula (sin alergias registradas)",
          peso: 1,
        },
        {
          orden: 4,
          tipoAccion: "VERIFICAR_RECETA",
          descripcion: "Verificó la receta médica presentada",
          peso: 2,
        },
        {
          orden: 5,
          tipoAccion: "REGISTRAR_CONTROLADO",
          descripcion: "Registró la venta como medicamento controlado",
          parametros: { medicamentoId: diazepam.id },
          peso: 2,
        },
        {
          orden: 6,
          tipoAccion: "AGREGAR_A_VENTA",
          descripcion: "Agregó el medicamento a la venta",
          parametros: { medicamentoId: diazepam.id },
          peso: 1,
        },
        { orden: 7, tipoAccion: "COMPLETAR_VENTA", descripcion: "Completó la venta", peso: 2 },
      ],
    },
  });

  // 6. Carlos Ruiz / Ibuprofeno — venta libre, alérgico a AINE
  await crearEscenarioSiNoExiste("Carlos Ruiz pide Ibuprofeno", {
    titulo: "Carlos Ruiz pide Ibuprofeno",
    descripcion:
      "Carlos Ruiz llega pidiendo Ibuprofeno para un dolor muscular. Revisa su ficha antes de vender, ya que tiene antecedentes de gastritis.",
    descripcionDificil: "Carlos Ruiz pide Ibuprofeno.",
    pacienteId: carlos.id,
    resultadoEsperado: "RECHAZO_CORRECTO",
    items: { create: [{ medicamentoId: ibuprofeno.id, cantidadEsperada: 1 }] },
    pasos: {
      create: [
        {
          orden: 2,
          tipoAccion: "SOLICITAR_CEDULA",
          descripcion: "Solicitó la cédula para validar identidad y poder revisar su ficha",
          peso: 1,
        },
        {
          orden: 3,
          tipoAccion: "VER_FICHA_PACIENTE",
          descripcion: "Buscó su ficha en el sistema por la cédula (alérgico a AINE — hay que reconocer que el Ibuprofeno pertenece a esa familia, aunque no pida receta)",
          peso: 3,
        },
        {
          orden: 4,
          tipoAccion: "RECHAZAR_VENTA",
          descripcion: "Rechazó la venta explicando el motivo",
          parametros: { motivos: ["alergia"] },
          peso: 2,
        },
      ],
    },
  });

  // 7. Lucía Fernández / Ciprofloxacina — sin receta, no encontrada online, alérgica a quinolonas (doble motivo)
  await crearEscenarioSiNoExiste("Lucía Fernández pide Ciprofloxacina", {
    titulo: "Lucía Fernández pide Ciprofloxacina",
    descripcion:
      "Lucía Fernández pide Ciprofloxacina para una infección urinaria. No trae receta física. Valida su identidad, revisa su ficha y busca si tiene alguna receta electrónica antes de decidir.",
    descripcionDificil: "Lucía Fernández pide Ciprofloxacina. No trae receta física.",
    pacienteId: lucia.id,
    resultadoEsperado: "RECHAZO_CORRECTO",
    actitudCedula: ActitudCedula.ENTREGA,
    items: { create: [{ medicamentoId: ciprofloxacina.id, cantidadEsperada: 1 }] },
    pasos: {
      create: [
        {
          orden: 2,
          tipoAccion: "SOLICITAR_CEDULA",
          descripcion: "Solicitó la cédula para validar identidad y poder revisar su ficha",
          peso: 1,
        },
        {
          orden: 3,
          tipoAccion: "VER_FICHA_PACIENTE",
          descripcion: "Buscó su ficha en el sistema por la cédula (alérgica a quinolonas — hay que reconocer que la Ciprofloxacina pertenece a esa familia)",
          peso: 2,
        },
        {
          orden: 4,
          tipoAccion: "BUSCAR_RECETA_ONLINE",
          descripcion: "Buscó la receta en línea (no se encontró ninguna a su nombre)",
          peso: 2,
        },
        {
          orden: 5,
          tipoAccion: "RECHAZAR_VENTA",
          descripcion: "Rechazó la venta señalando ambos motivos: sin receta válida y alergia",
          parametros: { motivos: ["alergia", "sin_receta"] },
          peso: 3,
        },
      ],
    },
  });

  // 8. Cliente anónimo / Ciprofloxacina — sin stock disponible
  await crearEscenarioSiNoExiste("Cliente pide Ciprofloxacina", {
    titulo: "Cliente pide Ciprofloxacina",
    descripcion:
      "Un cliente pide Ciprofloxacina. Antes de prometer nada, revisa si hay unidades disponibles en el inventario.",
    descripcionDificil: "Un cliente pide Ciprofloxacina.",
    resultadoEsperado: "RECHAZO_CORRECTO",
    items: { create: [{ medicamentoId: ciprofloxacina.id, cantidadEsperada: 1 }] },
    pasos: {
      create: [
        {
          orden: 2,
          tipoAccion: "RECHAZAR_VENTA",
          descripcion: "Vio la etiqueta de 'Sin stock' junto al medicamento e informó que no hay disponibilidad, sin completar la venta",
          parametros: { motivos: ["sin_stock"] },
          peso: 3,
        },
      ],
    },
  });

  // 9. Cliente anónimo / Omeprazol — lote vencido
  await crearEscenarioSiNoExiste("Cliente pide Omeprazol", {
    titulo: "Cliente pide Omeprazol",
    descripcion:
      "Un cliente pide Omeprazol. El lote disponible en el sistema tiene fecha de vencimiento próxima o pasada. Verifícalo antes de vender.",
    descripcionDificil: "Un cliente pide Omeprazol.",
    resultadoEsperado: "RECHAZO_CORRECTO",
    items: { create: [{ medicamentoId: omeprazol.id, cantidadEsperada: 1 }] },
    pasos: {
      create: [
        {
          orden: 2,
          tipoAccion: "RECHAZAR_VENTA",
          descripcion: "Vio la etiqueta de 'Lote vencido' junto al medicamento y rechazó la venta",
          parametros: { motivos: ["lote_vencido"] },
          peso: 3,
        },
      ],
    },
  });

  // 10. Diego Salazar / Tramadol — sin receta física, cédula entregada, online vigente (contraste con el caso 4)
  await crearEscenarioSiNoExiste("Diego Salazar pide Tramadol", {
    titulo: "Diego Salazar pide Tramadol",
    descripcion:
      "Diego Salazar pide Tramadol para un dolor fuerte de espalda. No trae receta física, pero al pedirle la cédula la entrega sin problema. Busca si tiene una receta electrónica registrada antes de decidir.",
    descripcionDificil: "Diego Salazar pide Tramadol. No trae receta física.",
    pacienteId: diego.id,
    resultadoEsperado: "VENTA_CORRECTA",
    actitudCedula: ActitudCedula.ENTREGA,
    items: { create: [{ medicamentoId: tramadol.id, cantidadEsperada: 1 }] },
    pasos: {
      create: [
        {
          orden: 2,
          tipoAccion: "SOLICITAR_CEDULA",
          descripcion: "Solicitó la cédula para validar identidad",
          peso: 1,
        },
        {
          orden: 3,
          tipoAccion: "VER_FICHA_PACIENTE",
          descripcion: "Buscó su ficha en el sistema por la cédula (sin alergias registradas)",
          peso: 1,
        },
        {
          orden: 4,
          tipoAccion: "BUSCAR_RECETA_ONLINE",
          descripcion: "Buscó la receta en línea y encontró una vigente para este medicamento",
          peso: 2,
        },
        {
          orden: 5,
          tipoAccion: "REGISTRAR_CONTROLADO",
          descripcion: "Registró la venta como medicamento controlado",
          parametros: { medicamentoId: tramadol.id },
          peso: 2,
        },
        {
          orden: 6,
          tipoAccion: "AGREGAR_A_VENTA",
          descripcion: "Agregó el medicamento a la venta",
          parametros: { medicamentoId: tramadol.id },
          peso: 1,
        },
        { orden: 7, tipoAccion: "COMPLETAR_VENTA", descripcion: "Completó la venta", peso: 2 },
      ],
    },
  });

  // 11. Ana Torres / Amoxicilina — sin receta física, online vigente
  await crearEscenarioSiNoExiste("Ana Torres pide Amoxicilina", {
    titulo: "Ana Torres pide Amoxicilina",
    descripcion:
      "Ana Torres pide Amoxicilina para una infección. No trae receta física, dice que se la formularon por telemedicina. Pídele la cédula y busca si tiene una receta electrónica registrada antes de decidir.",
    descripcionDificil: "Ana Torres pide Amoxicilina. No trae receta física.",
    pacienteId: ana.id,
    resultadoEsperado: "VENTA_CORRECTA",
    actitudCedula: ActitudCedula.ENTREGA,
    items: { create: [{ medicamentoId: amoxicilina.id, cantidadEsperada: 1 }] },
    pasos: {
      create: [
        {
          orden: 2,
          tipoAccion: "SOLICITAR_CEDULA",
          descripcion: "Solicitó la cédula para validar identidad",
          peso: 1,
        },
        {
          orden: 3,
          tipoAccion: "VER_FICHA_PACIENTE",
          descripcion: "Buscó su ficha en el sistema por la cédula (sin alergias registradas)",
          peso: 1,
        },
        {
          orden: 4,
          tipoAccion: "BUSCAR_RECETA_ONLINE",
          descripcion: "Buscó la receta en línea y encontró una vigente para este medicamento",
          peso: 2,
        },
        {
          orden: 5,
          tipoAccion: "AGREGAR_A_VENTA",
          descripcion: "Agregó el medicamento a la venta",
          parametros: { medicamentoId: amoxicilina.id },
          peso: 1,
        },
        { orden: 6, tipoAccion: "COMPLETAR_VENTA", descripcion: "Completó la venta", peso: 2 },
      ],
    },
  });

  // 12. Rafael Ibarra / Amoxicilina — sin receta física, cédula entregada, online no encontrada
  await crearEscenarioSiNoExiste("Rafael Ibarra pide Amoxicilina", {
    titulo: "Rafael Ibarra pide Amoxicilina",
    descripcion:
      "Rafael Ibarra pide Amoxicilina y asegura que un médico se la recetó. No trae receta física. Entrega su cédula sin problema, pero al buscar en el sistema no aparece ninguna receta electrónica a su nombre para este medicamento.",
    descripcionDificil: "Rafael Ibarra pide Amoxicilina. No trae receta física.",
    pacienteId: rafael.id,
    resultadoEsperado: "RECHAZO_CORRECTO",
    actitudCedula: ActitudCedula.ENTREGA,
    items: { create: [{ medicamentoId: amoxicilina.id, cantidadEsperada: 1 }] },
    pasos: {
      create: [
        {
          orden: 2,
          tipoAccion: "SOLICITAR_CEDULA",
          descripcion: "Solicitó la cédula para validar identidad",
          peso: 1,
        },
        {
          orden: 3,
          tipoAccion: "BUSCAR_RECETA_ONLINE",
          descripcion: "Buscó la receta en línea (no se encontró ninguna a su nombre)",
          peso: 2,
        },
        {
          orden: 4,
          tipoAccion: "RECHAZAR_VENTA",
          descripcion: "Rechazó la venta: 'no encontrado' no es lo mismo que 'autorizado'",
          parametros: { motivos: ["sin_receta"] },
          peso: 3,
        },
      ],
    },
  });

  // 13. Sofía Ramírez / Cefalexina — pide la cédula física en vez de confiar de palabra, pero la receta que
  // aparece en línea ya venció por fecha (aunque no esté agotada en cantidad) — debe rechazar igual.
  await crearEscenarioSiNoExiste("Sofía Ramírez pide Cefalexina", {
    titulo: "Sofía Ramírez pide Cefalexina",
    descripcion:
      "Sofía Ramírez pide Cefalexina para una infección. Al preguntarle su número de cédula, lo dice de memoria y se equivoca en un dígito — no asumas nada, pídele la cédula física para leer el número correcto antes de buscar su receta en línea. Revisa bien la fecha de vigencia, no solo si aparece un registro.",
    descripcionDificil: "Sofía Ramírez pide Cefalexina. No trae receta física.",
    pacienteId: sofia.id,
    resultadoEsperado: "RECHAZO_CORRECTO",
    actitudCedula: ActitudCedula.ENTREGA,
    items: { create: [{ medicamentoId: cefalexina.id, cantidadEsperada: 1 }] },
    pasos: {
      create: [
        {
          orden: 2,
          tipoAccion: "SOLICITAR_CEDULA",
          descripcion: "Pidió la cédula física en vez de confiar en el número dicho de palabra",
          peso: 2,
        },
        {
          orden: 3,
          tipoAccion: "VER_FICHA_PACIENTE",
          descripcion: "Buscó su ficha en el sistema con el número correcto (sin alergias registradas)",
          peso: 1,
        },
        {
          orden: 4,
          tipoAccion: "BUSCAR_RECETA_ONLINE",
          descripcion: "Buscó la receta en línea y revisó la fecha de vigencia, no solo si existía",
          peso: 2,
        },
        {
          orden: 5,
          tipoAccion: "RECHAZAR_VENTA",
          descripcion: "Rechazó la venta: la receta ya venció por fecha, aunque aparezca registrada",
          parametros: { motivos: ["receta_vencida"] },
          peso: 3,
        },
      ],
    },
  });

  // 14. Camilo Herrera / Cefalexina — online existe pero ya se redimió por completo
  await crearEscenarioSiNoExiste("Camilo Herrera pide Cefalexina", {
    titulo: "Camilo Herrera pide Cefalexina",
    descripcion:
      "Camilo Herrera pide Cefalexina. No trae receta física, entrega su cédula sin problema. Al buscar en línea aparece una receta a su nombre, pero revisa bien cuánta cantidad le queda disponible antes de decidir.",
    descripcionDificil: "Camilo Herrera pide Cefalexina. No trae receta física.",
    pacienteId: camilo.id,
    resultadoEsperado: "RECHAZO_CORRECTO",
    actitudCedula: ActitudCedula.ENTREGA,
    items: { create: [{ medicamentoId: cefalexina.id, cantidadEsperada: 1 }] },
    pasos: {
      create: [
        {
          orden: 2,
          tipoAccion: "SOLICITAR_CEDULA",
          descripcion: "Solicitó la cédula para validar identidad",
          peso: 1,
        },
        {
          orden: 3,
          tipoAccion: "BUSCAR_RECETA_ONLINE",
          descripcion: "Buscó la receta en línea y revisó cuánta cantidad quedaba disponible",
          peso: 2,
        },
        {
          orden: 4,
          tipoAccion: "RECHAZAR_VENTA",
          descripcion: "Rechazó la venta: la receta ya se redimió por completo, aunque seguía vigente por fecha",
          parametros: { motivos: ["receta_agotada"] },
          peso: 3,
        },
      ],
    },
  });

  // 15. Beatriz Núñez / Diazepam — receta física con una irregularidad, se debe escalar
  await crearEscenarioSiNoExiste("Beatriz Núñez pide Diazepam", {
    titulo: "Beatriz Núñez pide Diazepam",
    descripcion:
      "Beatriz Núñez presenta una receta física para Diazepam. Al revisarla con cuidado, algo no cuadra. No te corresponde decidir solo/a en estos casos: escala la situación a tu supervisor en vez de aprobar o rechazar la venta por tu cuenta.",
    descripcionDificil: "Beatriz Núñez pide Diazepam. Trae una receta física.",
    pacienteId: beatriz.id,
    resultadoEsperado: "RECHAZO_CORRECTO",
    recetaPresentada: true,
    recetaFisicaPacienteNombre: "Beatriz Núñez",
    recetaFisicaMedicamento: "Diazepam 10mg",
    recetaFisicaPosologia: "1 tableta al acostarse, por 10 días",
    recetaFisicaCantidad: "30 tabletas",
    recetaFisicaCantidadTachada: "10 tabletas",
    recetaFisicaMedico: "Dr. Felipe Aranda",
    recetaFisicaRegistroMedico: "RM-51067",
    recetaFisicaFechaEmision: new Date(hoy.getTime() - 3 * DIA),
    recetaFisicaDiasVigencia: 15,
    recetaFisicaControlado: true,
    items: { create: [{ medicamentoId: diazepam.id, cantidadEsperada: 1 }] },
    pasos: {
      create: [
        {
          orden: 2,
          tipoAccion: "SOLICITAR_CEDULA",
          descripcion: "Solicitó la cédula para validar identidad, aunque ya traiga receta física",
          peso: 1,
        },
        {
          orden: 3,
          tipoAccion: "VER_FICHA_PACIENTE",
          descripcion: "Buscó su ficha en el sistema por la cédula",
          peso: 1,
        },
        {
          orden: 4,
          tipoAccion: "VERIFICAR_RECETA",
          descripcion: "Verificó la receta física y notó la irregularidad",
          peso: 2,
        },
        {
          orden: 5,
          tipoAccion: "ESCALAR_A_SUPERVISOR",
          descripcion: "Escaló la decisión al supervisor en vez de decidir por su cuenta",
          peso: 3,
        },
      ],
    },
  });

  // ---------- Casos exclusivos de la prueba final (Turno) — no se practican sueltos ----------

  // T1 (fácil). Venta libre simple, sin trampas — el "calentamiento" del turno.
  await crearEscenarioSiNoExiste("Natalia Rendón pide Loratadina", {
    titulo: "Natalia Rendón pide Loratadina",
    descripcion: "Natalia Rendón pide Loratadina para una alergia estacional. No requiere receta. Atiéndela y completa la venta.",
    descripcionDificil: "Natalia Rendón pide Loratadina.",
    soloTurno: true,
    pacienteId: natalia.id,
    resultadoEsperado: "VENTA_CORRECTA",
    items: { create: [{ medicamentoId: loratadina.id, cantidadEsperada: 1 }] },
    pasos: {
      create: [
        {
          orden: 1,
          tipoAccion: "AGREGAR_A_VENTA",
          descripcion: "Agregó el medicamento a la venta",
          parametros: { medicamentoId: loratadina.id },
          peso: 1,
        },
        { orden: 2, tipoAccion: "COMPLETAR_VENTA", descripcion: "Completó la venta", peso: 2 },
      ],
    },
  });

  // T2 (fácil-medio). Alergia cruzada en venta libre, familia nueva (antihistamínico).
  await crearEscenarioSiNoExiste("Marta Suárez pide Loratadina", {
    titulo: "Marta Suárez pide Loratadina",
    descripcion:
      "Marta Suárez pide Loratadina para una alergia. Revisa su ficha antes de vender, ya que trae antecedentes registrados.",
    descripcionDificil: "Marta Suárez pide Loratadina.",
    soloTurno: true,
    pacienteId: marta.id,
    resultadoEsperado: "RECHAZO_CORRECTO",
    items: { create: [{ medicamentoId: loratadina.id, cantidadEsperada: 1 }] },
    pasos: {
      create: [
        {
          orden: 1,
          tipoAccion: "SOLICITAR_CEDULA",
          descripcion: "Solicitó la cédula para validar identidad y poder revisar su ficha",
          peso: 1,
        },
        {
          orden: 2,
          tipoAccion: "VER_FICHA_PACIENTE",
          descripcion: "Buscó su ficha en el sistema por la cédula (alérgica a antihistamínicos — hay que reconocer que la Loratadina pertenece a esa familia)",
          peso: 3,
        },
        {
          orden: 3,
          tipoAccion: "RECHAZAR_VENTA",
          descripcion: "Rechazó la venta explicando el motivo",
          parametros: { motivos: ["alergia"] },
          peso: 2,
        },
      ],
    },
  });

  // T3 (medio). Lote vencido, con un paciente de por medio (no un cliente anónimo).
  await crearEscenarioSiNoExiste("Julián Cárdenas pide Omeprazol", {
    titulo: "Julián Cárdenas pide Omeprazol",
    descripcion:
      "Julián Cárdenas pide Omeprazol para su gastritis. El lote disponible en el sistema tiene fecha de vencimiento próxima o pasada. Verifícalo antes de vender.",
    descripcionDificil: "Julián Cárdenas pide Omeprazol.",
    soloTurno: true,
    pacienteId: julian.id,
    resultadoEsperado: "RECHAZO_CORRECTO",
    items: { create: [{ medicamentoId: omeprazol.id, cantidadEsperada: 1 }] },
    pasos: {
      create: [
        {
          orden: 1,
          tipoAccion: "SOLICITAR_CEDULA",
          descripcion: "Solicitó la cédula para validar identidad",
          peso: 1,
        },
        {
          orden: 2,
          tipoAccion: "VER_FICHA_PACIENTE",
          descripcion: "Buscó su ficha en el sistema por la cédula",
          peso: 1,
        },
        {
          orden: 3,
          tipoAccion: "RECHAZAR_VENTA",
          descripcion: "Vio la etiqueta de 'Lote vencido' junto al medicamento y rechazó la venta",
          parametros: { motivos: ["lote_vencido"] },
          peso: 3,
        },
      ],
    },
  });

  // T4 (medio-alto). Controlado sin receta, cliente anónimo que se rehúsa a dar cédula.
  await crearEscenarioSiNoExiste("Cliente pide Diazepam", {
    titulo: "Cliente pide Diazepam",
    descripcion:
      "Un cliente pide Diazepam 'para dormir mejor' pero no presenta ninguna receta médica. Es un medicamento controlado. Al pedirle la cédula, se niega a mostrarla. Decide qué hacer.",
    descripcionDificil: "Un cliente pide Diazepam. No trae receta física.",
    soloTurno: true,
    resultadoEsperado: "RECHAZO_CORRECTO",
    actitudCedula: ActitudCedula.SE_REHUSA,
    items: { create: [{ medicamentoId: diazepam.id, cantidadEsperada: 1 }] },
    pasos: {
      create: [
        {
          orden: 1,
          tipoAccion: "VERIFICAR_RECETA",
          descripcion: "Intentó verificar la receta médica física",
          peso: 1,
        },
        {
          orden: 2,
          tipoAccion: "SOLICITAR_CEDULA",
          descripcion: "Solicitó la cédula para intentar validar identidad (el cliente se negó a mostrarla)",
          peso: 2,
        },
        {
          orden: 3,
          tipoAccion: "RECHAZAR_VENTA",
          descripcion: "Rechazó la venta sin buscar atajos: sin receta y sin poder validar identidad",
          parametros: { motivos: ["sin_receta", "identidad_no_validada"] },
          peso: 3,
        },
      ],
    },
  });

  // T5 (alto). Receta física con una irregularidad distinta — cierre del turno, el más exigente.
  await crearEscenarioSiNoExiste("Rodrigo Peña pide Tramadol", {
    titulo: "Rodrigo Peña pide Tramadol",
    descripcion:
      "Rodrigo Peña presenta una receta física para Tramadol. Al revisarla con cuidado, algo no cuadra. No te corresponde decidir solo/a en estos casos: escala la situación a tu supervisor en vez de aprobar o rechazar la venta por tu cuenta.",
    descripcionDificil: "Rodrigo Peña pide Tramadol. Trae una receta física.",
    soloTurno: true,
    pacienteId: rodrigo.id,
    resultadoEsperado: "RECHAZO_CORRECTO",
    recetaPresentada: true,
    recetaFisicaPacienteNombre: "Rodrigo Peña",
    recetaFisicaMedicamento: "Tramadol 50mg",
    recetaFisicaPosologia: "1 cápsula cada 12 horas por 5 días",
    recetaFisicaCantidad: "20 cápsulas",
    recetaFisicaCantidadTachada: "10 cápsulas",
    recetaFisicaMedico: "Dra. Patricia León",
    recetaFisicaRegistroMedico: "RM-39284",
    recetaFisicaFechaEmision: new Date(hoy.getTime() - 2 * DIA),
    recetaFisicaDiasVigencia: 15,
    recetaFisicaControlado: true,
    items: { create: [{ medicamentoId: tramadol.id, cantidadEsperada: 1 }] },
    pasos: {
      create: [
        {
          orden: 1,
          tipoAccion: "SOLICITAR_CEDULA",
          descripcion: "Solicitó la cédula para validar identidad, aunque ya traiga receta física",
          peso: 1,
        },
        {
          orden: 2,
          tipoAccion: "VER_FICHA_PACIENTE",
          descripcion: "Buscó su ficha en el sistema por la cédula",
          peso: 1,
        },
        {
          orden: 3,
          tipoAccion: "VERIFICAR_RECETA",
          descripcion: "Verificó la receta física y notó la irregularidad",
          peso: 2,
        },
        {
          orden: 4,
          tipoAccion: "ESCALAR_A_SUPERVISOR",
          descripcion: "Escaló la decisión al supervisor en vez de decidir por su cuenta",
          peso: 3,
        },
      ],
    },
  });

  // ---------- Turno: "prueba final" con 5 casos seguidos y un solo pool de 3 vidas ----------
  // Los 5 casos son exclusivos del turno (soloTurno: true) — no se practican sueltos antes,
  // para que la prueba final no sea literalmente lo mismo que ya resolvieron.
  const tituloTurno = "Turno completo: 5 clientes seguidos";
  const turnoExistente = await prisma.turno.findFirst({ where: { titulo: tituloTurno } });
  if (!turnoExistente) {
    const titulosEnOrden = [
      "Natalia Rendón pide Loratadina",
      "Marta Suárez pide Loratadina",
      "Julián Cárdenas pide Omeprazol",
      "Cliente pide Diazepam",
      "Rodrigo Peña pide Tramadol",
    ];
    const escenariosDelTurno = await Promise.all(
      titulosEnOrden.map((titulo) => prisma.escenario.findFirstOrThrow({ where: { titulo } }))
    );
    const turno = await prisma.turno.create({
      data: {
        moduloId: moduloFarmacia.id,
        titulo: tituloTurno,
        descripcion:
          "Atiende 5 clientes seguidos, uno detrás de otro, con las mismas 3 vidas de principio a fin — sin resetear entre casos. Son casos nuevos, distintos a los que ya practicaste. Así se siente el desgaste de un turno real.",
        umbralDesbloqueo: 70,
        requiereDesbloqueo: true, // solo aparece cuando el estudiante pasó los 15 casos normales con ≥70%
      },
    });
    await prisma.turnoItem.createMany({
      data: escenariosDelTurno.map((esc, i) => ({ turnoId: turno.id, escenarioId: esc.id, orden: i })),
    });
    console.log("Turno creado:", tituloTurno, "-", turno.id);
  } else {
    console.log("Ya existe, se omite:", tituloTurno);
  }

  // Asegura recetaPresentada correcto aunque el escenario ya existiera de una corrida previa del seed.
  await prisma.escenarioFarmacia.updateMany({
    where: { escenario: { titulo: "Jorge Pérez pide Amoxicilina" } },
    data: { recetaPresentada: true },
  });
  await prisma.escenarioFarmacia.updateMany({
    where: { escenario: { titulo: "Pedro Martínez pide Diazepam" } },
    data: { recetaPresentada: true },
  });

  console.log("Fecha usada como referencia para vencimientos:", { enElPasado, enElFuturo });

  // ========== Módulo Enfermería (piloto) ==========
  const moduloEnfermeria = await prisma.modulo.upsert({
    where: { slug: "enfermeria" },
    update: {},
    create: {
      slug: "enfermeria",
      nombre: "Enfermería",
      descripcion: "Simulador de administración segura de medicamentos",
      colorTema: "#059669",
    },
  });

  // Matricula al estudiante de prueba y al admin en ambos módulos.
  const admin = await prisma.usuario.findUniqueOrThrow({ where: { usuario: "admin" } });
  for (const usuarioId of [estudiante1.id, admin.id]) {
    for (const moduloId of [moduloFarmacia.id, moduloEnfermeria.id]) {
      await prisma.matricula.upsert({
        where: { usuarioId_moduloId: { usuarioId, moduloId } },
        update: {},
        create: { usuarioId, moduloId },
      });
    }
  }

  const pacienteRosa = await prisma.pacienteEnfermeria.upsert({
    where: { id: "pac-enf-rosa" },
    update: {},
    create: {
      id: "pac-enf-rosa",
      nombre: "Rosa Delgado",
      edad: 68,
      alergias: ["penicilina"],
      antecedentes: "Hipertensión, diabetes tipo 2",
      habitacion: "204-A",
    },
  });

  const pacienteEsteban = await prisma.pacienteEnfermeria.upsert({
    where: { id: "pac-enf-esteban" },
    update: {},
    create: {
      id: "pac-enf-esteban",
      nombre: "Esteban Molina",
      edad: 45,
      alergias: [],
      antecedentes: "Postoperatorio de apendicectomía",
      habitacion: "310-C",
    },
  });

  const ordenRosa = await prisma.ordenMedica.upsert({
    where: { id: "orden-enf-rosa-amoxi" },
    update: {},
    create: {
      id: "orden-enf-rosa-amoxi",
      pacienteId: pacienteRosa.id,
      medicamento: "Amoxicilina",
      dosis: "500mg",
      via: "Oral",
      frecuencia: "Cada 8 horas",
      medico: "Dr. Felipe Castaño",
      fechaEmision: enElPasado,
      fechaVigencia: enElFuturo,
    },
  });

  const ordenEsteban = await prisma.ordenMedica.upsert({
    where: { id: "orden-enf-esteban-tramadol" },
    update: {},
    create: {
      id: "orden-enf-esteban-tramadol",
      pacienteId: pacienteEsteban.id,
      medicamento: "Tramadol",
      dosis: "50mg",
      via: "Intravenosa",
      frecuencia: "Cada 6 horas",
      medico: "Dra. Natalia Vergara",
      fechaEmision: enElPasado,
      fechaVigencia: enElFuturo,
    },
  });

  async function crearEscenarioEnfermeriaSiNoExiste(
    titulo: string,
    datos: {
      descripcion: string;
      descripcionDificil?: string;
      soloTurno?: boolean;
      resultadoEsperado: string;
      pacienteId: string;
      ordenMedicaId?: string;
      contexto?: string;
      pasos: {
        orden: number;
        tipoAccion: string;
        descripcion: string;
        parametros?: object;
        peso?: number;
      }[];
    }
  ) {
    const existe = await prisma.escenario.findFirst({ where: { titulo } });
    if (existe) {
      console.log("Ya existe, se omite:", titulo);
      return;
    }
    const { pacienteId, ordenMedicaId, contexto, pasos, ...generico } = datos;
    const creado = await prisma.escenario.create({
      data: {
        ...generico,
        titulo,
        moduloId: moduloEnfermeria.id,
        pasos: { create: pasos },
        enfermeria: { create: { pacienteId, ordenMedicaId, contexto } },
      },
    });
    console.log("Escenario creado:", titulo, "-", creado.id);
  }

  await crearEscenarioEnfermeriaSiNoExiste("Tutorial: cómo usar el simulador de Enfermería", {
    descripcion:
      "Este caso no es real, es para que conozcas la pantalla antes de resolver los casos que sí califican: verifica la ficha del paciente, la orden médica y registra la administración.",
    resultadoEsperado: "ADMINISTRAR_CORRECTO",
    pacienteId: pacienteRosa.id,
    ordenMedicaId: ordenRosa.id,
    contexto: "Turno de la mañana. Rosa está estable y pide su medicamento de rutina.",
    pasos: [
      { orden: 1, tipoAccion: "VER_FICHA_PACIENTE", descripcion: "Consultó la ficha del paciente", peso: 1 },
      { orden: 2, tipoAccion: "VERIFICAR_ORDEN_MEDICA", descripcion: "Verificó la orden médica vigente", peso: 1 },
      { orden: 3, tipoAccion: "VERIFICAR_ALERGIA", descripcion: "Revisó alergias registradas", peso: 1 },
      {
        orden: 4,
        tipoAccion: "REGISTRAR_ADMINISTRACION",
        descripcion: "Registró la administración correcta (medicamento, dosis y vía según la orden)",
        parametros: { medicamento: "Amoxicilina", dosis: "500mg", via: "Oral" },
        peso: 2,
      },
    ],
  });

  await crearEscenarioEnfermeriaSiNoExiste("Rosa Delgado — administración de Amoxicilina", {
    descripcion:
      "Rosa Delgado (204-A) solicita su medicamento de las 2pm. Verifica su orden médica y sus alergias antes de administrar.",
    descripcionDificil: "Rosa Delgado pide su medicamento de las 2pm.",
    resultadoEsperado: "ADMINISTRAR_CORRECTO",
    pacienteId: pacienteRosa.id,
    ordenMedicaId: ordenRosa.id,
    contexto: "Rosa es alérgica a la penicilina, pero su orden es de Amoxicilina — un antibiótico distinto, sin reacción cruzada relevante en este caso.",
    pasos: [
      { orden: 1, tipoAccion: "VERIFICAR_ORDEN_MEDICA", descripcion: "Verificó la orden médica vigente", peso: 2 },
      { orden: 2, tipoAccion: "VERIFICAR_ALERGIA", descripcion: "Revisó alergias registradas", peso: 2 },
      {
        orden: 3,
        tipoAccion: "REGISTRAR_ADMINISTRACION",
        descripcion: "Registró la administración correcta (Amoxicilina 500mg oral)",
        parametros: { medicamento: "Amoxicilina", dosis: "500mg", via: "Oral" },
        peso: 3,
      },
    ],
  });

  await crearEscenarioEnfermeriaSiNoExiste("Esteban Molina — dosis distinta a la orden", {
    descripcion:
      "Esteban Molina (310-C) está en postoperatorio y su familiar pide 'algo más fuerte para el dolor'. Su orden autoriza Tramadol 50mg IV cada 6 horas.",
    descripcionDificil: "Esteban Molina pide un analgésico más fuerte del que indica su orden.",
    resultadoEsperado: "NO_ADMINISTRAR_CORRECTO",
    pacienteId: pacienteEsteban.id,
    ordenMedicaId: ordenEsteban.id,
    contexto: "El familiar insiste, pero administrar una dosis mayor a la ordenada sin autorización médica es un error de los '5 correctos'.",
    pasos: [
      { orden: 1, tipoAccion: "VERIFICAR_ORDEN_MEDICA", descripcion: "Verificó la orden médica vigente", peso: 2 },
      {
        orden: 2,
        tipoAccion: "RECHAZAR_ADMINISTRACION",
        descripcion: "Rechazó administrar una dosis distinta a la ordenada",
        peso: 2,
      },
      {
        orden: 3,
        tipoAccion: "ESCALAR_A_SUPERVISOR",
        descripcion: "Escaló la solicitud del familiar al médico/supervisor en vez de decidir por su cuenta",
        peso: 3,
      },
    ],
  });

  // ---------- Módulo Primera Infancia ----------
  const moduloInfancia = await prisma.modulo.upsert({
    where: { slug: "primera_infancia" },
    update: {},
    create: {
      slug: "primera_infancia",
      nombre: "Primera Infancia",
      descripcion: "Simulador de valoración del desarrollo infantil",
      colorTema: "#b45309",
    },
  });

  for (const usuarioId of [estudiante1.id, admin.id]) {
    await prisma.matricula.upsert({
      where: { usuarioId_moduloId: { usuarioId, moduloId: moduloInfancia.id } },
      update: {},
      create: { usuarioId, moduloId: moduloInfancia.id },
    });
  }

  function fechaNacimientoHace(meses: number): Date {
    const f = new Date(hoy);
    f.setMonth(f.getMonth() - meses);
    return f;
  }

  async function crearNinoSiNoExiste(
    id: string,
    datos: {
      nombre: string;
      edadMeses: number;
      semanasGestacionNacimiento?: number;
      cuidadorNombre?: string;
      antecedentes?: string;
      esquemaVacunacionAlDia?: boolean;
      vacunasPendientes?: string[];
      registros?: { diasAtras: number; pesoKg: number; tallaCm: number }[];
    }
  ) {
    const nino = await prisma.nino.upsert({
      where: { id },
      update: {},
      create: {
        id,
        nombre: datos.nombre,
        fechaNacimiento: fechaNacimientoHace(datos.edadMeses),
        semanasGestacionNacimiento: datos.semanasGestacionNacimiento,
        cuidadorNombre: datos.cuidadorNombre,
        antecedentes: datos.antecedentes,
        esquemaVacunacionAlDia: datos.esquemaVacunacionAlDia ?? true,
        vacunasPendientes: datos.vacunasPendientes ?? [],
      },
    });
    if (datos.registros) {
      for (const r of datos.registros) {
        await prisma.registroCrecimiento.upsert({
          where: { id: `${id}-reg-${r.diasAtras}` },
          update: {},
          create: {
            id: `${id}-reg-${r.diasAtras}`,
            ninoId: nino.id,
            fecha: new Date(hoy.getTime() - r.diasAtras * DIA),
            pesoKg: r.pesoKg,
            tallaCm: r.tallaCm,
          },
        });
      }
    }
    return nino;
  }

  const ninoSofia = await crearNinoSiNoExiste("nino-sofia", {
    nombre: "Sofía Ramírez",
    edadMeses: 6,
    cuidadorNombre: "Marcela Ramírez (madre)",
    antecedentes: "Embarazo y parto sin complicaciones.",
  });

  const ninoJuan = await crearNinoSiNoExiste("nino-juan", {
    nombre: "Juan Esteban Torres",
    edadMeses: 18,
    cuidadorNombre: "Diana Torres (madre)",
    antecedentes: "Ninguno relevante.",
  });

  const ninoCamila = await crearNinoSiNoExiste("nino-camila", {
    nombre: "Camila Rojas",
    edadMeses: 18,
    cuidadorNombre: "Padre y abuela",
    antecedentes: "Hermano mayor caminó a los 20 meses.",
  });

  const ninoMateo = await crearNinoSiNoExiste("nino-mateo", {
    nombre: "Mateo Higuera",
    edadMeses: 10,
    cuidadorNombre: "Laura Higuera (madre)",
    antecedentes: "Lactancia suspendida hace 2 meses.",
    registros: [
      { diasAtras: 60, pesoKg: 8.2, tallaCm: 68 },
      { diasAtras: 5, pesoKg: 7.9, tallaCm: 69 },
    ],
  });

  const ninoValentina = await crearNinoSiNoExiste("nino-valentina", {
    nombre: "Valentina Suárez",
    edadMeses: 24,
    cuidadorNombre: "Cuidadora primeriza, muy ansiosa",
    antecedentes: "Sin antecedentes de riesgo.",
  });

  const ninoSamuel = await crearNinoSiNoExiste("nino-samuel", {
    nombre: "Samuel Castaño",
    edadMeses: 30,
    cuidadorNombre: "Padres",
    antecedentes: "Sin antecedentes perinatales relevantes.",
  });

  const ninoEmma = await crearNinoSiNoExiste("nino-emma", {
    nombre: "Emma Gutiérrez",
    edadMeses: 8,
    semanasGestacionNacimiento: 32,
    cuidadorNombre: "Padres",
    antecedentes: "Prematura, 3 semanas en UCI neonatal.",
  });

  const ninoNicolas = await crearNinoSiNoExiste("nino-nicolas", {
    nombre: "Nicolás Peña",
    edadMeses: 12,
    cuidadorNombre: "Abuela materna",
    antecedentes: "Se han cambiado de ciudad dos veces este año.",
    esquemaVacunacionAlDia: false,
    vacunasPendientes: ["Triple viral", "Refuerzo DPT"],
  });

  const ninoIsabella = await crearNinoSiNoExiste("nino-isabella", {
    nombre: "Isabella Marín",
    edadMeses: 14,
    cuidadorNombre: "Padrastro (cuidador principal reportado)",
    antecedentes: "Consulta previa hace 1 mes por hematomas en brazo, sin seguimiento.",
  });

  const ninoTomas = await crearNinoSiNoExiste("nino-tomas", {
    nombre: "Tomás Vélez",
    edadMeses: 20,
    cuidadorNombre: "Jardín infantil comunitario 'Semillitas'",
    antecedentes: "Asiste al hogar comunitario desde los 8 meses.",
  });

  async function crearEscenarioInfanciaSiNoExiste(
    titulo: string,
    datos: {
      descripcion: string;
      descripcionDificil?: string;
      soloTurno?: boolean;
      resultadoEsperado: string;
      ninoId: string;
      contexto?: string;
      hitosEsperados: { dominio: string; hito: string }[];
      pasos: {
        orden: number;
        tipoAccion: string;
        descripcion: string;
        parametros?: object;
        peso?: number;
      }[];
    }
  ) {
    const existe = await prisma.escenario.findFirst({ where: { titulo } });
    if (existe) {
      console.log("Ya existe, se omite:", titulo);
      return;
    }
    const { ninoId, contexto, hitosEsperados, pasos, ...generico } = datos;
    const creado = await prisma.escenario.create({
      data: {
        ...generico,
        titulo,
        moduloId: moduloInfancia.id,
        pasos: { create: pasos },
        infancia: { create: { ninoId, contexto, hitosEsperados } },
      },
    });
    console.log("Escenario creado:", titulo, "-", creado.id);
  }

  await crearEscenarioInfanciaSiNoExiste("Tutorial: cómo usar el simulador de Primera Infancia", {
    descripcion:
      "Este caso no es real, es para que conozcas la ficha de valoración antes de resolver los casos que sí califican: consulta la ficha, valora los hitos y registra el seguimiento.",
    resultadoEsperado: "SEGUIMIENTO_NORMAL",
    ninoId: ninoSofia.id,
    contexto: "Control de crecimiento y desarrollo de rutina a los 6 meses.",
    hitosEsperados: [
      { dominio: "Motricidad gruesa", hito: "Sostén cefálico firme" },
      { dominio: "Lenguaje", hito: "Balbucea (ej. 'bababa')" },
    ],
    pasos: [
      { orden: 1, tipoAccion: "VER_FICHA_NINO", descripcion: "Consultó la ficha del niño", peso: 1 },
      {
        orden: 2,
        tipoAccion: "VALORAR_HITO",
        descripcion: "Valoró el sostén cefálico",
        parametros: { dominio: "Motricidad gruesa", hito: "Sostén cefálico firme" },
        peso: 1,
      },
      {
        orden: 3,
        tipoAccion: "VALORAR_HITO",
        descripcion: "Valoró el balbuceo",
        parametros: { dominio: "Lenguaje", hito: "Balbucea (ej. 'bababa')" },
        peso: 1,
      },
      { orden: 4, tipoAccion: "REGISTRAR_SEGUIMIENTO", descripcion: "Registró seguimiento normal", peso: 2 },
    ],
  });

  await crearEscenarioInfanciaSiNoExiste("Juan Esteban Torres — sin palabras a los 18 meses", {
    descripcion:
      "Juan Esteban (18 meses) llega a control. Su madre cuenta que aún no dice ninguna palabra con intención comunicativa, solo balbucea.",
    descripcionDificil: "Juan Esteban (18 meses) todavía no dice palabras con intención comunicativa.",
    resultadoEsperado: "DERIVAR_ESPECIALISTA",
    ninoId: ninoJuan.id,
    contexto: "Sin antecedentes de riesgo, pero el retraso de lenguaje a esta edad es una señal de alarma que no debe esperarse a que 'madure sola'.",
    hitosEsperados: [{ dominio: "Lenguaje", hito: "Dice al menos 3 palabras con intención comunicativa" }],
    pasos: [
      { orden: 1, tipoAccion: "VER_FICHA_NINO", descripcion: "Consultó la ficha del niño", peso: 1 },
      {
        orden: 2,
        tipoAccion: "VALORAR_HITO",
        descripcion: "Valoró el hito de lenguaje esperado (ausente)",
        parametros: { dominio: "Lenguaje", hito: "Dice al menos 3 palabras con intención comunicativa" },
        peso: 2,
      },
      {
        orden: 3,
        tipoAccion: "DETECTAR_SEÑAL_ALARMA",
        descripcion: "Identificó la ausencia de lenguaje como señal de alarma",
        parametros: { motivos: ["sin_palabras_18m"] },
        peso: 2,
      },
      { orden: 4, tipoAccion: "DERIVAR_A_ESPECIALISTA", descripcion: "Derivó a fonoaudiología/pediatría", peso: 3 },
    ],
  });

  await crearEscenarioInfanciaSiNoExiste("Camila Rojas — no camina a los 18 meses", {
    descripcion:
      "Camila (18 meses) no camina sola todavía. Su papá comenta: 'no se preocupe, el hermano también caminó tarde'.",
    descripcionDificil: "Camila (18 meses) no camina sola. El papá minimiza la observación.",
    resultadoEsperado: "DERIVAR_ESPECIALISTA",
    ninoId: ninoCamila.id,
    contexto: "El antecedente familiar no descarta un retraso motor real: a los 18 meses la mayoría de niños ya camina solo.",
    hitosEsperados: [{ dominio: "Motricidad gruesa", hito: "Camina solo sin apoyo" }],
    pasos: [
      { orden: 1, tipoAccion: "VER_FICHA_NINO", descripcion: "Consultó la ficha del niño", peso: 1 },
      {
        orden: 2,
        tipoAccion: "VALORAR_HITO",
        descripcion: "Valoró la marcha independiente (ausente)",
        parametros: { dominio: "Motricidad gruesa", hito: "Camina solo sin apoyo" },
        peso: 2,
      },
      {
        orden: 3,
        tipoAccion: "DETECTAR_SEÑAL_ALARMA",
        descripcion: "No se dejó guiar por el comentario del padre y marcó la señal de alarma",
        parametros: { motivos: ["no_camina_18m"] },
        peso: 2,
      },
      { orden: 4, tipoAccion: "DERIVAR_A_ESPECIALISTA", descripcion: "Derivó a fisioterapia/pediatría", peso: 3 },
    ],
  });

  await crearEscenarioInfanciaSiNoExiste("Mateo Higuera — curva de peso descendente", {
    descripcion:
      "Mateo (10 meses) viene a control. Su último registro de peso está por debajo del anterior, y la lactancia se suspendió hace 2 meses.",
    descripcionDificil: "Mateo (10 meses) viene a control de rutina.",
    resultadoEsperado: "DERIVAR_ESPECIALISTA",
    ninoId: ninoMateo.id,
    contexto: "El peso bajó respecto al control anterior — hay que leer la tendencia, no solo el valor de hoy.",
    hitosEsperados: [{ dominio: "Motricidad gruesa", hito: "Se sienta sin apoyo" }],
    pasos: [
      { orden: 1, tipoAccion: "VER_FICHA_NINO", descripcion: "Consultó la ficha del niño", peso: 1 },
      { orden: 2, tipoAccion: "REGISTRAR_PESO_TALLA", descripcion: "Registró el peso y talla de hoy", peso: 1 },
      {
        orden: 3,
        tipoAccion: "DETECTAR_SEÑAL_ALARMA",
        descripcion: "Detectó la curva de peso descendente",
        parametros: { motivos: ["curva_peso_descendente"] },
        peso: 2,
      },
      { orden: 4, tipoAccion: "DERIVAR_A_ESPECIALISTA", descripcion: "Derivó a nutrición", peso: 3 },
    ],
  });

  await crearEscenarioInfanciaSiNoExiste("Valentina Suárez — cuidadora ansiosa, desarrollo normal", {
    descripcion:
      "Valentina (24 meses) tiene un desarrollo dentro de rango normal en la valoración. Su cuidadora, muy ansiosa, insiste en que 'algo anda mal' y pide una remisión urgente.",
    descripcionDificil: "La cuidadora de Valentina (24 meses) insiste en pedir una remisión urgente.",
    resultadoEsperado: "SEGUIMIENTO_NORMAL",
    ninoId: ninoValentina.id,
    contexto: "No hay hallazgos objetivos en la valoración. Derivar sin hallazgos clínicos sobrecarga el sistema y genera ansiedad innecesaria — corresponde educar a la cuidadora y programar el control de rutina.",
    hitosEsperados: [
      { dominio: "Lenguaje", hito: "Usa frases de 2-3 palabras" },
      { dominio: "Socioafectivo", hito: "Juega en paralelo con otros niños" },
    ],
    pasos: [
      { orden: 1, tipoAccion: "VER_FICHA_NINO", descripcion: "Consultó la ficha del niño", peso: 1 },
      {
        orden: 2,
        tipoAccion: "VALORAR_HITO",
        descripcion: "Valoró el lenguaje (presente)",
        parametros: { dominio: "Lenguaje", hito: "Usa frases de 2-3 palabras" },
        peso: 1,
      },
      {
        orden: 3,
        tipoAccion: "VALORAR_HITO",
        descripcion: "Valoró lo socioafectivo (presente)",
        parametros: { dominio: "Socioafectivo", hito: "Juega en paralelo con otros niños" },
        peso: 1,
      },
      {
        orden: 4,
        tipoAccion: "REGISTRAR_SEGUIMIENTO",
        descripcion: "Registró seguimiento normal en vez de derivar sin hallazgos",
        peso: 3,
      },
    ],
  });

  await crearEscenarioInfanciaSiNoExiste("Samuel Castaño — señales de alerta en interacción social", {
    descripcion:
      "Samuel (30 meses) casi no sostiene contacto visual y no participa en juego simbólico (no 'juega a que...'), aunque su motricidad es normal.",
    descripcionDificil: "Samuel (30 meses) evita el contacto visual y no juega de forma simbólica.",
    resultadoEsperado: "DERIVAR_ESPECIALISTA",
    ninoId: ninoSamuel.id,
    contexto: "La combinación de ausencia de contacto visual y de juego simbólico a esta edad es una señal de alerta del desarrollo que requiere valoración especializada.",
    hitosEsperados: [
      { dominio: "Socioafectivo", hito: "Sostiene contacto visual" },
      { dominio: "Cognición", hito: "Realiza juego simbólico" },
    ],
    pasos: [
      { orden: 1, tipoAccion: "VER_FICHA_NINO", descripcion: "Consultó la ficha del niño", peso: 1 },
      {
        orden: 2,
        tipoAccion: "VALORAR_HITO",
        descripcion: "Valoró el contacto visual (ausente)",
        parametros: { dominio: "Socioafectivo", hito: "Sostiene contacto visual" },
        peso: 1,
      },
      {
        orden: 3,
        tipoAccion: "VALORAR_HITO",
        descripcion: "Valoró el juego simbólico (ausente)",
        parametros: { dominio: "Cognición", hito: "Realiza juego simbólico" },
        peso: 1,
      },
      {
        orden: 4,
        tipoAccion: "DETECTAR_SEÑAL_ALARMA",
        descripcion: "Registró ambas señales de alerta",
        parametros: { motivos: ["sin_contacto_visual", "sin_juego_simbolico"] },
        peso: 2,
      },
      { orden: 5, tipoAccion: "DERIVAR_A_ESPECIALISTA", descripcion: "Derivó a valoración especializada", peso: 3 },
    ],
  });

  await crearEscenarioInfanciaSiNoExiste("Emma Gutiérrez — valoración con edad corregida", {
    descripcion:
      "Emma tiene 8 meses de edad cronológica pero nació prematura, a las 32 semanas de gestación. Antes de valorar sus hitos, hay que calcular su edad corregida.",
    descripcionDificil: "Emma tiene 8 meses. Nació a las 32 semanas de gestación.",
    resultadoEsperado: "SEGUIMIENTO_NORMAL",
    ninoId: ninoEmma.id,
    contexto: "Con edad corregida (~5-6 meses), el sostén cefálico y el alcance de objetos son hitos esperados y están presentes: el desarrollo es normal para su edad corregida, aunque parecería 'atrasado' si se usara la edad cronológica.",
    hitosEsperados: [{ dominio: "Motricidad gruesa", hito: "Sostén cefálico firme" }],
    pasos: [
      { orden: 1, tipoAccion: "VER_FICHA_NINO", descripcion: "Consultó la ficha del niño", peso: 1 },
      { orden: 2, tipoAccion: "CALCULAR_EDAD_CORREGIDA", descripcion: "Calculó la edad corregida antes de valorar", peso: 2 },
      {
        orden: 3,
        tipoAccion: "VALORAR_HITO",
        descripcion: "Valoró el hito según edad corregida (presente)",
        parametros: { dominio: "Motricidad gruesa", hito: "Sostén cefálico firme" },
        peso: 2,
      },
      { orden: 4, tipoAccion: "REGISTRAR_SEGUIMIENTO", descripcion: "Registró seguimiento normal", peso: 2 },
    ],
  });

  await crearEscenarioInfanciaSiNoExiste("Nicolás Peña — esquema de vacunación incompleto", {
    descripcion:
      "Nicolás (12 meses) tiene un desarrollo normal, pero la familia se ha mudado dos veces y no está claro si está al día con las vacunas.",
    descripcionDificil: "Nicolás (12 meses) viene a control de rutina.",
    resultadoEsperado: "DERIVAR_ESPECIALISTA",
    ninoId: ninoNicolas.id,
    contexto: "Aunque el desarrollo esté bien, verificar y remitir el esquema de vacunación pendiente es parte obligatoria del control — no se puede dar de alta sin resolverlo.",
    hitosEsperados: [{ dominio: "Motricidad gruesa", hito: "Se pone de pie con apoyo" }],
    pasos: [
      { orden: 1, tipoAccion: "VER_FICHA_NINO", descripcion: "Consultó la ficha del niño", peso: 1 },
      {
        orden: 2,
        tipoAccion: "VALORAR_HITO",
        descripcion: "Valoró el hito motor (presente)",
        parametros: { dominio: "Motricidad gruesa", hito: "Se pone de pie con apoyo" },
        peso: 1,
      },
      {
        orden: 3,
        tipoAccion: "VERIFICAR_ESQUEMA_VACUNACION",
        descripcion: "Verificó el esquema de vacunación y encontró vacunas pendientes",
        peso: 2,
      },
      {
        orden: 4,
        tipoAccion: "DERIVAR_A_ESPECIALISTA",
        descripcion: "Remitió al programa de vacunación para ponerse al día",
        peso: 3,
      },
    ],
  });

  await crearEscenarioInfanciaSiNoExiste("Isabella Marín — señales de negligencia", {
    descripcion:
      "Isabella (14 meses) llega con higiene deficiente persistente y hematomas en el brazo sin una explicación coherente por parte del cuidador. Ya hubo una consulta similar hace un mes sin seguimiento.",
    descripcionDificil: "Isabella (14 meses) presenta higiene deficiente y hematomas sin explicación clara.",
    resultadoEsperado: "ACTIVAR_RUTA_PROTECCION",
    ninoId: ninoIsabella.id,
    contexto: "La combinación de higiene deficiente, hematomas no justificados y miedo excesivo al cuidador, más el antecedente sin seguimiento, obliga a activar la ruta de protección — no basta con derivar a un especialista clínico.",
    hitosEsperados: [{ dominio: "Motricidad gruesa", hito: "Camina solo sin apoyo" }],
    pasos: [
      { orden: 1, tipoAccion: "VER_FICHA_NINO", descripcion: "Consultó la ficha del niño", peso: 1 },
      {
        orden: 2,
        tipoAccion: "DETECTAR_SEÑAL_ALARMA",
        descripcion: "Identificó las señales de negligencia/maltrato",
        parametros: { motivos: ["higiene_deficiente", "hematomas_no_justificados", "miedo_excesivo_adulto"] },
        peso: 3,
      },
      {
        orden: 3,
        tipoAccion: "ACTIVAR_RUTA_PROTECCION",
        descripcion: "Activó la ruta de protección en vez de solo derivar clínicamente",
        peso: 4,
      },
    ],
  });

  await crearEscenarioInfanciaSiNoExiste("Tomás Vélez — vínculo socioafectivo en hogar comunitario", {
    descripcion:
      "Tomás (20 meses) asiste a un hogar comunitario desde los 8 meses. Se observa su vínculo de apego y su regulación emocional ante la separación de su cuidadora al llegar.",
    descripcionDificil: "Tomás (20 meses) asiste a un hogar comunitario. Se observa su comportamiento al llegar.",
    resultadoEsperado: "SEGUIMIENTO_NORMAL",
    ninoId: ninoTomas.id,
    contexto: "Tomás busca a su cuidadora al despedirse pero se calma rápido y explora el entorno: apego seguro, dentro de lo esperado para su edad y contexto.",
    hitosEsperados: [{ dominio: "Socioafectivo", hito: "Se calma tras la separación y explora el entorno" }],
    pasos: [
      { orden: 1, tipoAccion: "VER_FICHA_NINO", descripcion: "Consultó la ficha del niño", peso: 1 },
      {
        orden: 2,
        tipoAccion: "VALORAR_HITO",
        descripcion: "Valoró el vínculo socioafectivo (presente)",
        parametros: { dominio: "Socioafectivo", hito: "Se calma tras la separación y explora el entorno" },
        peso: 2,
      },
      { orden: 3, tipoAccion: "REGISTRAR_SEGUIMIENTO", descripcion: "Registró seguimiento normal", peso: 3 },
    ],
  });

  // ==================== Módulo Dispensación (servicio farmacéutico) ====================
  // Herramienta de práctica libre, sin nota: el estudiante atiende pacientes que llegan con
  // fórmulas, busca al paciente y coteja contra lo autorizado antes de entregar.
  const moduloDispensacion = await prisma.modulo.upsert({
    where: { slug: "dispensacion" },
    update: { tipo: "SIMULADOR", rutaSimulador: "/panel/dispensacion" },
    create: {
      slug: "dispensacion",
      nombre: "Dispensación",
      descripcion: "Simulador de dispensación en servicio farmacéutico (medicamentos por fórmula, sin costo)",
      colorTema: "#0f766e",
      tipo: "SIMULADOR",
      rutaSimulador: "/panel/dispensacion",
    },
  });

  for (const usuarioId of [estudiante1.id, admin.id]) {
    await prisma.matricula.upsert({
      where: { usuarioId_moduloId: { usuarioId, moduloId: moduloDispensacion.id } },
      update: {},
      create: { usuarioId, moduloId: moduloDispensacion.id },
    });
  }

  // Pacientes propios de la práctica de dispensación (cédulas 12000000xx).
  async function pacienteDisp(cedula: string, nombre: string, edad: number, alergias: string[], antecedentes: string) {
    return prisma.paciente.upsert({
      where: { cedula },
      update: { nombre, edad, alergias, antecedentes },
      create: { cedula, nombre, edad, alergias, antecedentes },
    });
  }
  const dGloria = await pacienteDisp("1200000001", "Gloria Herrera", 41, [], "Ninguno relevante");
  const dHernan = await pacienteDisp("1200000002", "Hernán Díaz", 58, [], "Gastritis crónica, HTA");
  const dRocio = await pacienteDisp("1200000003", "Rocío Vargas", 33, [], "Infección urinaria en tratamiento");
  const dMiguel = await pacienteDisp("1200000004", "Miguel Ángel Soto", 47, ["penicilina"], "Rinitis alérgica");
  const dEsperanza = await pacienteDisp("1200000005", "Esperanza Rojas", 62, [], "Lumbalgia crónica, ansiedad");
  const dAlvaro = await pacienteDisp("1200000006", "Álvaro Mejía", 55, [], "Ninguno relevante");
  const dispPacientes = [dGloria, dHernan, dRocio, dMiguel, dEsperanza, dAlvaro];

  // Limpieza para re-siembra (respeta las FK: primero sesiones/entregas, luego casos y autorizaciones).
  await prisma.sesionDispensacion.deleteMany({});
  await prisma.casoDispensacion.deleteMany({});
  await prisma.recetaElectronica.deleteMany({ where: { pacienteId: { in: dispPacientes.map((p) => p.id) } } });

  // Autorizaciones "en el sistema" (lo que el estudiante debe cotejar contra el papel).
  await prisma.recetaElectronica.createMany({
    data: [
      // Caso 1 — todo correcto
      { pacienteId: dGloria.id, medicamentoId: acetaminofen.id, medico: "Dr. Óscar Rivera", cantidadAutorizada: 20, cantidadRedimida: 0, fechaEmision: new Date(hoy.getTime() - 3 * DIA), fechaVigencia: new Date(hoy.getTime() + 27 * DIA) },
      // Caso 2 — ya redimió parte, viene por el saldo
      { pacienteId: dHernan.id, medicamentoId: omeprazol.id, medico: "Dra. Claudia Ariza", cantidadAutorizada: 30, cantidadRedimida: 10, fechaEmision: new Date(hoy.getTime() - 18 * DIA), fechaVigencia: new Date(hoy.getTime() + 12 * DIA) },
      // Caso 3 — autorización vencida
      { pacienteId: dRocio.id, medicamentoId: cefalexina.id, medico: "Dra. Marcela Ospina", cantidadAutorizada: 14, cantidadRedimida: 0, fechaEmision: new Date(hoy.getTime() - 50 * DIA), fechaVigencia: new Date(hoy.getTime() - 20 * DIA) },
      // Caso 4 — loratadina OK (la amoxicilina de la 2ª fórmula NO está en sistema a propósito)
      { pacienteId: dMiguel.id, medicamentoId: loratadina.id, medico: "Dr. Julián González", cantidadAutorizada: 30, cantidadRedimida: 0, fechaEmision: new Date(hoy.getTime() - 4 * DIA), fechaVigencia: new Date(hoy.getTime() + 26 * DIA) },
      // Caso 5 — ibuprofeno autorizado por 20 (el papel fue alterado a 30); diazepam NO autorizado
      { pacienteId: dEsperanza.id, medicamentoId: ibuprofeno.id, medico: "Dr. Fabián Nieto", cantidadAutorizada: 20, cantidadRedimida: 0, fechaEmision: new Date(hoy.getTime() - 6 * DIA), fechaVigencia: new Date(hoy.getTime() + 24 * DIA) },
      // Caso 6 — todo OK en el sistema; el problema es la identidad de quien reclama
      { pacienteId: dAlvaro.id, medicamentoId: acetaminofen.id, medico: "Dra. Liliana Parra", cantidadAutorizada: 30, cantidadRedimida: 0, fechaEmision: new Date(hoy.getTime() - 2 * DIA), fechaVigencia: new Date(hoy.getTime() + 28 * DIA) },
    ],
  });

  async function casoDisp(
    orden: number,
    titulo: string,
    contexto: string,
    pacienteId: string,
    documentoPresentado: string | null,
    formulas: {
      medico: string;
      registroMedico: string;
      ips?: string;
      diasEmision: number;
      diasVigencia: number;
      cargadaEnSistema?: boolean;
      nota?: string;
      renglones: { medicamentoId: string; cantidad: number; cantidadTachada?: number; posologia?: string }[];
    }[]
  ) {
    await prisma.casoDispensacion.create({
      data: {
        orden,
        titulo,
        contexto,
        pacienteId,
        documentoPresentado,
        formulas: {
          create: formulas.map((f) => ({
            medico: f.medico,
            registroMedico: f.registroMedico,
            ips: f.ips ?? "IPS Central FUNCA",
            fechaEmision: new Date(hoy.getTime() - f.diasEmision * DIA),
            diasVigencia: f.diasVigencia,
            cargadaEnSistema: f.cargadaEnSistema ?? true,
            nota: f.nota ?? null,
            renglones: {
              create: f.renglones.map((r) => ({
                medicamentoId: r.medicamentoId,
                cantidad: r.cantidad,
                cantidadTachada: r.cantidadTachada ?? null,
                posologia: r.posologia ?? null,
              })),
            },
          })),
        },
      },
    });
  }

  await casoDisp(1, "Fórmula sencilla, todo en regla", "Llega Gloria Herrera con una fórmula de control del dolor.", dGloria.id, null, [
    { medico: "Dr. Óscar Rivera", registroMedico: "RM-20455", diasEmision: 3, diasVigencia: 30, renglones: [{ medicamentoId: acetaminofen.id, cantidad: 20, posologia: "1 tableta cada 8 horas" }] },
  ]);

  await casoDisp(2, "Viene por el saldo de una fórmula", "Hernán Díaz ya reclamó parte del omeprazol el mes pasado y viene por lo que falta.", dHernan.id, null, [
    { medico: "Dra. Claudia Ariza", registroMedico: "RM-31288", diasEmision: 18, diasVigencia: 30, renglones: [{ medicamentoId: omeprazol.id, cantidad: 30, posologia: "1 cápsula diaria en ayunas" }] },
  ]);

  await casoDisp(3, "Fórmula vencida", "Rocío Vargas trae una fórmula de hace más de un mes y pide que se la despachen.", dRocio.id, null, [
    { medico: "Dra. Marcela Ospina", registroMedico: "RM-11902", diasEmision: 50, diasVigencia: 30, nota: "La fórmula está arrugada y con la fecha poco legible.", renglones: [{ medicamentoId: cefalexina.id, cantidad: 14, posologia: "1 cada 6 horas por 7 días" }] },
  ]);

  await casoDisp(4, "Dos fórmulas, una de médico particular", "Miguel Ángel Soto entrega dos fórmulas: una de la EPS y otra de un médico particular.", dMiguel.id, null, [
    { medico: "Dr. Julián González", registroMedico: "RM-40771", diasEmision: 4, diasVigencia: 30, renglones: [{ medicamentoId: loratadina.id, cantidad: 30, posologia: "1 tableta diaria" }] },
    { medico: "Dr. Consultorio Particular", registroMedico: "RM-99001", ips: "Consultorio privado", diasEmision: 2, diasVigencia: 30, cargadaEnSistema: false, nota: "Fórmula en papelería de un consultorio particular, sin sello de la EPS.", renglones: [{ medicamentoId: amoxicilina.id, cantidad: 21, posologia: "1 cápsula cada 8 horas" }] },
  ]);

  await casoDisp(5, "Cantidad corregida a mano y un medicamento de más", "Esperanza Rojas trae una fórmula con una cifra tachada y pide también un ansiolítico.", dEsperanza.id, null, [
    { medico: "Dr. Fabián Nieto", registroMedico: "RM-52630", diasEmision: 6, diasVigencia: 30, nota: "En 'ibuprofeno' se ve 20 tachado y 30 escrito encima a mano.", renglones: [
      { medicamentoId: ibuprofeno.id, cantidad: 30, cantidadTachada: 20, posologia: "1 cada 12 horas" },
      { medicamentoId: diazepam.id, cantidad: 10, posologia: "1 en la noche" },
    ] },
  ]);

  await casoDisp(6, "Otra persona viene a reclamar", "Se acerca alguien con la fórmula de Álvaro Mejía, pero el documento que muestra es otro y no trae autorización.", dAlvaro.id, "9999999999", [
    { medico: "Dra. Liliana Parra", registroMedico: "RM-60418", diasEmision: 2, diasVigencia: 30, renglones: [{ medicamentoId: acetaminofen.id, cantidad: 30, posologia: "1 cada 8 horas si hay dolor" }] },
  ]);

  console.log("Módulo Dispensación sembrado:", 6, "casos.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
