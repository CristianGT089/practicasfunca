/**
 * Siembra del módulo Odontología en local: el módulo, la matrícula de los usuarios de
 * prueba y los casos de ejemplo (lib/modulos/odontologia/casosEjemplo.ts). Se llama desde
 * seed.ts.
 */
import type { PrismaClient } from "@prisma/client";
import { sembrarCasosOdontologia } from "../src/lib/modulos/odontologia/casosEjemplo";

export async function sembrarOdontologia(prisma: PrismaClient, usuarioIds: string[]) {
  const { creados, total } = await sembrarCasosOdontologia(prisma, usuarioIds);
  console.log(`Módulo Odontología sembrado: ${creados} caso(s) nuevo(s) de ${total}.`);
}
