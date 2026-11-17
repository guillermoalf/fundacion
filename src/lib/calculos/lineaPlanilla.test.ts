import { describe, expect, it } from "vitest";
import { calcularImpuestoRenta, calcularLineaPlanilla } from "./planilla";

const parametros = { ccssObreroPct: 10.83, ccssPatronalPct: 26.83, incapacidadPatronoPctDias1a3: 50, licenciaMaternidadPatronoPct: 50, aguinaldoDivisor: 12, vacacionesDiasAnuales: 10 };
const base = { salarioMensual: 450000, diasSinGoce: 0, diasIncapacidadCCSS: 0, diasIncapacidadCCSSPatrono: 0, diasIncapacidadINS: 0, diasLicenciaMaternidad: 0, parametros };

describe("línea de planilla", () => {
  it("mes completo sin novedades", () => {
    const l = calcularLineaPlanilla(base);
    expect(l.salarioBruto).toBe(450000);
    expect(l.ccssObrero).toBe(48735); // 10,83 %
    expect(l.cargasPatronales).toBe(120735); // 26,83 %
    expect(l.salarioNeto).toBe(401265);
    expect(l.provisionAguinaldo).toBe(37500);
    expect(l.provisionVacaciones).toBe(12500); // 15 000 diarios × 10/12
    expect(l.diasLaborados).toBe(30);
  });
  it("rebaja 2 días sin goce", () => {
    const l = calcularLineaPlanilla({ ...base, diasSinGoce: 2 });
    expect(l.rebajoAusencias).toBe(30000);
    expect(l.salarioBruto).toBe(420000);
    expect(l.diasLaborados).toBe(28);
  });
  it("incapacidad CCSS de 5 días: rebaja los 5 y el patrono paga el 50 % de 3, sin cargas sobre ese pago", () => {
    const l = calcularLineaPlanilla({ ...base, diasIncapacidadCCSS: 5, diasIncapacidadCCSSPatrono: 5 });
    expect(l.rebajoAusencias).toBe(75000);
    expect(l.pagoIncapacidadPatrono).toBe(22500); // 15 000 × 3 × 50 %
    expect(l.salarioBruto).toBe(397500);
    expect(l.ccssObrero).toBe(40612.5); // 10,83 % de 375 000 (el pago del patrono no lleva cargas)
  });
  it("horas extra, tardías, renta y otras deducciones", () => {
    const l = calcularLineaPlanilla({ ...base, montoHorasExtra: 10000, rebajoTardias: 5000, impuestoRenta: 1000, otrasDeducciones: 2000 });
    expect(l.salarioBruto).toBe(455000);
    expect(l.salarioNeto).toBe(455000 - 49276.5 - 1000 - 2000);
  });
  it("el rebajo nunca pasa el salario", () => {
    expect(calcularLineaPlanilla({ ...base, diasSinGoce: 40 }).salarioBruto).toBe(0);
  });
});

// Decreto 45333-H, tramos mensuales 2026
const TRAMOS_2026 = [
  { desde: 0, hasta: 918000, tasa: 0 },
  { desde: 918000, hasta: 1347000, tasa: 10 },
  { desde: 1347000, hasta: 2364000, tasa: 15 },
  { desde: 2364000, hasta: 4727000, tasa: 20 },
  { desde: 4727000, hasta: null, tasa: 25 },
];

describe("impuesto sobre la renta al salario", () => {
  it("exento hasta el primer tramo", () => {
    expect(calcularImpuestoRenta(450000, TRAMOS_2026)).toBe(0);
    expect(calcularImpuestoRenta(918000, TRAMOS_2026)).toBe(0);
  });
  it("grava solo el exceso de cada tramo", () => {
    expect(calcularImpuestoRenta(1000000, TRAMOS_2026)).toBe(8200);
    expect(calcularImpuestoRenta(2500000, TRAMOS_2026)).toBe(42900 + 152550 + 27200);
    expect(calcularImpuestoRenta(5000000, TRAMOS_2026)).toBe(42900 + 152550 + 472600 + 68250);
  });
  it("la planilla lo calcula sola y el ajuste manual lo reemplaza", () => {
    const auto = calcularLineaPlanilla({ ...base, salarioMensual: 1000000, tramosRenta: TRAMOS_2026 });
    expect(auto.impuestoRenta).toBe(8200);
    expect(calcularLineaPlanilla({ ...base, salarioMensual: 1000000, tramosRenta: TRAMOS_2026, impuestoRenta: 5000 }).impuestoRenta).toBe(5000);
    expect(calcularLineaPlanilla({ ...base, salarioMensual: 1000000, tramosRenta: null }).impuestoRenta).toBe(0);
  });
});
