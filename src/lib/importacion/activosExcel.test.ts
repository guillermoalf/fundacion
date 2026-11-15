import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { ANEXO2 } from "../catalogos/anexo2";
import { importarActivosExcel, parsearCosto, parsearFecha, parsearPlacas } from "./activosExcel";

const rutaFixture = (n: string) => new URL(`./__fixtures__/${n}`, import.meta.url);
const fixture = (n: string) => readFileSync(rutaFixture(n));
// Los fixtures son datos reales de la fundación y no están en el repo (.gitignore):
// sin ellos (p. ej. en CI) estas pruebas se saltan en vez de fallar.
const hayExcelReal = existsSync(rutaFixture("Activos_2026_PANI.xlsx"));
const hayFormatoPani = existsSync(rutaFixture("Formato_oficial_PANI.xlsx"));

describe("normalización de celdas", () => {
  it("costos escritos de mil formas", () => {
    expect(parsearCosto("₡245,588")).toBe(245588);
    expect(parsearCosto("₡4.778")).toBe(4778);
    expect(parsearCosto("₡50 708")).toBe(50708);
    expect(parsearCosto("₡1.002.998,5")).toBe(1002998.5);
    expect(parsearCosto("₡ 1.002.998.5")).toBe(1002998.5);
    expect(parsearCosto("|")).toBeNull();
  });
  it("fechas incompletas", () => {
    expect(parsearFecha("03/20")).toEqual({ fecha: "2020-03-01", aproximada: true });
    expect(parsearFecha("12/12/2021")).toEqual({ fecha: "2021-12-12", aproximada: false });
  });
  it("placas", () => {
    expect(parsearPlacas("139 (4 unidades)")).toMatchObject({ placas: ["139"], unidadesDeclaradas: 4 });
    expect(parsearPlacas("067-069-068-077-079 (compra total 8 unidades)").placas).toEqual(["067", "069", "068", "077", "079"]);
    expect(parsearPlacas("206207222262").placas).toEqual(["206", "207", "222", "262"]);
    expect(parsearPlacas("225 * 5 cámaras y un gabinete)").unidadesDeclaradas).toBe(6);
    expect(parsearPlacas("#29").placas).toEqual(["029"]);
  });
});

describe.skipIf(!hayExcelReal)("importar el Excel real de la fundación", async () => {
  // vitest recolecta los tests de una suite saltada, así que solo se lee el archivo si existe
  const r = hayExcelReal
    ? await importarActivosExcel(fixture("Activos_2026_PANI.xlsx"), { categorias: ANEXO2, corte: "2026-10-31" })
    : (undefined as never);
  const porPlaca = (p: string) => r.filas.filter((f) => f.placa === p);

  it("lee todas las filas y toma la ubicación de los títulos de sección", () => {
    expect(r.resumen.articulosEnArchivo).toBe(112);
    expect(r.resumen.activos).toBe(126);
    expect(porPlaca("088")[0]).toMatchObject({ ubicacion: "CUARTO DE PILAS", tipoBien: "LAVADORA" });
    expect(porPlaca("209")[0].ubicacion).toBe("OFICINA");
  });

  it("toda fila queda con categoría del Anexo 2", () => {
    const sin = r.filas.filter((f) => !f.categoria).map((f) => f.tipoBien);
    expect(sin).toEqual([]);
    expect(porPlaca("088")[0].categoria?.nombre).toBe("Equipo de lavandería");
    expect(porPlaca("139")[0].categoria?.nombre).toBe("Cámaras de televisión");
    expect(porPlaca("092")[0].categoria?.nombre).toMatch(/^Carruseles/);
    expect(porPlaca("204")[0].categoria?.nombre).toBe("Equipo de sonido");
    expect(porPlaca("196")[0].categoria?.nombre).toBe("Equipo electrónico especializado");
    expect(porPlaca("147")[0].categoria?.nombre).toBe("Equipo electrónico especializado");
    expect(porPlaca("048")[0].categoria?.nombre).toBe("Archivadores (todo tipo)");
    expect(porPlaca("218")[0].categoria?.nombre).toBe("Cocinas");
    expect(porPlaca("229")[0].categoria?.nombre).toBe("Equipo de refrigeración");
  });

  it("divide compras grupales declaradas y recalcula la depreciación", () => {
    expect(porPlaca("099")[0]).toMatchObject({ costo: 439995, unidadesCompra: 4, depreciacionAcumulada: 425328.5 });
    expect(porPlaca("088")[0]).toMatchObject({ costo: 273552, depreciacionAcumulada: 67248.2, valorLibros: 206303.8 });
  });

  it("los datos faltantes quedan vacíos, no en cero", () => {
    const casita = porPlaca("093")[0];
    expect(casita).toMatchObject({ costo: null, fechaAdquisicion: null, depreciacionAcumulada: null, valorLibros: null });
    expect(casita.pendientes).toContain("Sin costo de adquisición");
    const sinPlaca = r.filas.find((f) => f.tipoBien === "2 Bolillos")!;
    expect(sinPlaca.placa).toBeNull();
    expect(sinPlaca.pendientes).toContain("Sin placa");
  });

  it("marca placas repetidas", () => {
    expect(porPlaca("054")).toHaveLength(2);
    expect(porPlaca("054")[0].pendientes[0]).toMatch(/^Placa 054 repetida/);
  });
});

describe.skipIf(!hayFormatoPani)("importar el formato oficial del PANI (columna Ubicación Física)", () => {
  it("usa la columna de ubicación cuando existe", async () => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(fixture("Formato_oficial_PANI.xlsx") as any);
    const ws = wb.worksheets[0];
    ws.getRow(11).values = [, , "Silla infantil", "Pizzaplast", "S-1", "NO INDICA", "Aula 2", "301", new Date(Date.UTC(2026, 0, 15)), 25000];
    const buf = Buffer.from(await wb.xlsx.writeBuffer());
    const r = await importarActivosExcel(buf, { categorias: ANEXO2, corte: "2026-10-31" });
    expect(r.filas).toHaveLength(1);
    expect(r.filas[0]).toMatchObject({ ubicacion: "Aula 2", placa: "301", fechaAdquisicion: "2026-01-15", costo: 25000, serie: null });
    expect(r.filas[0].categoria?.nombre).toBe("Equipo de oficina y mobiliario");
    expect(r.filas[0].depreciacionAcumulada).toBe(1875); // 25000 × 10 % × 9/12
  });
});
