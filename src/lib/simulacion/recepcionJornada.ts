/**
 * Jornada de recepción técnica: genera los pedidos (uno por estudiante del grupo, que hace
 * de transportador del proveedor), lo que ve el receptor en su computador y lo que registra.
 * La lógica pura (motivos, decisión esperada, calificación) está en recepcion.ts.
 */
import type { Usuario } from "@prisma/client";
import { prisma } from "@/lib/nucleo/prisma";
import { esMedicamentoDispensable, filtroDispositivosMedicos, filtroMedicamentosDispensables } from "./catalogo";
import { MOTIVO_DE_SITUACION, VIDA_UTIL_MINIMA_MESES, type MotivoRecepcion, type RegistroItem } from "./recepcion";
import type { CodigoSituacion } from "./situaciones";

const PROVEEDORES = [
  { nombre: "Distribuciones Farmacéuticas Andinas S.A.S.", nit: "900.412.587-3" },
  { nombre: "Medicamentos y Suministros del Caribe S.A.S.", nit: "901.208.344-1" },
  { nombre: "Droguería Mayorista El Roble Ltda.", nit: "800.315.962-7" },
  { nombre: "Insumos Hospitalarios Integrales S.A.S.", nit: "901.577.120-5" },
];

/**
 * Refrigerados de práctica (2 a 8 °C): el catálogo importado no trae ninguno y la cadena de
 * frío es parte central de la recepción. Datos de práctica, no de un producto real.
 */
const REFRIGERADOS = [
  { nombre: "Insulina glargina", presentacion: "Solución inyectable 100 UI/mL, pluma prellenada x 3 mL" },
  { nombre: "Vacuna Td (toxoide tetánico y diftérico)", presentacion: "Suspensión inyectable, vial x 0,5 mL" },
  { nombre: "Oxitocina", presentacion: "Solución inyectable 10 UI/mL, ampolla x 1 mL" },
];

const elegir = <T,>(lista: readonly T[]): T => lista[Math.floor(Math.random() * lista.length)];
const entero = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
const mesesDesdeHoy = (m: number) => {
  const h = new Date();
  return new Date(Date.UTC(h.getUTCFullYear(), h.getUTCMonth() + m, 1));
};
const loteAlAzar = () => `${String.fromCharCode(65 + entero(0, 25))}${entero(10, 99)}${entero(1000, 9999)}`;

type Interprete = { estudianteId: string | null; nombre: string };

/**
 * Un pedido por estudiante, con 4 a 6 productos (medicamentos e insumos del catálogo real
 * y, a veces, un refrigerado). Cada situación del plan le pasa a un producto distinto.
 */
