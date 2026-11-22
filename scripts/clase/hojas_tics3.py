"""
Hojas de práctica de la clase 3 de TICs (funciones, gráficos y tablas dinámicas).

Genera en public/clase/tics-3/:
  - TICs3_Funciones.xlsx   (guiado: Inventario, Turnos y Profesionales)
  - TICs3_Atenciones.xlsx  (guiado: gráficos y tablas dinámicas)
  - TICs3_Entregable.xlsx  (entregable: panel de atenciones, otros datos)

Datos inventados con temática de salud y semilla fija (siempre salen iguales).
Uso: python3 scripts/clase/hojas_tics3.py
"""

import datetime as dt
import random
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

SALIDA = Path(__file__).resolve().parents[2] / "public" / "clase" / "tics-3"
NAVY = "1E2E55"
AMARILLO = "FBBA00"
CLARO = "EEF2FB"
borde = Side(style="thin", color="C9D3EA")


def hoja_datos(ws, encabezados, filas, formatos=None, anchos=None):
    """Escribe una tabla con encabezados de color, bordes, fila 1 inmovilizada y filtro."""
    formatos = formatos or {}
    ws.append(encabezados)
    for f in filas:
        ws.append(list(f))
    for c, _ in enumerate(encabezados, start=1):
        celda = ws.cell(row=1, column=c)
        celda.font = Font(bold=True, color="FFFFFF")
        celda.fill = PatternFill("solid", fgColor=NAVY)
        celda.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    for fila in ws.iter_rows(min_row=1, max_row=len(filas) + 1, max_col=len(encabezados)):
        for celda in fila:
            celda.border = Border(top=borde, bottom=borde, left=borde, right=borde)
            if celda.row > 1 and celda.row % 2 == 0:
                celda.fill = PatternFill("solid", fgColor=CLARO)
            fmt = formatos.get(celda.column)
            if fmt and celda.row > 1:
                celda.number_format = fmt
    for c, h in enumerate(encabezados, start=1):
        ancho = (anchos or {}).get(c) or max(len(str(h)), *(len(str(f[c - 1])) for f in filas)) + 3
        ws.column_dimensions[get_column_letter(c)].width = min(ancho, 34)
    ws.freeze_panes = "A2"
    ws.row_dimensions[1].height = 22


def instrucciones(wb, titulo, lineas):
    ws = wb.create_sheet("Instrucciones", 0)
    ws["A1"] = titulo
    ws["A1"].font = Font(bold=True, size=15, color=NAVY)
    ws["A2"] = "FUNCA · TICs · Clase 3"
    ws["A2"].font = Font(italic=True, color="64748B")
    for i, l in enumerate(lineas, start=4):
        ws.cell(row=i, column=1, value=l)
        if l and l[0].isdigit():
            ws.cell(row=i, column=1).font = Font(bold=True, color=NAVY)
    ws.column_dimensions["A"].width = 110
    ws.sheet_properties.tabColor = AMARILLO


PESOS = '"$"#,##0'
FECHA = "DD/MM/YYYY"

# ───────────────────────── 1. FUNCIONES (guiado) ─────────────────────────


