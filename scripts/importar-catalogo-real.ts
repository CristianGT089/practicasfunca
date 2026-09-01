// Carga el catálogo real de medicamentos (consulta libre del estudiante en
// /panel/catalogo) a partir de scripts/data/catalogo-real.json. No depende de los Excel
// originales ni de ninguna librería para leerlos — pensado para correr en el VPS con solo
// `npx prisma migrate deploy && npx tsx scripts/importar-catalogo-real.ts`.
//
// Uso: npx tsx scripts/importar-catalogo-real.ts

import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { normalizarClaveUnica } from "../src/lib/modulos/farmacia/catalogoReal";

const prisma = new PrismaClient();

type RegistroCatalogo = {
  nombre: string;
  principioActivo: string;
  presentacion: string;
  laboratorio: string | null;
  formaFarmaceutica: string | null;
  concentracion: string | null;
  registroInvima: string | null;
  numeroLote: string | null;
  loteVencimiento: string | null; // ISO date o null
  stock: number;
};

async function main() {
  const ruta = path.join(process.cwd(), "scripts/data/catalogo-real.json");
  const registros: RegistroCatalogo[] = JSON.parse(fs.readFileSync(ruta, "utf-8"));

  let total = 0;
  for (const r of registros) {
    const claveUnica = normalizarClaveUnica(r.principioActivo, r.presentacion, r.numeroLote);
    const existente = await prisma.medicamento.findFirst({
      where: { origen: "CATALOGO_REAL", claveUnica },
    });

    const datos = {
      origen: "CATALOGO_REAL" as const,
      nombre: r.nombre,
      principioActivo: r.principioActivo,
      presentacion: r.presentacion,
      laboratorio: r.laboratorio,
      formaFarmaceutica: r.formaFarmaceutica,
      concentracion: r.concentracion,
      registroInvima: r.registroInvima,
      numeroLote: r.numeroLote,
      claveUnica,
      loteVencimiento: r.loteVencimiento ? new Date(r.loteVencimiento) : null,
      stock: r.stock,
      precio: 0,
      requiereReceta: false,
      esControlado: false,
      tags: [],
    };

    if (existente) {
      await prisma.medicamento.update({ where: { id: existente.id }, data: datos });
    } else {
      await prisma.medicamento.create({ data: datos });
    }
    total++;
  }

  console.log(`Listo. ${total} registros del catálogo real importados/actualizados.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
