import { describe, expect, it } from "vitest";
import { ausenciasSeguidas, edad, resumenAsistencia, textoEdad } from "./ninos";

describe("edad", () => {
  it("cuenta años y meses cumplidos", () => {
    expect(edad("2023-05-20", "2026-11-19")).toEqual({ anios: 3, meses: 5 });
    expect(edad("2023-05-19", "2026-11-19")).toEqual({ anios: 3, meses: 6 });
    expect(edad(null, "2026-11-19")).toBeNull();
  });
  it("se escribe en palabras", () => {
    expect(textoEdad({ anios: 1, meses: 0 })).toBe("1 año");
    expect(textoEdad({ anios: 0, meses: 11 })).toBe("11 meses");
    expect(textoEdad({ anios: 3, meses: 1 })).toBe("3 años y 1 mes");
  });
});

describe("asistencia", () => {
  it("resume el período", () => {
    expect(resumenAsistencia(["presente", "presente", "ausente", "justificada"])).toEqual({ dias: 4, presentes: 2, ausentes: 1, justificadas: 1, porcentaje: 50 });
    expect(resumenAsistencia([]).porcentaje).toBeNull();
  });
  it("cuenta las ausencias seguidas más recientes", () => {
    expect(ausenciasSeguidas([
      { fecha: "2026-11-17", estado: "ausente" }, { fecha: "2026-11-19", estado: "ausente" },
      { fecha: "2026-11-18", estado: "ausente" }, { fecha: "2026-11-16", estado: "presente" },
    ])).toBe(3);
    expect(ausenciasSeguidas([{ fecha: "2026-11-19", estado: "justificada" }, { fecha: "2026-11-18", estado: "ausente" }])).toBe(0);
  });
});

import { estadoEstudio } from "./ninos";
describe("estudio socioeconómico", () => {
  const r = { vigenciaAnios: 5, avisoDias: 180, urgenteDias: 90 };
  it("vence a los 5 años y avisa a los 6 y 3 meses", () => {
    expect(estadoEstudio("2022-03-01", "2026-11-24", r)).toEqual({ estado: "aviso", vence: "2027-03-01", diasRestantes: 97 });
  });
  it("cada estado", () => {
    expect(estadoEstudio(null, "2026-11-24", r).estado).toBe("falta");
    expect(estadoEstudio("2021-11-24", "2026-11-24", r).estado).toBe("vencido");
    expect(estadoEstudio("2022-02-01", "2026-11-24", r).estado).toBe("urgente");
    expect(estadoEstudio("2022-05-01", "2026-11-24", r).estado).toBe("aviso");
    expect(estadoEstudio("2024-01-01", "2026-11-24", r).estado).toBe("vigente");
    expect(estadoEstudio("2020-02-29", "2024-01-01", { ...r, vigenciaAnios: 5 }).vence).toBe("2025-02-28");
  });
});
