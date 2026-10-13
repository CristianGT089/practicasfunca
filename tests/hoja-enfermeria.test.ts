import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calcularBalance,
  hojaVacia,
  interpretarSignos,
  normalizarHoja,
  notaHoja,
  puntajeBraden,
  puntajeDownton,
  puntajeGlasgow,
  revisarHoja,
  tomaVacia,
} from "../src/lib/modulos/enfermeria/hoja";

test("Braden: total y riesgo; incompleta = sin puntaje", () => {
  const r = { percepcion: 2, humedad: 2, actividad: 1, movilidad: 2, nutricion: 2, friccion: 1 };
  assert.deepEqual(puntajeBraden(r), { total: 10, riesgo: "Riesgo alto", nivel: "critico" });
  assert.equal(puntajeBraden({ ...r, actividad: 3, movilidad: 3, nutricion: 3 })?.riesgo, "Riesgo moderado"); // 2+2+3+3+3+1 = 14
  assert.equal(puntajeBraden({ percepcion: 4 }), null);
});

test("Glasgow y Downton", () => {
  assert.equal(puntajeGlasgow({ ocular: 4, verbal: 5, motora: 6 })?.total, 15);
  assert.equal(puntajeGlasgow({ ocular: 2, verbal: 2, motora: 4 })?.riesgo, "Grave");
  // La deambulación cuenta una vez aunque se marquen dos opciones.
  assert.equal(puntajeDownton(["caidas_previas", "med_diureticos", "deamb_ayuda", "deamb_insegura"]).total, 3);
  assert.equal(puntajeDownton(["def_visual"]).riesgo, "Riesgo bajo");
});

test("signos vitales: rangos de adulto, sin interpretar en menores", () => {
  const t = { ...tomaVacia(), tas: 150, tad: 95, fc: 52, fr: 18, temperatura: 38.4, satO2: 91, glucometria: 52, dolor: 8 };
  const i = interpretarSignos(t, 60);
  assert.equal(i.tas?.texto, "Hipertensión");
  assert.equal(i.fc?.texto, "Bradicardia");
  assert.equal(i.fr?.nivel, "normal");
  assert.equal(i.temperatura?.texto, "Fiebre");
  assert.equal(i.satO2?.texto, "Saturación baja");
  assert.equal(i.glucometria?.nivel, "critico");
  assert.equal(i.dolor?.texto, "Dolor severo");
  assert.deepEqual(interpretarSignos(t, 8), {});
});

test("balance de líquidos", () => {
  assert.deepEqual(calcularBalance({ ingresos: { via_oral: 600, endovenosos: 1000 }, egresos: { diuresis: 900, vomito: 200 }, horas: 24 }), {
    ingresos: 1600,
    egresos: 1100,
    balance: 500,
  });
});

test("normalizar descarta basura y valores imposibles", () => {
  const h = normalizarHoja({
    turno: "OTRO",
    signos: [{ tas: 120, tad: -5, satO2: 140, dolor: 3 }],
    valoracion: ["palidez", "inventado"],
    escalas: { braden: { percepcion: 9, humedad: 3 }, downton: ["confuso", "x"] },
    balance: { ingresos: { via_oral: "500", endovenosos: 250.4 }, horas: 7 },
  });
  assert.equal(h.turno, "");
  assert.deepEqual([h.signos[0].tas, h.signos[0].tad, h.signos[0].satO2, h.signos[0].dolor], [120, null, null, 3]);
  assert.deepEqual(h.valoracion, ["palidez"]);
  assert.deepEqual(h.escalas.braden, { humedad: 3 });
  assert.deepEqual(h.escalas.downton, ["confuso"]);
  assert.deepEqual(h.balance, { ingresos: { endovenosos: 250 }, egresos: {}, horas: 6 });
});

test("revisión de la hoja contra lo esperado y nota ponderada", () => {
  const hoja = hojaVacia();
  hoja.signos = [{ ...tomaVacia(), tas: 150, tad: 95, fc: 52, temperatura: 37.05 }];
  hoja.conciencia = "alerta";
  hoja.valoracion = ["palidez", "edema"];
  hoja.escalas.braden = { percepcion: 2, humedad: 2, actividad: 1, movilidad: 2, nutricion: 2, friccion: 1 };
  hoja.balance = { ingresos: { endovenosos: 1000 }, egresos: { diuresis: 700 }, horas: 8 };
  hoja.medicamentos = [
    { medicamento: "Digoxina 0,25 mg", dosis: "0,25 mg", via: "Oral", frecuencia: "Cada 24 h", hora: "08:00", administrado: "NO", observacion: "FC 52, se avisa al médico" },
    { medicamento: "Losartán", dosis: "50 mg", via: "Oral", frecuencia: "Cada 12 h", hora: "08:00", administrado: "NO", observacion: "" },
  ];
  const { lineas, puntajes } = revisarHoja(
    {
      signos: { tas: 150, tad: 95, fc: 52, temperatura: 37 },
      conciencia: "alerta",
      valoracion: ["palidez"],
      braden: 10,
      glasgow: null,
      downton: null,
      balance: { ingresos: 1000, egresos: 700 },
      medicamentos: [
        { medicamento: "digoxina", administrar: false },
        { medicamento: "losartan", administrar: true },
      ],
    },
    hoja
  );
  assert.equal(puntajes.signos, 100); // temperatura dentro de ±0,1
  assert.equal(puntajes.valoracion, 67); // conciencia + palidez bien, edema de más
  assert.equal(puntajes.escalas, 100);
  assert.equal(puntajes.balance, 100);
  assert.equal(puntajes.medicamentos, 50); // losartán debía darse
  assert.ok(lineas.some((l) => l.descripcion === "Sobra: Edema" && !l.cumplido));
  assert.ok(lineas.some((l) => l.descripcion === "Losartán: debía administrarse" || l.descripcion === "losartan: debía administrarse"));
  // 20·100 + 15·67 + 20·100 + 15·100 + 30·50 = 8005 / 100
  assert.equal(notaHoja(puntajes), 80);
});
