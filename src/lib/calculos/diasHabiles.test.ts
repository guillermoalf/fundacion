import { describe, expect, it } from "vitest";
import { diasHabiles } from "./planilla";

describe("días hábiles", () => {
  it("cuenta de lunes a viernes, ambas fechas incluidas", () => {
    expect(diasHabiles("2026-11-16", "2026-11-20")).toBe(5); // lunes a viernes
    expect(diasHabiles("2026-11-16", "2026-11-22")).toBe(5); // con fin de semana
    expect(diasHabiles("2026-11-21", "2026-11-22")).toBe(0); // sábado y domingo
  });
  it("incluye sábado si la jornada lo tiene y resta feriados", () => {
    expect(diasHabiles("2026-11-16", "2026-11-22", { incluyeSabado: true })).toBe(6);
    expect(diasHabiles("2026-12-21", "2026-12-25", { feriados: ["2026-12-25"] })).toBe(4);
  });
  it("devuelve 0 si las fechas están al revés", () => {
    expect(diasHabiles("2026-11-20", "2026-11-16")).toBe(0);
  });
});
