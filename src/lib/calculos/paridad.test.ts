import { describe, expect, it } from "vitest";
import { calcularDepreciacion, type MetodoDepreciacion } from "./depreciacion";
import casos from "./paridad-sql.json";

// La ficha del activo usa calcularDepreciacion (TS) y el reporte PANI usa depreciacion_acumulada (SQL):
// deben dar el mismo número al céntimo. paridad-sql.json se genera con scripts/generar-paridad-depreciacion.ts.
describe("depreciación: TypeScript = SQL", () => {
  it(`coincide al céntimo en ${casos.length} casos`, () => {
    const distintos = casos.filter((c) => {
      const ts = calcularDepreciacion({ ...c, metodo: c.metodo as MetodoDepreciacion }, c.corte).depreciacionAcumulada;
      return ts !== c.sql;
    });
    expect(distintos).toEqual([]);
  });
});
