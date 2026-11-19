import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { calcularDepreciacion, calendarioDepreciacion, mesesDepreciados } from "./depreciacion";
import { calcularAguinaldo, calcularCargas, calcularVacaciones, detectarTardias, horasTrabajadas, pagoPatronoIncapacidadCCSS } from "./planilla";
import { generarAuxiliarPani } from "../export/auxiliarPani";

describe("depreciación", () => {
  it("reproduce los valores del Excel de la fundación (corte 30/06/2025)", () => {
    // Laptop HP: compra 12/12/2021, ₡1.759.980, 20 % → 42 meses → 70 %
    expect(calcularDepreciacion({ costo: 1_759_980, tasaAnual: 20, aniosVida: 5, fechaAdquisicion: "2021-12-12" }, "2025-06-30").depreciacionAcumulada).toBe(1_231_986);
    // Gabinete: 12/12/2021, ₡1.234.975, 10 % → 35 %
    expect(calcularDepreciacion({ costo: 1_234_975, tasaAnual: 10, aniosVida: 10, fechaAdquisicion: "2021-12-12" }, "2025-06-30").depreciacionAcumulada).toBe(432_241.25);
    // Cocina de juguete: 24/04/2022, ₡238.985, 20 % → 38 meses
    expect(calcularDepreciacion({ costo: 238_985, tasaAnual: 20, aniosVida: 5, fechaAdquisicion: "2022-04-24" }, "2025-06-30").depreciacionAcumulada).toBe(151_357.17);
  });

  it("coincide con la función SQL (lavadora al 31/10/2026, 5 %)", () => {
    const r = calcularDepreciacion({ costo: 273_552, tasaAnual: 5, aniosVida: 20, fechaAdquisicion: "2021-11-08" }, "2026-10-31");
    expect(r).toMatchObject({ mesesDepreciados: 59, depreciacionAcumulada: 67_248.2, valorLibros: 206_303.8 });
  });

  it("no deprecia el mes de compra ni antes de comprar", () => {
    expect(mesesDepreciados("2026-10-15", "2026-10-31")).toBe(0);
    expect(mesesDepreciados("2026-12-01", "2026-10-31")).toBe(0);
  });

  it("tope en el costo y respeta valor residual", () => {
    const r = calcularDepreciacion({ costo: 1000, valorResidual: 100, tasaAnual: 20, aniosVida: 5, fechaAdquisicion: "2015-01-10" }, "2026-10-31");
    expect(r.depreciacionAcumulada).toBe(900);
    expect(r.valorLibros).toBe(100);
    expect(r.totalmenteDepreciado).toBe(true);
  });

  it("suma de los dígitos de los años (igual que SQL: 700)", () => {
    const r = calcularDepreciacion({ costo: 1500, tasaAnual: 20, aniosVida: 5, metodo: "suma_digitos", fechaAdquisicion: "2020-01-15" }, "2021-07-31");
    expect(r.depreciacionAcumulada).toBe(700);
  });

  it("congela la depreciación en la fecha de baja", () => {
    const a = { costo: 1200, tasaAnual: 10, aniosVida: 10, fechaAdquisicion: "2024-01-05", fechaBaja: "2024-07-31" };
    expect(calcularDepreciacion(a, "2026-10-31").depreciacionAcumulada).toBe(60);
  });

  it("calendario anual suma el costo total", () => {
    const cal = calendarioDepreciacion({ costo: 100_000, tasaAnual: 20, aniosVida: 5, fechaAdquisicion: "2024-03-10" });
    expect(cal.at(-1)!.acumulada).toBe(100_000);
    expect(cal[0].depreciacionAnio).toBe(15_000); // abril–diciembre = 9 meses
  });
});

