import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluarRecepcion, mesAnio, type ItemVerdad, type RegistroItem } from "../src/lib/simulacion/recepcion";

const venc = new Date(Date.UTC(2028, 5, 1));
const item = (extra: Partial<ItemVerdad> = {}): ItemVerdad => ({
  nombre: "Losartán",
  requiereFrio: false,
  cantidadFacturada: 50,
  cantidadLlega: 50,
  loteReal: "L2401",
  vencimientoReal: venc,
  registroEtiqueta: "INVIMA 2019M-0012345",
  temperaturaLlegada: null,
  defecto: null,
  ...extra,
});
const registro = (extra: Partial<RegistroItem> = {}): RegistroItem => ({
  cantidadContada: 50,
  lote: "L2401",
  vencimiento: mesAnio(venc),
  registroInvima: "INVIMA 2019M-0012345",
  temperatura: null,
  empaqueIntegro: true,
  decision: "ACEPTAR",
  motivo: null,
  ...extra,
});

test("producto conforme bien recibido y acta firmada = 100", () => {
  assert.equal(evaluarRecepcion([{ ...item(), registro: registro() }], true).puntaje, 100);
});

test("aceptar un producto sin registro INVIMA es error; rechazarlo con el motivo es acierto", () => {
  const sin = item({ registroEtiqueta: null, defecto: "REGISTRO_SANITARIO" });
  const mal = evaluarRecepcion([{ ...sin, registro: registro({ registroInvima: "" }) }], true);
  assert.ok(mal.criterios.some((c) => c.clave === "RECEPCION_DECISION"));
  const bien = evaluarRecepcion([{ ...sin, registro: registro({ registroInvima: "", decision: "RECHAZAR", motivo: "REGISTRO_SANITARIO" }) }], true);
  assert.equal(bien.puntaje, 100);
});

test("faltante: se recibe lo que llegó y se deja la novedad", () => {
  const f = item({ cantidadLlega: 42, defecto: "FALTANTE" });
  const bien = evaluarRecepcion([{ ...f, registro: registro({ cantidadContada: 42, motivo: "FALTANTE" }) }], true);
  assert.equal(bien.puntaje, 100);
  const contoMal = evaluarRecepcion([{ ...f, registro: registro({ cantidadContada: 50, motivo: "FALTANTE" }) }], true);
  assert.ok(contoMal.criterios.some((c) => c.clave === "RECEPCION_DATOS"));
});

test("cadena de frío: hay que anotar la temperatura del transporte", () => {
  const frio = item({ requiereFrio: true, temperaturaLlegada: 14, defecto: "CADENA_FRIO" });
  const r = evaluarRecepcion([{ ...frio, registro: registro({ temperatura: null, decision: "RECHAZAR", motivo: "CADENA_FRIO" }) }], true);
  assert.ok(r.criterios.some((c) => c.clave === "RECEPCION_DATOS"));
});

test("sin acta firmada pierde ese criterio", () => {
  const r = evaluarRecepcion([{ ...item(), registro: registro() }], false);
  assert.ok(r.puntaje < 100);
});