export async function generarEntregasRecepcion(simulacionId: string, interpretes: Interprete[], plan: CodigoSituacion[][]) {
  const [medicamentos, dispositivos] = await Promise.all([
    prisma.medicamento.findMany({ where: { origen: "CATALOGO_REAL", registroInvima: { not: null }, ...filtroMedicamentosDispensables } }),
    prisma.medicamento.findMany({ where: { origen: "CATALOGO_REAL", ...filtroDispositivosMedicos } }),
  ]);
  if (medicamentos.length === 0) throw new Error("No hay medicamentos con registro INVIMA en el catálogo real");

  for (const [i, interprete] of interpretes.entries()) {
    const novedades = (plan[i] ?? []).map((c) => MOTIVO_DE_SITUACION[c]).filter(Boolean) as MotivoRecepcion[];
    const proveedor = elegir(PROVEEDORES);
    const conFrio = novedades.includes("CADENA_FRIO") || Math.random() < 0.3;

    // Productos base (lo que se pidió): sin repetir.
    const n = entero(4, 6) - (conFrio ? 1 : 0);
    const base = [...medicamentos].sort(() => Math.random() - 0.5).slice(0, Math.max(2, n - (dispositivos.length ? 1 : 0)));
    if (dispositivos.length) base.push(elegir(dispositivos));
    const items = base.map((m) => ({
      nombre: m.nombre,
      presentacion: [m.formaFarmaceutica && !/^DM$/i.test(m.formaFarmaceutica) ? m.formaFarmaceutica : null, m.concentracion || m.presentacion]
        .filter(Boolean)
        .join(" ")
        .trim() || m.presentacion,
      laboratorio: m.laboratorio,
      esDispositivo: !esMedicamentoDispensable(m.formaFarmaceutica),
      requiereFrio: false,
      registroInvima: m.registroInvima!.trim(),
    }));
    if (conFrio) {
      const r = elegir(REFRIGERADOS);
      items.push({
        ...r,
        laboratorio: "Laboratorio de práctica",
        esDispositivo: false,
        requiereFrio: true,
        registroInvima: `INVIMA ${entero(2015, 2023)}M-${String(entero(1, 99999)).padStart(7, "0")}-R1`,
      });
    }

    // Datos conformes de cada producto.
    const filas = items.map((it, k) => {
      const cantidad = it.esDispositivo ? entero(2, 10) * 5 : entero(2, 12) * 10;
      const lote = loteAlAzar();
      const vence = mesesDesdeHoy(entero(14, 36));
      return {
        ...it,
        orden: k,
        cantidadPedida: cantidad,
        cantidadFacturada: cantidad,
        loteFacturado: lote,
        vencimientoFacturado: vence,
        cantidadLlega: cantidad,
        loteReal: lote,
        vencimientoReal: vence,
        registroEtiqueta: it.registroInvima as string | null,
        temperaturaLlegada: it.requiereFrio ? Math.round((3 + Math.random() * 4) * 10) / 10 : null,
        empaqueIntegro: true,
        defecto: null as MotivoRecepcion | null,
      };
    });

    // Cada novedad, en un producto distinto (la de frío, en el refrigerado).
    const libres = filas.filter((f) => !f.requiereFrio);
    for (const motivo of novedades) {
      if (motivo === "CADENA_FRIO") {
        const f = filas.find((x) => x.requiereFrio && x.defecto === null);
        if (f) {
          f.temperaturaLlegada = Math.round((12 + Math.random() * 6) * 10) / 10;
          f.defecto = motivo;
        }
        continue;
      }
      if (motivo === "NO_SOLICITADO") {
        const m = elegir(medicamentos);
        const cantidad = entero(2, 6) * 10;
        const vence = mesesDesdeHoy(entero(14, 36));
        const lote = loteAlAzar();
        filas.push({
          nombre: m.nombre,
          presentacion: m.concentracion || m.presentacion,
          laboratorio: m.laboratorio,
          esDispositivo: false,
          requiereFrio: false,
          registroInvima: m.registroInvima!.trim(),
          orden: filas.length,
          cantidadPedida: 0,
          cantidadFacturada: cantidad,
          loteFacturado: lote,
          vencimientoFacturado: vence,
          cantidadLlega: cantidad,
          loteReal: lote,
          vencimientoReal: vence,
          registroEtiqueta: m.registroInvima!.trim(),
          temperaturaLlegada: null,
          empaqueIntegro: true,
          defecto: motivo,
        });
        continue;
      }
      const f = libres.find((x) => x.defecto === null);
      if (!f) continue;
      f.defecto = motivo;
      if (motivo === "VENCIMIENTO") {
        // A veces ya vencido; casi siempre con menos de la vida útil mínima.
        f.vencimientoReal = f.vencimientoFacturado = mesesDesdeHoy(Math.random() < 0.3 ? -entero(1, 3) : entero(1, VIDA_UTIL_MINIMA_MESES - 1));
      } else if (motivo === "LOTE") {
        f.loteReal = loteAlAzar();
      } else if (motivo === "REGISTRO_SANITARIO") {
        f.registroEtiqueta = null;
      } else if (motivo === "EMPAQUE") {
        f.empaqueIntegro = false;
      } else if (motivo === "FALTANTE") {
        f.cantidadLlega = f.cantidadFacturada - entero(2, Math.max(2, Math.floor(f.cantidadFacturada / 3)));
      }
    }

    await prisma.entregaProveedor.create({
      data: {
        simulacionId,
        factura: `FE-${entero(10000, 99999)}${i}`,
        ordenCompra: `OC-${String(i + 1).padStart(4, "0")}`,
        proveedor: proveedor.nombre,
        nitProveedor: proveedor.nit,
        estudianteId: interprete.estudianteId,
        transportador: interprete.nombre,
        situaciones: plan[i] ?? [],
        orden: i,
        items: { create: filas },
      },
    });
  }
}