def funciones():
    rnd = random.Random(3)
    wb = Workbook()
    wb.remove(wb.active)

    inventario = [
        ("Acetaminofén 500 mg", "Analgésico", "Tableta", 120, 500, dt.date(2027, 6, 30)),
        ("Ibuprofeno 400 mg", "Analgésico", "Tableta", 80, 800, dt.date(2027, 2, 15)),
        ("Naproxeno 250 mg", "Analgésico", "Tableta", 40, 900, dt.date(2026, 12, 10)),
        ("Amoxicilina 500 mg", "Antibiótico", "Cápsula", 60, 1500, dt.date(2027, 4, 1)),
        ("Cefalexina 500 mg", "Antibiótico", "Cápsula", 25, 1800, dt.date(2026, 11, 30)),
        ("Azitromicina 500 mg", "Antibiótico", "Tableta", 18, 4200, dt.date(2027, 9, 20)),
        ("Loratadina 10 mg", "Antialérgico", "Tableta", 45, 1200, dt.date(2027, 1, 5)),
        ("Cetirizina 10 mg", "Antialérgico", "Tableta", 70, 1100, dt.date(2026, 12, 24)),
        ("Suero oral", "Hidratación", "Sobre", 30, 2500, dt.date(2028, 3, 1)),
        ("Salbutamol inhalador", "Respiratorio", "Inhalador", 12, 9800, dt.date(2027, 7, 31)),
        ("Omeprazol 20 mg", "Gastrointestinal", "Cápsula", 95, 600, dt.date(2027, 5, 18)),
        ("Jarabe para la tos", "Respiratorio", "Jarabe", 22, 7500, dt.date(2026, 12, 2)),
    ]
    ws = wb.create_sheet("Inventario")
    hoja_datos(
        ws,
        ["Medicamento", "Categoría", "Presentación", "Unidades", "Precio", "Vence", "Total", "% del total", "Estado", "Días para vencer"],
        [f + ("", "", "", "") for f in inventario],
        {5: PESOS, 6: FECHA, 7: PESOS, 8: "0.0%"},
    )
    for c in range(7, 11):
        ws.cell(row=1, column=c).fill = PatternFill("solid", fgColor=AMARILLO)
        ws.cell(row=1, column=c).font = Font(bold=True, color=NAVY)
    fin = len(inventario) + 1
    resumen = [
        ("Total de unidades", "SUMA"),
        ("Precio promedio", "PROMEDIO"),
        ("Precio más alto", "MAX"),
        ("Menos unidades", "MIN"),
        ("Medicamentos con precio", "CONTAR"),
        ("Medicamentos registrados", "CONTARA"),
        ("Antibióticos (cuántos)", "CONTAR.SI"),
        ("Unidades de analgésicos", "SUMAR.SI"),
        ("Tabletas con menos de 50 unidades", "CONTAR.SI.CONJUNTO"),
        ("Precio promedio redondeado", "REDONDEAR"),
    ]
    for i, (texto, fn) in enumerate(resumen):
        fila = fin + 2 + i
        ws.cell(row=fila, column=1, value=texto).font = Font(bold=True)
        ws.cell(row=fila, column=3, value=f"← usa {fn}").font = Font(italic=True, color="94A3B8")
        ws.cell(row=fila, column=2).fill = PatternFill("solid", fgColor="FFF6D6")
        ws.cell(row=fila, column=2).border = Border(top=borde, bottom=borde, left=borde, right=borde)

    profesionales = [
        ("P01", "Laura Méndez", "Enfermera jefe", "Enfermería"),
        ("P02", "Andrés Cárdenas", "Odontólogo", "Odontología"),
        ("P03", "Diana Rojas", "Auxiliar de enfermería", "Enfermería"),
        ("P04", "Julián Ortiz", "Regente de farmacia", "Farmacia"),
        ("P05", "Marcela Peña", "Médica general", "Consulta externa"),
        ("P06", "Camilo Suárez", "Auxiliar de salud oral", "Odontología"),
        ("P07", "Paola Herrera", "Auxiliar de farmacia", "Farmacia"),
        ("P08", "Sergio Lozano", "Médico general", "Urgencias"),
    ]
    por_area = {}
    for p in profesionales:
        por_area.setdefault(p[3], []).append(p[0])
    nombres = ["Yuliana Cárdenas", "Óscar Vega", "Carolina Espitia", "Jhon Fredy Ríos", "Marta Lucía Gómez", "Esteban Pardo",
               "Luz Dary Moreno", "Kevin Salamanca", "Sandra Milena Ruiz", "Brayan Castillo", "Gloria Inés Parra", "Felipe Arango",
               "Natalia Quintero", "Wilson Barrera", "Angie Lorena Díaz", "Hernán Toro", "Valentina Rincón", "Cristian Patiño",
               "Rosa Elena Cruz", "Mauricio León", "Daniela Vargas", "Jorge Iván Mejía", "Paula Andrea Silva", "Édgar Molina",
               "Lina María Torres", "Santiago Bernal", "Yesica Ramírez", "Fabián Correa", "Claudia Patricia Soto", "Mateo Guerrero"]
    areas = ["Enfermería", "Odontología", "Farmacia", "Consulta externa", "Urgencias"]
    turnos = []
    for i, n in enumerate(nombres):
        area = areas[rnd.choices(range(5), weights=[4, 2, 2, 3, 2])[0]]
        prioridad = rnd.choices(["Urgente", "Prioritaria", "Normal"], weights=[3, 3, 5])[0]
        estado = rnd.choices(["Atendido", "Pendiente", "Cancelado"], weights=[6, 2, 2])[0]
        eps = rnd.choice(["Nueva EPS", "Sanitas", "Compensar", "Famisanar", "Sura", "Particular"])
        turnos.append((i + 1, n, area, prioridad, estado, eps, rnd.choice(por_area[area]), ""))
    hoja_datos(wb.create_sheet("Turnos"), ["Turno", "Paciente", "Área", "Prioridad", "Estado", "Aseguradora", "Código profesional", "Profesional"], turnos)
    wb["Turnos"].cell(row=1, column=8).fill = PatternFill("solid", fgColor=AMARILLO)
    wb["Turnos"].cell(row=1, column=8).font = Font(bold=True, color=NAVY)
    hoja_datos(wb.create_sheet("Profesionales"), ["Código", "Nombre", "Cargo", "Área"], profesionales)

    instrucciones(
        wb,
        "Funciones paso a paso — archivo guiado",
        [
            "Antes de empezar: súbelo a tu Drive (TICs_Salud › Hojas de cálculo), ábrelo y usa Archivo › Guardar como Hojas de cálculo de Google.",
            "Cámbiale el nombre a Apellido_Nombre_Funciones.",
            "",
            "1. Hoja Inventario — fórmulas",
            "   G2: Total = Unidades × Precio (=D2*E2) y cópiala hasta G13 con el cuadrito azul.",
            "   H2: % del total = G2 / el total de G. Fija el total con $ (=G2/$G$14) antes de copiarla. Formato: porcentaje.",
            "   (Primero pon en G14 la suma de la columna G.)",
            "",
            "2. Hoja Inventario — funciones de resumen (columna B, debajo de la tabla)",
            "   SUMA, PROMEDIO, MAX, MIN, CONTAR y CONTARA: cada fila te dice cuál usar.",
            "",
            "3. Hoja Inventario — funciones condicionales",
            '   I2: =SI(D2<50;"Pedir";"OK")  ·  CONTAR.SI, SUMAR.SI y CONTAR.SI.CONJUNTO en el resumen.',
            "   J2: Días para vencer = F2-HOY() (formato: número). ¿Cuáles vencen en menos de 30 días?",
            "",
            "4. Hoja Turnos",
            '   Cuenta los cancelados (CONTAR.SI), los urgentes de Enfermería (CONTAR.SI.CONJUNTO) y une paciente y área con CONCATENAR o &.',
            "",
            "5. Hoja Turnos — BUSCARV / BUSCARX",
            "   H2: trae el nombre del profesional desde la hoja Profesionales con el código de G2.",
            "   =BUSCARV(G2;Profesionales!$A$2:$D$9;2;FALSO)   o   =BUSCARX(G2;Profesionales!$A$2:$A$9;Profesionales!$B$2:$B$9)",
            "",
            "Si tu hoja está en inglés: SUM, AVERAGE, COUNTIF, SUMIF, IF, VLOOKUP, XLOOKUP, ROUND, TODAY… y separa con coma.",
        ],
    )
    wb.save(SALIDA / "TICs3_Funciones.xlsx")


