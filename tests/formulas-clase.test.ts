import { test } from "node:test";
import assert from "node:assert/strict";
import { argumentosDe, desplazar, ErrorCelda, ErrorFormula, evaluar, usaAbsoluta, usaFuncion, usaReferencias, type Hoja } from "../src/lib/clase/formulas";

const hoja: Hoja = [
  ["Paciente", "Área", "Prioridad", "Estado", "Valor", "Código"],
  ["Ana", "Enfermería", "Urgente", "Atendido", 50000, "E01"],
  ["Luis", "Odontología", "Normal", "Cancelado", 30000, "E02"],
  ["Marta", "Enfermería", "Normal", "Atendido", 20000, "E03"],
  ["Pedro", "Enfermería", "Urgente", "Cancelado", 10000, "E01"],
  ["Sofía", "Farmacia", "Urgente", "Atendido", "", "E04"],
];

const e = (f: string) => evaluar(f, hoja);

test("básicas: SUMA, PROMEDIO, CONTAR, CONTARA, MAX, MIN y aritmética", () => {
  assert.equal(e("=SUMA(E2:E6)"), 110000);
  assert.equal(e("=SUM(E2:E6)"), 110000);
  assert.equal(e("=PROMEDIO(E2:E6)"), 27500);
  assert.equal(e("=CONTAR(E2:E6)"), 4);
  assert.equal(e("=CONTARA(A2:A6)"), 5);
  assert.equal(e("=MAX(E2:E6)"), 50000);
  assert.equal(e("=MIN(E2:E6)"), 10000);
  assert.equal(e("=E2*2+E3/3"), 110000);
  assert.equal(e("=(E2+E3)*2"), 160000);
});

test("SI, comparaciones y textos", () => {
  assert.equal(e('=SI(D3="Cancelado";"Revisar";"OK")'), "Revisar");
  assert.equal(e('=SI(D2="cancelado";"Revisar";"OK")'), "OK");
  assert.equal(e("=SI(E2>=50000;\"Alto\";\"Bajo\")"), "Alto");
  assert.equal(e("=E2>E3"), true);
  assert.equal(e('=SI(Y(B2="Enfermería";C2="Urgente");1;0)'), 1);
  assert.equal(e('=CONCATENAR(A2;" - ";B2)'), "Ana - Enfermería");
  assert.equal(e('=A2&" ("&B2&")"'), "Ana (Enfermería)");
});

test("CONTAR.SI, SUMAR.SI y sus versiones .CONJUNTO", () => {
  assert.equal(e('=CONTAR.SI(D2:D6;"Cancelado")'), 2);
  assert.equal(e('=COUNTIF(D2:D6;"cancelado")'), 2);
  assert.equal(e('=CONTAR.SI(E2:E6;">20000")'), 2);
  assert.equal(e('=CONTAR.SI(D2:D6;"<>Cancelado")'), 3);
  assert.equal(e('=CONTAR.SI(B2:B6;"Enf*")'), 3);
  assert.equal(e('=SUMAR.SI(B2:B6;"Enfermería";E2:E6)'), 80000);
  assert.equal(e('=SUMAR.SI(E2:E6;">=30000")'), 80000);
  assert.equal(e('=CONTAR.SI.CONJUNTO(B2:B6;"Enfermería";C2:C6;"Urgente")'), 2);
  assert.equal(e('=SUMAR.SI.CONJUNTO(E2:E6;B2:B6;"Enfermería";D2:D6;"Atendido")'), 70000);
  assert.throws(() => e('=CONTAR.SI.CONJUNTO(B2:B6;"Enfermería";C2:C5;"Urgente")'), ErrorCelda);
});

