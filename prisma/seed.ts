import { PrismaClient, TipoAccion, ResultadoEsperado, ActitudCedula } from "@prisma/client";
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

  await prisma.usuario.upsert({
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
  async function crearEscenarioSiNoExiste(
    titulo: string,
    datos: Parameters<typeof prisma.escenario.create>[0]["data"]
  ) {
    const existe = await prisma.escenario.findFirst({ where: { titulo } });
    if (existe) {
      console.log("Ya existe, se omite:", titulo);
      return;
    }
    const creado = await prisma.escenario.create({ data: datos });
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
    resultadoEsperado: ResultadoEsperado.VENTA_CORRECTA,
    items: { create: [{ medicamentoId: multivitaminico.id, cantidadEsperada: 1 }] },
    pasos: {
      create: [
        {
          orden: 2,
          tipoAccion: TipoAccion.SOLICITAR_CEDULA,
          descripcion: "Solicitaste la cédula del paciente",
          peso: 1,
        },
        {
          orden: 3,
          tipoAccion: TipoAccion.VER_FICHA_PACIENTE,
          descripcion: "Buscaste la ficha del paciente en el sistema por su cédula",
          peso: 1,
        },
        {
          orden: 4,
          tipoAccion: TipoAccion.VERIFICAR_RECETA,
          descripcion: "Probaste el botón de verificar receta",
          peso: 1,
        },
        {
          orden: 5,
          tipoAccion: TipoAccion.REGISTRAR_CONTROLADO,
          descripcion: "Probaste el botón de registrar un medicamento controlado (con Diazepam)",
          parametros: { medicamentoId: diazepam.id },
          peso: 1,
        },
        {
          orden: 6,
          tipoAccion: TipoAccion.AGREGAR_A_VENTA,
          descripcion: "Agregaste el Multivitamínico a la venta por primera vez",
          parametros: { medicamentoId: multivitaminico.id },
          peso: 1,
        },
        {
          orden: 7,
          tipoAccion: TipoAccion.QUITAR_DE_VENTA,
          descripcion: "Practicaste cómo quitar un producto de la venta",
          parametros: { medicamentoId: multivitaminico.id },
          peso: 1,
        },
        {
          orden: 8,
          tipoAccion: TipoAccion.AGREGAR_A_VENTA,
          descripcion: "Volviste a agregar el Multivitamínico a la venta",
          parametros: { medicamentoId: multivitaminico.id },
          peso: 1,
        },
        {
          orden: 9,
          tipoAccion: TipoAccion.COMPLETAR_VENTA,
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
    resultadoEsperado: ResultadoEsperado.VENTA_CORRECTA,
    items: { create: [{ medicamentoId: acetaminofen.id, cantidadEsperada: 1 }] },
    pasos: {
      create: [
        {
          orden: 2,
          tipoAccion: TipoAccion.AGREGAR_A_VENTA,
          descripcion: "Agregó el medicamento a la venta (el stock disponible ya se ve junto al nombre, sin necesidad de un botón aparte)",
          parametros: { medicamentoId: acetaminofen.id },
          peso: 1,
        },
        { orden: 3, tipoAccion: TipoAccion.COMPLETAR_VENTA, descripcion: "Completó la venta", peso: 2 },
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
    resultadoEsperado: ResultadoEsperado.RECHAZO_CORRECTO,
    actitudCedula: ActitudCedula.ENTREGA,
    items: { create: [{ medicamentoId: amoxicilina.id, cantidadEsperada: 1 }] },
    pasos: {
      create: [
        {
          orden: 2,
          tipoAccion: TipoAccion.SOLICITAR_CEDULA,
          descripcion: "Solicitó la cédula antes que nada para validar la identidad",
          peso: 1,
        },
        {
          orden: 3,
          tipoAccion: TipoAccion.VER_FICHA_PACIENTE,
          descripcion: "Buscó su ficha en el sistema por la cédula (penicilina en su lista de alergias — hay que cruzarlo con la familia de la Amoxicilina)",
          peso: 2,
        },
        {
          orden: 4,
          tipoAccion: TipoAccion.BUSCAR_RECETA_ONLINE,
          descripcion: "Buscó la receta en línea (no se encontró ninguna a su nombre para este medicamento)",
          peso: 2,
        },
        {
          orden: 5,
          tipoAccion: TipoAccion.RECHAZAR_VENTA,
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
    resultadoEsperado: ResultadoEsperado.VENTA_CORRECTA,
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
          tipoAccion: TipoAccion.SOLICITAR_CEDULA,
          descripcion: "Solicitó la cédula para validar identidad, aunque ya traiga receta física",
          peso: 1,
        },
        {
          orden: 3,
          tipoAccion: TipoAccion.VER_FICHA_PACIENTE,
          descripcion: "Buscó su ficha en el sistema por la cédula (sin alergias registradas — Amoxicilina es penicilina, pero este paciente no tiene esa alergia)",
          peso: 2,
        },
        {
          orden: 4,
          tipoAccion: TipoAccion.VERIFICAR_RECETA,
          descripcion: "Verificó la receta médica presentada",
          peso: 2,
        },
        {
          orden: 5,
          tipoAccion: TipoAccion.AGREGAR_A_VENTA,
          descripcion: "Agregó el medicamento a la venta",
          parametros: { medicamentoId: amoxicilina.id },
          peso: 1,
        },
        { orden: 6, tipoAccion: TipoAccion.COMPLETAR_VENTA, descripcion: "Completó la venta", peso: 2 },
      ],
    },
  });

  // 4. Cliente anónimo / Tramadol — sin receta, cédula rehusada
  await crearEscenarioSiNoExiste("Cliente pide Tramadol", {
    titulo: "Cliente pide Tramadol",
    descripcion:
      "Un cliente pide Tramadol 'para un dolor fuerte de espalda' pero no presenta ninguna receta médica. Es un medicamento controlado. Al pedirle la cédula para intentar validar una receta electrónica, se niega a mostrarla. Decide qué hacer.",
    descripcionDificil: "Un cliente pide Tramadol. No trae receta física.",
    resultadoEsperado: ResultadoEsperado.RECHAZO_CORRECTO,
    actitudCedula: ActitudCedula.SE_REHUSA,
    items: { create: [{ medicamentoId: tramadol.id, cantidadEsperada: 1 }] },
    pasos: {
      create: [
        {
          orden: 2,
          tipoAccion: TipoAccion.VERIFICAR_RECETA,
          descripcion: "Intentó verificar la receta médica física",
          peso: 1,
        },
        {
          orden: 3,
          tipoAccion: TipoAccion.SOLICITAR_CEDULA,
          descripcion: "Solicitó la cédula para intentar validar identidad (el cliente se negó a mostrarla)",
          peso: 2,
        },
        {
          orden: 4,
          tipoAccion: TipoAccion.RECHAZAR_VENTA,
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
    resultadoEsperado: ResultadoEsperado.VENTA_CORRECTA,
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
          tipoAccion: TipoAccion.SOLICITAR_CEDULA,
          descripcion: "Solicitó la cédula para validar identidad antes de vender un controlado",
          peso: 1,
        },
        {
          orden: 3,
          tipoAccion: TipoAccion.VER_FICHA_PACIENTE,
          descripcion: "Buscó su ficha en el sistema por la cédula (sin alergias registradas)",
          peso: 1,
        },
        {
          orden: 4,
          tipoAccion: TipoAccion.VERIFICAR_RECETA,
          descripcion: "Verificó la receta médica presentada",
          peso: 2,
        },
        {
          orden: 5,
          tipoAccion: TipoAccion.REGISTRAR_CONTROLADO,
          descripcion: "Registró la venta como medicamento controlado",
          parametros: { medicamentoId: diazepam.id },
          peso: 2,
        },
        {
          orden: 6,
          tipoAccion: TipoAccion.AGREGAR_A_VENTA,
          descripcion: "Agregó el medicamento a la venta",
          parametros: { medicamentoId: diazepam.id },
          peso: 1,
        },
        { orden: 7, tipoAccion: TipoAccion.COMPLETAR_VENTA, descripcion: "Completó la venta", peso: 2 },
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
    resultadoEsperado: ResultadoEsperado.RECHAZO_CORRECTO,
    items: { create: [{ medicamentoId: ibuprofeno.id, cantidadEsperada: 1 }] },
    pasos: {
      create: [
        {
          orden: 2,
          tipoAccion: TipoAccion.SOLICITAR_CEDULA,
          descripcion: "Solicitó la cédula para validar identidad y poder revisar su ficha",
          peso: 1,
        },
        {
          orden: 3,
          tipoAccion: TipoAccion.VER_FICHA_PACIENTE,
          descripcion: "Buscó su ficha en el sistema por la cédula (alérgico a AINE — hay que reconocer que el Ibuprofeno pertenece a esa familia, aunque no pida receta)",
          peso: 3,
        },
        {
          orden: 4,
          tipoAccion: TipoAccion.RECHAZAR_VENTA,
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
    resultadoEsperado: ResultadoEsperado.RECHAZO_CORRECTO,
    actitudCedula: ActitudCedula.ENTREGA,
    items: { create: [{ medicamentoId: ciprofloxacina.id, cantidadEsperada: 1 }] },
    pasos: {
      create: [
        {
          orden: 2,
          tipoAccion: TipoAccion.SOLICITAR_CEDULA,
          descripcion: "Solicitó la cédula para validar identidad y poder revisar su ficha",
          peso: 1,
        },
        {
          orden: 3,
          tipoAccion: TipoAccion.VER_FICHA_PACIENTE,
          descripcion: "Buscó su ficha en el sistema por la cédula (alérgica a quinolonas — hay que reconocer que la Ciprofloxacina pertenece a esa familia)",
          peso: 2,
        },
        {
          orden: 4,
          tipoAccion: TipoAccion.BUSCAR_RECETA_ONLINE,
          descripcion: "Buscó la receta en línea (no se encontró ninguna a su nombre)",
          peso: 2,
        },
        {
          orden: 5,
          tipoAccion: TipoAccion.RECHAZAR_VENTA,
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
    resultadoEsperado: ResultadoEsperado.RECHAZO_CORRECTO,
    items: { create: [{ medicamentoId: ciprofloxacina.id, cantidadEsperada: 1 }] },
    pasos: {
      create: [
        {
          orden: 2,
          tipoAccion: TipoAccion.RECHAZAR_VENTA,
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
    resultadoEsperado: ResultadoEsperado.RECHAZO_CORRECTO,
    items: { create: [{ medicamentoId: omeprazol.id, cantidadEsperada: 1 }] },
    pasos: {
      create: [
        {
          orden: 2,
          tipoAccion: TipoAccion.RECHAZAR_VENTA,
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
    resultadoEsperado: ResultadoEsperado.VENTA_CORRECTA,
    actitudCedula: ActitudCedula.ENTREGA,
    items: { create: [{ medicamentoId: tramadol.id, cantidadEsperada: 1 }] },
    pasos: {
      create: [
        {
          orden: 2,
          tipoAccion: TipoAccion.SOLICITAR_CEDULA,
          descripcion: "Solicitó la cédula para validar identidad",
          peso: 1,
        },
        {
          orden: 3,
          tipoAccion: TipoAccion.VER_FICHA_PACIENTE,
          descripcion: "Buscó su ficha en el sistema por la cédula (sin alergias registradas)",
          peso: 1,
        },
        {
          orden: 4,
          tipoAccion: TipoAccion.BUSCAR_RECETA_ONLINE,
          descripcion: "Buscó la receta en línea y encontró una vigente para este medicamento",
          peso: 2,
        },
        {
          orden: 5,
          tipoAccion: TipoAccion.REGISTRAR_CONTROLADO,
          descripcion: "Registró la venta como medicamento controlado",
          parametros: { medicamentoId: tramadol.id },
          peso: 2,
        },
        {
          orden: 6,
          tipoAccion: TipoAccion.AGREGAR_A_VENTA,
          descripcion: "Agregó el medicamento a la venta",
          parametros: { medicamentoId: tramadol.id },
          peso: 1,
        },
        { orden: 7, tipoAccion: TipoAccion.COMPLETAR_VENTA, descripcion: "Completó la venta", peso: 2 },
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
    resultadoEsperado: ResultadoEsperado.VENTA_CORRECTA,
    actitudCedula: ActitudCedula.ENTREGA,
    items: { create: [{ medicamentoId: amoxicilina.id, cantidadEsperada: 1 }] },
    pasos: {
      create: [
        {
          orden: 2,
          tipoAccion: TipoAccion.SOLICITAR_CEDULA,
          descripcion: "Solicitó la cédula para validar identidad",
          peso: 1,
        },
        {
          orden: 3,
          tipoAccion: TipoAccion.VER_FICHA_PACIENTE,
          descripcion: "Buscó su ficha en el sistema por la cédula (sin alergias registradas)",
          peso: 1,
        },
        {
          orden: 4,
          tipoAccion: TipoAccion.BUSCAR_RECETA_ONLINE,
          descripcion: "Buscó la receta en línea y encontró una vigente para este medicamento",
          peso: 2,
        },
        {
          orden: 5,
          tipoAccion: TipoAccion.AGREGAR_A_VENTA,
          descripcion: "Agregó el medicamento a la venta",
          parametros: { medicamentoId: amoxicilina.id },
          peso: 1,
        },
        { orden: 6, tipoAccion: TipoAccion.COMPLETAR_VENTA, descripcion: "Completó la venta", peso: 2 },
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
    resultadoEsperado: ResultadoEsperado.RECHAZO_CORRECTO,
    actitudCedula: ActitudCedula.ENTREGA,
    items: { create: [{ medicamentoId: amoxicilina.id, cantidadEsperada: 1 }] },
    pasos: {
      create: [
        {
          orden: 2,
          tipoAccion: TipoAccion.SOLICITAR_CEDULA,
          descripcion: "Solicitó la cédula para validar identidad",
          peso: 1,
        },
        {
          orden: 3,
          tipoAccion: TipoAccion.BUSCAR_RECETA_ONLINE,
          descripcion: "Buscó la receta en línea (no se encontró ninguna a su nombre)",
          peso: 2,
        },
        {
          orden: 4,
          tipoAccion: TipoAccion.RECHAZAR_VENTA,
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
    resultadoEsperado: ResultadoEsperado.RECHAZO_CORRECTO,
    actitudCedula: ActitudCedula.ENTREGA,
    items: { create: [{ medicamentoId: cefalexina.id, cantidadEsperada: 1 }] },
    pasos: {
      create: [
        {
          orden: 2,
          tipoAccion: TipoAccion.SOLICITAR_CEDULA,
          descripcion: "Pidió la cédula física en vez de confiar en el número dicho de palabra",
          peso: 2,
        },
        {
          orden: 3,
          tipoAccion: TipoAccion.VER_FICHA_PACIENTE,
          descripcion: "Buscó su ficha en el sistema con el número correcto (sin alergias registradas)",
          peso: 1,
        },
        {
          orden: 4,
          tipoAccion: TipoAccion.BUSCAR_RECETA_ONLINE,
          descripcion: "Buscó la receta en línea y revisó la fecha de vigencia, no solo si existía",
          peso: 2,
        },
        {
          orden: 5,
          tipoAccion: TipoAccion.RECHAZAR_VENTA,
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
    resultadoEsperado: ResultadoEsperado.RECHAZO_CORRECTO,
    actitudCedula: ActitudCedula.ENTREGA,
    items: { create: [{ medicamentoId: cefalexina.id, cantidadEsperada: 1 }] },
    pasos: {
      create: [
        {
          orden: 2,
          tipoAccion: TipoAccion.SOLICITAR_CEDULA,
          descripcion: "Solicitó la cédula para validar identidad",
          peso: 1,
        },
        {
          orden: 3,
          tipoAccion: TipoAccion.BUSCAR_RECETA_ONLINE,
          descripcion: "Buscó la receta en línea y revisó cuánta cantidad quedaba disponible",
          peso: 2,
        },
        {
          orden: 4,
          tipoAccion: TipoAccion.RECHAZAR_VENTA,
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
    resultadoEsperado: ResultadoEsperado.RECHAZO_CORRECTO,
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
          tipoAccion: TipoAccion.SOLICITAR_CEDULA,
          descripcion: "Solicitó la cédula para validar identidad, aunque ya traiga receta física",
          peso: 1,
        },
        {
          orden: 3,
          tipoAccion: TipoAccion.VER_FICHA_PACIENTE,
          descripcion: "Buscó su ficha en el sistema por la cédula",
          peso: 1,
        },
        {
          orden: 4,
          tipoAccion: TipoAccion.VERIFICAR_RECETA,
          descripcion: "Verificó la receta física y notó la irregularidad",
          peso: 2,
        },
        {
          orden: 5,
          tipoAccion: TipoAccion.ESCALAR_A_SUPERVISOR,
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
    resultadoEsperado: ResultadoEsperado.VENTA_CORRECTA,
    items: { create: [{ medicamentoId: loratadina.id, cantidadEsperada: 1 }] },
    pasos: {
      create: [
        {
          orden: 1,
          tipoAccion: TipoAccion.AGREGAR_A_VENTA,
          descripcion: "Agregó el medicamento a la venta",
          parametros: { medicamentoId: loratadina.id },
          peso: 1,
        },
        { orden: 2, tipoAccion: TipoAccion.COMPLETAR_VENTA, descripcion: "Completó la venta", peso: 2 },
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
    resultadoEsperado: ResultadoEsperado.RECHAZO_CORRECTO,
    items: { create: [{ medicamentoId: loratadina.id, cantidadEsperada: 1 }] },
    pasos: {
      create: [
        {
          orden: 1,
          tipoAccion: TipoAccion.SOLICITAR_CEDULA,
          descripcion: "Solicitó la cédula para validar identidad y poder revisar su ficha",
          peso: 1,
        },
        {
          orden: 2,
          tipoAccion: TipoAccion.VER_FICHA_PACIENTE,
          descripcion: "Buscó su ficha en el sistema por la cédula (alérgica a antihistamínicos — hay que reconocer que la Loratadina pertenece a esa familia)",
          peso: 3,
        },
        {
          orden: 3,
          tipoAccion: TipoAccion.RECHAZAR_VENTA,
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
    resultadoEsperado: ResultadoEsperado.RECHAZO_CORRECTO,
    items: { create: [{ medicamentoId: omeprazol.id, cantidadEsperada: 1 }] },
    pasos: {
      create: [
        {
          orden: 1,
          tipoAccion: TipoAccion.SOLICITAR_CEDULA,
          descripcion: "Solicitó la cédula para validar identidad",
          peso: 1,
        },
        {
          orden: 2,
          tipoAccion: TipoAccion.VER_FICHA_PACIENTE,
          descripcion: "Buscó su ficha en el sistema por la cédula",
          peso: 1,
        },
        {
          orden: 3,
          tipoAccion: TipoAccion.RECHAZAR_VENTA,
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
    resultadoEsperado: ResultadoEsperado.RECHAZO_CORRECTO,
    actitudCedula: ActitudCedula.SE_REHUSA,
    items: { create: [{ medicamentoId: diazepam.id, cantidadEsperada: 1 }] },
    pasos: {
      create: [
        {
          orden: 1,
          tipoAccion: TipoAccion.VERIFICAR_RECETA,
          descripcion: "Intentó verificar la receta médica física",
          peso: 1,
        },
        {
          orden: 2,
          tipoAccion: TipoAccion.SOLICITAR_CEDULA,
          descripcion: "Solicitó la cédula para intentar validar identidad (el cliente se negó a mostrarla)",
          peso: 2,
        },
        {
          orden: 3,
          tipoAccion: TipoAccion.RECHAZAR_VENTA,
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
    resultadoEsperado: ResultadoEsperado.RECHAZO_CORRECTO,
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
          tipoAccion: TipoAccion.SOLICITAR_CEDULA,
          descripcion: "Solicitó la cédula para validar identidad, aunque ya traiga receta física",
          peso: 1,
        },
        {
          orden: 2,
          tipoAccion: TipoAccion.VER_FICHA_PACIENTE,
          descripcion: "Buscó su ficha en el sistema por la cédula",
          peso: 1,
        },
        {
          orden: 3,
          tipoAccion: TipoAccion.VERIFICAR_RECETA,
          descripcion: "Verificó la receta física y notó la irregularidad",
          peso: 2,
        },
        {
          orden: 4,
          tipoAccion: TipoAccion.ESCALAR_A_SUPERVISOR,
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
  await prisma.escenario.updateMany({
    where: { titulo: "Jorge Pérez pide Amoxicilina" },
    data: { recetaPresentada: true },
  });
  await prisma.escenario.updateMany({
    where: { titulo: "Pedro Martínez pide Diazepam" },
    data: { recetaPresentada: true },
  });

  console.log("Fecha usada como referencia para vencimientos:", { enElPasado, enElFuturo });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