# ───────────────────────── 2 y 3. ATENCIONES ─────────────────────────

MESES = ["01 Ene", "02 Feb", "03 Mar", "04 Abr", "05 May", "06 Jun"]  # con número: la tabla dinámica ordena el texto A → Z


def atenciones(semilla, sedes, servicios, n, con_profesional=False):
    """Atenciones de una IPS de enero a junio de 2026."""
    rnd = random.Random(semilla)
    filas = []
    tendencia = [0.8, 0.9, 1.0, 1.15, 1.05, 1.2]
    pesos_mes = [t for t in tendencia]
    for _ in range(n):
        mes = rnd.choices(range(6), weights=pesos_mes)[0]
        dia = rnd.randint(1, 28)
        servicio, area, base = rnd.choice(servicios)
        sede = rnd.choices(sedes, weights=[3, 2, 2][: len(sedes)])[0]
        cantidad = rnd.choices([1, 2, 3], weights=[6, 3, 1])[0]
        valor = base * cantidad
        estado = rnd.choices(["Atendida", "Cancelada", "Reprogramada"], weights=[8, 1, 1])[0]
        regimen = rnd.choices(["Contributivo", "Subsidiado", "Particular"], weights=[5, 3, 2])[0]
        fila = [dt.date(2026, mes + 1, dia), MESES[mes], sede, area, servicio, regimen, cantidad, valor, estado]
        if con_profesional:
            fila.insert(6, None)
        filas.append(fila)
    filas.sort(key=lambda f: f[0])
    return filas


