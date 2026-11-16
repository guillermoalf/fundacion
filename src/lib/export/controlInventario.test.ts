import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { generarControlInventario, resumenMensual, type MovimientoInv } from "./controlInventario";

const productos = [
  { id: 1, nombre: "Arroz", unidad: "kg", categoria: "no_perecedero" },
  { id: 2, nombre: "Leche", unidad: "litro", categoria: "perecedero" },
  { id: 3, nombre: "Sin movimiento", unidad: "kg", categoria: "no_perecedero" },
];
const movs: MovimientoInv[] = [
  { producto_id: 1, tipo: "entrada", cantidad: 50, fecha: "2026-10-05" },
  { producto_id: 1, tipo: "salida", cantidad: 20, fecha: "2026-10-20" },
  { producto_id: 1, tipo: "entrada", cantidad: 25, fecha: "2026-11-02" },
  { producto_id: 1, tipo: "salida", cantidad: 12.5, fecha: "2026-11-10" },
  { producto_id: 1, tipo: "merma", cantidad: 1, fecha: "2026-11-15" },
  { producto_id: 2, tipo: "entrada", cantidad: 10, fecha: "2026-12-01" },
];

describe("control mensual de inventario", () => {
  it("calcula saldo inicial con lo anterior y el movimiento del mes", () => {
    const [arroz] = resumenMensual(productos, movs, "2026-11");
    expect(arroz).toEqual({ producto: "Arroz", unidad: "kg", inicial: 30, entradas: 25, salidas: 12.5, mermas: 1, final: 41.5 });
  });
  it("no lista productos sin saldo ni movimiento en el mes", () => {
    expect(resumenMensual(productos, movs, "2026-11").map((f) => f.producto)).toEqual(["Arroz"]);
  });
  it("genera el Excel con encabezados y entregas", async () => {
    const buf = await generarControlInventario({
      titulo: "Control de inventario de alimentos", mes: "2026-11", filas: resumenMensual(productos, movs, "2026-11"),
      entregas: [{ fecha: "2026-11-10", producto: "Arroz", cantidad: 12.5, unidad: "kg", entregado_a: "Cocinera", motivo: null }],
    });
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    const ws = wb.getWorksheet("Control mensual")!;
    expect(ws.getCell("A3").value).toBe("Mes: noviembre 2026");
    expect(ws.getRow(6).values).toEqual([undefined, 1, "Arroz", "kg", 30, 25, 12.5, 1, 41.5]);
    expect(wb.getWorksheet("Entregas del mes")!.getCell("E2").value).toBe("Cocinera");
  });
});
