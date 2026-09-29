/**
 * Crea en la base (producción incluida) el módulo Odontología, si no existe, y los 10 casos
 * de ejemplo: 5 de práctica virtual y 5 solo para jornadas presenciales. No crea ni toca
 * usuarios, contraseñas ni matrículas. Se puede correr varias veces: omite lo que ya existe.
 *
 *   npm run casos:odontologia
 *   # en el VPS:  docker compose exec app npm run casos:odontologia
 */
import { PrismaClient } from "@prisma/client";
import { sembrarCasosOdontologia } from "../../../src/lib/modulos/odontologia/casosEjemplo";

const prisma = new PrismaClient();

sembrarCasosOdontologia(prisma)
  .then(({ creados, total }) => console.log(`Listo: ${creados} caso(s) nuevo(s); ${total - creados} ya existían.`))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