test("REDONDEAR, HOY y fechas en texto", () => {
  assert.equal(e("=REDONDEAR(E2/3;0)"), 16667);
  assert.equal(e("=REDONDEAR(2.345;2)"), 2.35);
  const hoy = evaluar("=HOY()", hoja) as number;
  assert.ok(hoy > 46000);
  assert.equal(evaluar('=A1-HOY()', [["15/12/2026"]]), (evaluar("=A1", [[46371]]) as number) - hoy);
});

test("errores y SI.ERROR", () => {
  assert.throws(() => e("=E2/E6"), /#¡DIV\/0!/);
  assert.throws(() => e("=A2*2"), /#¡VALOR!.*A2/);
  assert.throws(() => e("=SUMAA(E2:E6)"), /#¿NOMBRE?/);
  assert.equal(e('=SI.ERROR(E2/E6;"Sin valor")'), "Sin valor");
  assert.equal(e('=IFERROR(E2/2;"x")'), 25000);
  assert.throws(() => e('=SI(D2="Atendido";"ok"'), ErrorFormula);
  assert.throws(() => e("=SUMA(E:E)"), /C2:C7/);
});

test("BUSCARV y BUSCARX", () => {
  assert.equal(e('=BUSCARV("Marta";A2:E6;5;FALSO)'), 20000);
  assert.equal(e('=VLOOKUP("marta";A2:E6;2;0)'), "Enfermería");
  assert.throws(() => e('=BUSCARV("Juan";A2:E6;2;FALSO)'), /#N\/A/);
  assert.throws(() => e('=BUSCARV("Ana";A2:E6;7;FALSO)'), /#¡REF!/);
  assert.equal(e('=SI.ERROR(BUSCARV("Juan";A2:E6;2;FALSO);"No existe")'), "No existe");
  assert.equal(e('=BUSCARX("Pedro";A2:A6;E2:E6)'), 10000);
  assert.equal(e('=BUSCARX("E02";F2:F6;A2:A6)'), "Luis");
  assert.equal(e('=BUSCARX("Juan";A2:A6;E2:E6;"No está")'), "No está");
  // Sin FALSO y con la columna desordenada, BUSCARV puede traer otra fila (como en Sheets).
  assert.equal(e('=BUSCARV("Odontología";B2:E6;3;FALSO)'), "Cancelado");
  assert.notEqual(e('=BUSCARV("Odontología";B2:E6;3)'), "Cancelado");
});

test("ayudas para revisar: funciones, argumentos, referencias y $", () => {
  assert.ok(usaFuncion('=CONTAR.SI(D2:D6;"x")', "CONTAR.SI"));
  assert.ok(!usaFuncion('=CONTAR.SI(D2:D6;"x")', "SI"));
  assert.ok(usaFuncion('=COUNTIFS(B2:B6;"a";C2:C6;"b")', "CONTAR.SI.CONJUNTO"));
  assert.ok(!usaFuncion('=CONTAR.SI.CONJUNTO(B2:B6;"a")', "CONTAR.SI"));
  assert.equal(argumentosDe('=BUSCARV("Ana";A2:E6;2)', "BUSCARV"), 3);
  assert.equal(argumentosDe('=SI(SUMA(A1;A2)>3;"a";"b")', "SI"), 3);
  assert.ok(usaReferencias("=E2*2"));
  assert.ok(!usaReferencias("=120*500"));
  assert.ok(!usaReferencias('=CONTAR.SI("A2";"x")'));
  assert.ok(usaAbsoluta("=E2/$E$7"));
  assert.ok(usaAbsoluta("=E2/E$7"));
  assert.ok(!usaAbsoluta("=E2/E7"));
  assert.equal(desplazar("=E2/$E$7", 2, 0), "=E4/$E$7");
  assert.equal(desplazar("=E2/E$7+$A3", 1, 1), "=F3/F$7+$A4");
  assert.equal(desplazar('=SI(D2="E2";BUSCARV(F2;A2:E6;2;FALSO);"")', 1, 0), '=SI(D3="E2";BUSCARV(F3;A3:E7;2;FALSO);"")');
});