def archivo_atenciones():
    servicios = [
        ("Consulta de enfermería", "Enfermería", 35000),
        ("Toma de signos vitales", "Enfermería", 12000),
        ("Curación", "Enfermería", 28000),
        ("Vacunación", "Enfermería", 18000),
        ("Limpieza dental", "Odontología", 60000),
        ("Resina", "Odontología", 90000),
        ("Dispensación de medicamentos", "Farmacia", 15000),
        ("Nebulización", "Urgencias", 32000),
    ]
    filas = atenciones(7, ["Sede Centro", "Sede Norte", "Sede Sur"], servicios, 160)
    wb = Workbook()
    wb.remove(wb.active)
    hoja_datos(
        wb.create_sheet("Atenciones"),
        ["Fecha", "Mes", "Sede", "Área", "Servicio", "Régimen", "Cantidad", "Valor", "Estado"],
        filas,
        {1: FECHA, 8: PESOS},
    )
    instrucciones(
        wb,
        "Gráficos y tablas dinámicas — archivo guiado",
        [
            "Antes de empezar: súbelo a tu Drive, ábrelo y usa Archivo › Guardar como Hojas de cálculo de Google.",
            "Cámbiale el nombre a Apellido_Nombre_Atenciones. Son 160 atenciones de enero a junio de 2026.",
            "El mes lleva número delante (01 Ene, 02 Feb…) para que la tabla dinámica lo ordene bien: ordena el texto de la A a la Z.",
            "",
            "1. Tabla dinámica: ¿cuántas atenciones hubo por Área?",
            "   Selecciona A1:I161 › Insertar › Tabla dinámica › Hoja nueva. Filas: Área · Valores: Servicio, resumir por CONTARA.",
            "2. Cambia la operación: ¿cuánto se facturó por Sede? (Filas: Sede · Valores: Valor, SUMA).",
            "3. Cruza: Filas: Servicio · Columnas: Sede · Valores: Valor (SUMA).",
            "4. Filtra: agrega Estado a Filtros y deja solo «Atendida».",
            "5. Gráfico: desde una tabla dinámica de Mes × Valor, Insertar › Gráfico › Líneas.",
            "6. Control de filtros: Datos › Agregar un control de filtros › Sede. Cambia la sede y mira el gráfico.",
        ],
    )
    wb.save(SALIDA / "TICs3_Atenciones.xlsx")