describe("planilla", () => {
  it("aguinaldo = salarios de dic a nov ÷ 12, ignora meses fuera del periodo", () => {
    const sal = [
      { mes: "2025-11-01", monto: 999_999 }, // fuera
      ...Array.from({ length: 12 }, (_, i) => ({ mes: `${i === 0 ? 2025 : 2026}-${String(i === 0 ? 12 : i).padStart(2, "0")}-01`, monto: 400_000 })),
      { mes: "2026-12-01", monto: 999_999 }, // fuera
    ];
    expect(calcularAguinaldo(sal, 2026)).toBe(400_000);
  });

  it("aguinaldo proporcional para quien entró en junio", () => {
    const sal = ["06", "07", "08", "09", "10", "11"].map((m) => ({ mes: `2026-${m}-01`, monto: 360_000 }));
    expect(calcularAguinaldo(sal, 2026)).toBe(180_000);
  });

  it("vacaciones proporcionales", () => {
    expect(calcularVacaciones({ fechaIngreso: "2025-03-10", corte: "2026-03-10", diasHabilesAnuales: 10, diasTomados: 3 })).toEqual({ saldoInicial: 0, diasGanados: 10, diasTomados: 3, saldo: 7 });
    expect(calcularVacaciones({ fechaIngreso: "2026-01-01", corte: "2026-07-01", diasHabilesAnuales: 12, diasTomados: 2, saldoInicial: 8.5 }).saldo).toBe(12.5);
    expect(calcularVacaciones({ fechaIngreso: "2026-01-15", corte: "2026-07-14", diasHabilesAnuales: 12, diasTomados: 0 }).diasGanados).toBe(5);
  });

  it("cargas sociales 2026", () => {
    expect(calcularCargas(500_000, { obreroPct: 10.83, patronalPct: 26.83 })).toEqual({ ccssObrero: 54_150, cargasPatronales: 134_150, costoTotalPatrono: 634_150 });
  });

  it("incapacidad CCSS: el patrono solo paga hasta 3 días", () => {
    expect(pagoPatronoIncapacidadCCSS(300_000, 7, 50)).toBe(15_000);
  });

  it("tardías con tolerancia", () => {
    const horario = [1, 2, 3, 4, 5].map((d) => ({ diaSemana: d, horaEntrada: "07:00" }));
    const marcas = [
      { tipo: "entrada" as const, marcadoEn: new Date(2026, 10, 2, 7, 4) }, // lunes, dentro de tolerancia
      { tipo: "entrada" as const, marcadoEn: new Date(2026, 10, 3, 7, 22) }, // martes, tarde
      { tipo: "entrada" as const, marcadoEn: new Date(2026, 10, 3, 13, 0) }, // segunda entrada, se ignora
      { tipo: "entrada" as const, marcadoEn: new Date(2026, 10, 7, 9, 0) }, // sábado, sin horario
    ];
    expect(detectarTardias(marcas, horario, 5)).toEqual([{ fecha: "2026-11-03", horaEsperada: "07:00", horaMarcada: "07:22", minutosTarde: 22 }]);
  });

  it("horas trabajadas y marcas sin pareja", () => {
    const d = (h: number, m = 0) => new Date(2026, 10, 3, h, m);
    expect(horasTrabajadas([{ tipo: "entrada", marcadoEn: d(7) }, { tipo: "salida", marcadoEn: d(12) }, { tipo: "entrada", marcadoEn: d(13) }, { tipo: "salida", marcadoEn: d(16, 30) }])).toEqual({ horas: 8.5, inconsistente: false });
    expect(horasTrabajadas([{ tipo: "entrada", marcadoEn: d(7) }]).inconsistente).toBe(true);
  });
});

describe("export Auxiliar PANI", () => {
  it("genera las columnas oficiales y totales correctos", async () => {
    const buf = await generarAuxiliarPani(
      [
        { tipoBien: "LAVADORA", marca: "FRIGIDAIRE", modelo: "L16Y", serie: "12320576", ubicacion: "Cuarto de pilas", placa: "088", fechaAdquisicion: "2021-11-08", costo: 273_552, depreciacionAcumulada: 67_248.2 },
        { tipoBien: "LAPTOP", marca: "HP", modelo: null, serie: null, ubicacion: "Aula 1 After II", placa: "099", fechaAdquisicion: "2021-12-12", costo: 439_995, depreciacionAcumulada: 425_328.5 },
      ],
      { corte: "2026-10-31", programa: "Fundación Creciendo Feliz ABC" },
    );
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as any);
    const ws = wb.getWorksheet("Auxiliar Activos Fijos")!;
    expect((ws.getRow(10).values as any[]).slice(2).map((v) => String(v).trim())).toEqual([
      "Tipo de bien", "Marca", "Modelo", "Serie", "Ubicación Física", "Placa", "Fecha de adquisición", "Costo de adquisición", "Depreciación acumulada", "Valor en Libros",
    ]);
    expect(ws.getCell("A5").value).toBe("Al 31 de octubre de 2026");
    expect(ws.getCell("F11").value).toBe("Aula 1 After II"); // ordenado por ubicación
    expect(ws.getCell("D11").value).toBe("NO INDICA");
    expect((ws.getCell("I13").value as any).result).toBe(713_547);
    expect((ws.getCell("K13").value as any).result).toBe(220_970.3);
  });
});

import { repartoSalario, repartirMonto } from "./planilla";
describe("salario pagado por varios fondos", () => {
  it("PANI paga un monto fijo e IMAS el resto", () => {
    const r = repartoSalario(800000, [{ fuenteId: 1, monto: 500000 }, { fuenteId: 2, monto: null }]);
    expect(r.ok && r.reparto).toEqual([{ fuenteId: 1, monto: 500000, proporcion: 0.625 }, { fuenteId: 2, monto: 300000, proporcion: 0.375 }]);
  });
  it("avisa si no cuadra", () => {
    expect(repartoSalario(800000, [{ fuenteId: 1, monto: 900000 }]).ok).toBe(false);
    expect(repartoSalario(800000, [{ fuenteId: 1, monto: 500000 }]).ok).toBe(false);
    expect(repartoSalario(800000, [{ fuenteId: 1, monto: null }, { fuenteId: 2, monto: null }]).ok).toBe(false);
  });
  it("divide cualquier monto con las mismas proporciones sin perder céntimos", () => {
    const p = repartirMonto(100, [1 / 3, 2 / 3]);
    expect(p).toEqual([33.33, 66.67]);
    expect(p[0] + p[1]).toBeCloseTo(100, 2);
  });
});

import { repartirLinea } from "./planilla";
describe("planilla por fondos", () => {
  it("parte cada monto de la línea con las mismas proporciones", () => {
    const [a, b] = repartirLinea({ bruto: 800000, neto: 712000.01, dias: 30 }, [0.625, 0.375], ["dias"]);
    expect(a).toEqual({ bruto: 500000, neto: 445000.01, dias: 30 });
    expect(b).toEqual({ bruto: 300000, neto: 267000, dias: 30 });
  });
});
