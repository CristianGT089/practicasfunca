/**
 * Usuarios y grupos de demostración para los roles (docente/estudiante). Idempotente.
 * Contraseñas de prueba: docente123 (solo para desarrollo local).
 */
import type { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

export async function sembrarRoles(prisma: PrismaClient, estudianteId: string) {
  const hash = await bcrypt.hash("docente123", 10);
  const modulo = (slug: string) => prisma.modulo.findUnique({ where: { slug } });

  async function docente(usuario: string, nombre: string, slugs: string[]) {
    const d = await prisma.usuario.upsert({
      where: { usuario },
      update: {},
      create: { usuario, nombre, passwordHash: hash, rol: "DOCENTE" },
    });
    for (const slug of slugs) {
      const m = await modulo(slug);
      if (!m) continue;
      await prisma.matricula.upsert({
        where: { usuarioId_moduloId: { usuarioId: d.id, moduloId: m.id } },
        update: {},
        create: { usuarioId: d.id, moduloId: m.id },
      });
    }
    return d;
  }

  const docenteFarmacia = await docente("docente_farmacia", "Docente de Farmacia", ["farmacia", "dispensacion"]);
  const docenteOdonto = await docente("docente_odonto", "Docente de Odontología", ["odontologia"]);

  async function grupo(id: string, nombre: string, docenteId: string, slugs: string[]) {
    const modulos = (await Promise.all(slugs.map(modulo))).filter((m) => m !== null);
    await prisma.grupo.upsert({
      where: { id },
      update: {},
      create: {
        id,
        nombre,
        docentes: { connect: [{ id: docenteId }] },
        estudiantes: { connect: [{ id: estudianteId }] },
        modulos: { connect: modulos.map((m) => ({ id: m.id })) },
      },
    });
  }

  await grupo("grupo-demo-farmacia", "Técnico en Farmacia — demo", docenteFarmacia.id, ["farmacia", "dispensacion"]);
  await grupo("grupo-demo-odonto", "Auxiliar en Salud Oral — demo", docenteOdonto.id, ["odontologia"]);
  console.log("Roles de demostración: docente_farmacia, docente_odonto (contraseña docente123).");
}