def archivo_entregable():
    servicios = [
        ("Consulta de enfermería", "Enfermería", 38000),
        ("Control prenatal", "Enfermería", 42000),
        ("Toma de muestras", "Laboratorio", 25000),
        ("Higiene oral", "Odontología", 55000),
        ("Extracción", "Odontología", 80000),
        ("Entrega de medicamentos", "Farmacia", 14000),
        ("Atención inicial", "Urgencias", 65000),
    ]
    filas = atenciones(11, ["Sede Bogotá", "Sede Itagüí"], servicios, 140, con_profesional=True)
    codigos = {"Enfermería": ["E01", "E02", "E03"], "Laboratorio": ["L01"], "Odontología": ["O01", "O02"], "Farmacia": ["F01", "F02"], "Urgencias": ["U01", "U02"]}
    rnd = random.Random(12)
    for f in filas:
        f[6] = rnd.choice(codigos[f[3]])
    profesionales = [
        ("E01", "Natalia Ospina", "Enfermera jefe"),
        ("E02", "Ricardo Gómez", "Auxiliar de enfermería"),
        ("E03", "Yaneth Cifuentes", "Auxiliar de enfermería"),
        ("L01", "Mónica Arias", "Bacterióloga"),
        ("O01", "Felipe Duarte", "Odontólogo"),
        ("O02", "Leidy Gutiérrez", "Auxiliar de salud oral"),
        ("F01", "Hugo Restrepo", "Regente de farmacia"),
        ("F02", "Tatiana Mora", "Auxiliar de farmacia"),
        ("U01", "Alejandro Pinzón", "Médico general"),
        ("U02", "Carolina Vélez", "Médica general"),
    ]
    wb = Workbook()
    wb.remove(wb.active)
    filas = [f[:7] + [""] + f[7:] for f in filas]
    hoja_datos(
        wb.create_sheet("Atenciones"),
        ["Fecha", "Mes", "Sede", "Área", "Servicio", "Régimen", "Código profesional", "Profesional", "Cantidad", "Valor", "Estado"],
        filas,
        {1: FECHA, 10: PESOS},
    )
    wb["Atenciones"].cell(row=1, column=8).fill = PatternFill("solid", fgColor=AMARILLO)
    wb["Atenciones"].cell(row=1, column=8).font = Font(bold=True, color=NAVY)
    hoja_datos(wb.create_sheet("Profesionales"), ["Código", "Nombre", "Cargo"], profesionales)
    ws = wb.create_sheet("Panel", 1)
    ws["A1"] = "Panel de atenciones · enero a junio de 2026"
    ws["A1"].font = Font(bold=True, size=14, color=NAVY)
    preguntas = [
        "Total de atenciones registradas",
        "Total facturado",
        "Valor promedio por atención (redondeado, sin decimales)",
        "Atenciones canceladas",
        "% de atenciones canceladas",
        "Facturado en Sede Bogotá",
        "Facturado en Sede Itagüí",
        "Atenciones de Urgencias atendidas",
        "Atención más costosa",
    ]
    for i, p in enumerate(preguntas, start=3):
        ws.cell(row=i, column=1, value=p).font = Font(bold=True)
        ws.cell(row=i, column=2).fill = PatternFill("solid", fgColor="FFF6D6")
        ws.cell(row=i, column=2).border = Border(top=borde, bottom=borde, left=borde, right=borde)
    ws.column_dimensions["A"].width = 52
    ws.column_dimensions["B"].width = 20
    ws.sheet_properties.tabColor = NAVY
    instrucciones(
        wb,
        "Entregable 3 · Panel de atenciones",
        [
            "Súbelo a tu Drive, ábrelo y usa Archivo › Guardar como Hojas de cálculo de Google. Nombre: Apellido_Nombre_Panel.",
            "",
            "1. Hoja Atenciones: en la columna H trae el nombre del profesional con BUSCARV o BUSCARX (desde la hoja Profesionales).",
            "2. Hoja Panel: responde cada pregunta con una fórmula en la columna B (nada escrito a mano).",
            "   Pistas: CONTARA, SUMA, REDONDEAR(PROMEDIO(…);0), CONTAR.SI, SUMAR.SI, CONTAR.SI.CONJUNTO, MAX. Para el %: canceladas / total.",
            "3. Tabla dinámica en una hoja nueva: atenciones por Servicio (Filas) y Sede (Columnas), contando.",
            "4. Dos gráficos en la hoja Panel: uno de líneas con lo facturado por mes y uno circular con las atenciones por régimen.",
            "   Cada uno con un título que diga qué muestra.",
            "5. Bonus: un formato condicional que pinte de rojo las atenciones «Cancelada».",
            "",
            "Entrega: Archivo › Descargar › Microsoft Excel (.xlsx) y súbelo a Q10 como «Entregable 3: Panel de atenciones».",
        ],
    )
    wb.save(SALIDA / "TICs3_Entregable.xlsx")


if __name__ == "__main__":
    SALIDA.mkdir(parents=True, exist_ok=True)
    funciones()
    archivo_atenciones()
    archivo_entregable()
    print("Listo:", *sorted(p.name for p in SALIDA.glob("*.xlsx")))