/** La jornada de recepción abierta de esta cuenta (computador del puesto o participante). */
export async function jornadaRecepcionActiva(usuario: Usuario) {
  const base = { tipo: "RECEPCION" as const, estado: "ABIERTA" as const };
  const donde = usuario.sesionTurneroId
    ? { ...base, sesionTurneroId: usuario.sesionTurneroId }
    : usuario.rol === "ESTUDIANTE"
      ? { ...base, OR: [{ participantes: { some: { usuarioId: usuario.id } } }, { grupo: { estudiantes: { some: { id: usuario.id } } } }] }
      : base;
  return prisma.simulacion.findFirst({ where: donde, orderBy: { abiertaEn: "desc" }, select: { id: true, nombre: true } });
}

/**
 * Lo que ve el receptor de un pedido: la orden de compra y la factura (lo que ya está en el
 * sistema), y lo que él mismo ha registrado. NO ve lo que dice la caja ni la novedad: eso lo
 * tiene que mirar en las etiquetas que trae el transportador.
 */
export async function abrirFactura(simulacionId: string, factura: string, usuario: Usuario) {
  const entrega = await prisma.entregaProveedor.findFirst({
    where: { simulacionId, factura: factura.trim().toUpperCase() },
    include: { items: { orderBy: { orden: "asc" } } },
  });
  if (!entrega) return null;
  if (!entrega.iniciadaEn) {
    await prisma.entregaProveedor.update({
      where: { id: entrega.id },
      data: { iniciadaEn: new Date(), espacioNumero: usuario.espacioNumero, usuarioId: usuario.id },
    });
  }
  return {
    id: entrega.id,
    factura: entrega.factura,
    ordenCompra: entrega.ordenCompra,
    proveedor: entrega.proveedor,
    nitProveedor: entrega.nitProveedor,
    actaFirmadaEn: entrega.actaFirmadaEn?.toISOString() ?? null,
    observaciones: entrega.observaciones,
    items: entrega.items.map((it) => ({
      id: it.id,
      nombre: it.nombre,
      presentacion: it.presentacion,
      laboratorio: it.laboratorio,
      esDispositivo: it.esDispositivo,
      requiereFrio: it.requiereFrio,
      cantidadPedida: it.cantidadPedida,
      cantidadFacturada: it.cantidadFacturada,
      loteFacturado: it.loteFacturado,
      vencimientoFacturado: it.vencimientoFacturado.toISOString(),
      registro: (it.registro as RegistroItem | null) ?? null,
    })),
  };
}

export type FacturaVista = NonNullable<Awaited<ReturnType<typeof abrirFactura>>>;

export async function guardarRegistroItem(simulacionId: string, itemId: string, registro: RegistroItem) {
  const item = await prisma.itemRecepcion.findUnique({ where: { id: itemId }, include: { entrega: true } });
  if (!item || item.entrega.simulacionId !== simulacionId) throw new Error("Producto no encontrado en esta jornada");
  if (item.entrega.actaFirmadaEn) throw new Error("El acta ya se firmó: la recepción de este pedido está cerrada");
  if (registro.decision === "RECHAZAR" && !registro.motivo) throw new Error("Al rechazar, indica el motivo");
  await prisma.itemRecepcion.update({ where: { id: itemId }, data: { registro, actualizadoEn: new Date() } });
}

export async function firmarActa(simulacionId: string, entregaId: string, observaciones: string | null) {
  const entrega = await prisma.entregaProveedor.findUnique({ where: { id: entregaId }, include: { items: true } });
  if (!entrega || entrega.simulacionId !== simulacionId) throw new Error("Pedido no encontrado en esta jornada");
  if (entrega.actaFirmadaEn) throw new Error("El acta ya está firmada");
  const sinRegistrar = entrega.items.filter((i) => !i.registro).length;
  if (sinRegistrar > 0) throw new Error(`Falta inspeccionar ${sinRegistrar} producto(s) antes de firmar el acta`);
  await prisma.entregaProveedor.update({
    where: { id: entregaId },
    data: { actaFirmadaEn: new Date(), observaciones: observaciones?.trim() || null },
  });
}
