import { describe, expect, it } from "vitest";
import { agrupar, CONFIG_INICIAL, filtrarActivos, normalizarConfig, type ActivoReporte } from "./activos";

const base: ActivoReporte = {
  id: "1", tipoBien: "Silla", marca: null, modelo: null, serie: null, placa: "1", fuente: "PANI", ubicacionId: 1, ubicacion: "Aula 1",
  categoriaId: 2, categoria: "Mobiliario", estado: "en_uso", fechaAdquisicion: "2026-01-10", fechaBaja: null, costo: 50000, unidades: null, totalLinea: 150000, depreciacion: 0,
};
const a = (o: Partial<ActivoReporte>) => ({ ...base, ...o });

describe("reportes de activos", () => {
  it("PANI activos 2026: solo PANI y cada unidad desde el 25 % del salario base", () => {
    const c = normalizarConfig({ fuentes: ["PANI"], montoMinimo: { tipo: "umbral" }, montoBase: "unidad" });
    const r = filtrarActivos([a({ id: "tv", costo: 200000 }), a({ id: "silla", costo: 50000 }), a({ id: "imas", fuente: "IMAS", costo: 300000 }), a({ id: "sin", costo: null })], c, "2026-11-24", 115550);
    expect(r.filas.map((x) => x.id)).toEqual(["tv"]);
    expect(r.sinCosto).toBe(1);
  });
  it("por total de la línea: 3 sillas de ₡50 000 suman ₡150 000", () => {
    const c = normalizarConfig({ montoMinimo: { tipo: "monto", valor: 115550 }, montoBase: "linea" });
    expect(filtrarActivos([a({})], c, "2026-11-24", null).filas).toHaveLength(1);
  });
  it("si el costo cubría varias unidades, compara el de una", () => {
    const c = normalizarConfig({ montoMinimo: { tipo: "monto", valor: 100000 } });
    expect(filtrarActivos([a({ costo: 300000, unidades: 3 })], c, "2026-11-24", null).filas).toHaveLength(1);
    expect(filtrarActivos([a({ costo: 240000, unidades: 3 })], c, "2026-11-24", null).filas).toHaveLength(0);
  });
  it("deja fuera los dados de baja, lo comprado después del corte y lo que no cumple los filtros", () => {
    const c = normalizarConfig({ ubicaciones: [1], adquiridoDesde: "2026-01-01" });
    const r = filtrarActivos([a({ id: "ok" }), a({ id: "baja", estado: "dado_de_baja" }), a({ id: "futuro", fechaAdquisicion: "2027-01-01" }),
      a({ id: "otra", ubicacionId: 2 }), a({ id: "vieja", fechaAdquisicion: "2025-05-01" })], c, "2026-11-24", null);
    expect(r.filas.map((x) => x.id)).toEqual(["ok"]);
  });
  it("agrupa aula por aula en orden alfabético", () => {
    const g = agrupar([a({ id: "1", ubicacion: "Oficina" }), a({ id: "2", ubicacion: "Aula 1" }), a({ id: "3", ubicacion: null })], "ubicacion");
    expect(g.map((x) => x.titulo)).toEqual(["Aula 1", "Oficina", "Sin ubicación"]);
  });
  it("una configuración dañada vuelve a los valores por defecto", () => {
    expect(normalizarConfig("basura")).toEqual(CONFIG_INICIAL);
    expect(normalizarConfig({ montoMinimo: { tipo: "monto", valor: -5 } }).montoMinimo).toEqual({ tipo: "ninguno" });
  });
});
