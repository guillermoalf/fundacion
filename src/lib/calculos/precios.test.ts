import { describe, expect, it } from "vitest";
import { ivaPorLinea, prorratearIva, variacion } from "./precios";

describe("IVA por línea", () => {
  it("reparte el IVA en proporción y la suma da exacto", () => {
    const p = prorratearIva([100, 100, 100], 10);
    expect(p.reduce((s, x) => s + x, 0)).toBeCloseTo(10, 2);
    expect(p).toEqual([3.34, 3.33, 3.33]);
    expect(prorratearIva([0, 0], 5)).toEqual([0, 0]);
  });
  it("usa el IVA de la factura electrónica cuando cuadra", () => {
    expect(ivaPorLinea([{ monto: 1000, iva: 10 }, { monto: 1000, iva: 130 }], 140)).toEqual([10, 130]);
    expect(ivaPorLinea([{ monto: 1000, iva: 10 }, { monto: 1000 }], 140)).toEqual([70, 70]);
  });
  it("calcula la variación del precio", () => {
    expect(variacion(108, 100)).toBe(8);
    expect(variacion(95, 100)).toBe(-5);
    expect(variacion(100, null)).toBeNull();
  });
});
