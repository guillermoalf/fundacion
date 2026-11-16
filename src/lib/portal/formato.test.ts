import { describe, expect, it } from "vitest";
import { cantidad, colones, fecha, fechaHora, instanteDesdeCR, mesLargo, partesCR, rangoMes, relojCR } from "./formato";

const sinEspacios = (s: string | null) => s?.replace(/\s/g, " ");

describe("formato es-CR", () => {
  it("colones con dos decimales y null si falta", () => {
    expect(sinEspacios(colones(1234567.891))).toBe("₡1 234 567,89");
    expect(sinEspacios(colones("50000"))).toBe("₡50 000,00");
    expect(colones(null)).toBeNull();
    expect(colones("")).toBeNull();
    expect(sinEspacios(colones(0))).toBe("₡0,00");
  });
  it("cantidades", () => {
    expect(sinEspacios(cantidad("12.500"))).toBe("12,5");
    expect(cantidad(null)).toBeNull();
  });
  it("fechas", () => {
    expect(fecha("2026-11-16")).toBe("16/11/2026");
    expect(fecha(null)).toBeNull();
    // 02:30 UTC del 17 = 20:30 del 16 en Costa Rica
    expect(fechaHora("2026-11-17T02:30:00Z")).toContain("16/11/2026");
    expect(fechaHora("2026-11-17T02:30:00Z")).toContain("20:30");
  });
  it("hora de Costa Rica para los cálculos", () => {
    const p = partesCR(new Date("2026-11-17T02:30:00Z"));
    expect(p.ymd).toBe("2026-11-16");
    expect(p.hhmm).toBe("20:30");
    const r = relojCR(new Date("2026-11-16T13:07:00Z"));
    expect([r.getDate(), r.getHours(), r.getMinutes()]).toEqual([16, 7, 7]);
    expect(instanteDesdeCR("2026-11-16T07:05")).toBe("2026-11-16T13:05:00.000Z");
  });
  it("meses", () => {
    expect(mesLargo("2026-02")).toBe("febrero 2026");
    expect(rangoMes("2026-02")).toEqual({ desde: "2026-02-01", hasta: "2026-02-28" });
    expect(rangoMes("2024-02").hasta).toBe("2024-02-29");
  });
});
