import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { filasFormulario1, generarFormulario1, type MovimientoInv } from "./controlInventario";
import { filasLimpieza, generarControlLimpieza } from "./controlLimpieza";

const productos = [
  { id: 1, nombre: "Arroz", unidad: "kg" },
  { id: 2, nombre: "Leche", unidad: "litro" },
];
const movs: MovimientoInv[] = [
  { producto_id: 1, tipo: "entrada", cantidad: 50, fecha: "2026-10-05" },
  { producto_id: 1, tipo: "salida", cantidad: 20, fecha: "2026-10-20" },
  { producto_id: 1, tipo: "entrada", cantidad: 25, fecha: "2026-11-02", factura: "F-77", registrado_por: "Ana" },
  { producto_id: 1, tipo: "salida", cantidad: 12.5, fecha: "2026-11-10", entregado_a: "Cocinera", registrado_por: "Ana" },
  { producto_id: 1, tipo: "merma", cantidad: 1, fecha: "2026-11-15", motivo: "vencido" },
  { producto_id: 2, tipo: "entrada", cantidad: 10, fecha: "2026-12-01" },
];

describe("Formulario N.º 1 (control de inventarios mensual)", () => {
  it("empieza con el saldo anterior y lleva el saldo después de cada movimiento", () => {
    const f = filasFormulario1(productos, movs, "2026-11");
    expect(f.map((x) => [x.factura, x.ingreso, x.salida, x.saldo])).toEqual([
      ["Saldo anterior", null, null, 30],
      ["F-77", 25, null, 55],
      [null, null, 12.5, 42.5],
      [null, null, 1, 41.5],
    ]);
    expect(f[3].producto).toContain("merma: vencido");
    expect(f[2].recibido).toBe("Cocinera");
  });

  it("genera el Excel con la disposición de la plantilla (alimentos y aseo)", async () => {
    for (const variante of ["alimentos", "aseo"] as const) {
      const buf = await generarFormulario1({ variante, mes: "2026-11", filas: filasFormulario1(productos, movs, "2026-11") });
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buf as unknown as ArrayBuffer);
      const ws = wb.getWorksheet("Hoja1")!;
      expect(ws.getCell("B5").value).toBe("FORMULARIO NO.1");
      expect(ws.getCell("B8").value).toBe("CONTROL DE INVENTARIOS MENSUAL");
      expect(ws.getCell("J8").value).toBe("#011-2026");
      expect(ws.getCell("B10").value).toBe("FECHA INGRESO");
      expect(ws.getCell("I10").value).toBe(variante === "alimentos" ? "NOMBRE ENCARGADO DE BODEGA" : "FIRMA DE ENCARGADO DE BODEGA");
      expect(ws.getCell("C12").value).toBe("Arroz (kg)");
      expect(ws.getCell("B34").value).toBe("RESPONSABLE:"); // 22 renglones como la plantilla
    }
  });
});

describe("Control mensual de limpieza (Word)", () => {
  const limpieza = [
    { id: 10, nombre: "Germicida", unidad: "galón" },
    { id: 11, nombre: "Crystal", unidad: "galón" },
    { id: 12, nombre: "Escoba", unidad: "unidad" },
  ];
  const ml: MovimientoInv[] = [
    { producto_id: 10, tipo: "entrada", cantidad: 4, fecha: "2026-10-30" },
    { producto_id: 10, tipo: "entrada", cantidad: 6, fecha: "2026-11-03" },
    { producto_id: 10, tipo: "salida", cantidad: 3, fecha: "2026-11-20" },
  ];
  it("saldo anterior + recibido − consumido = saldo final, en el orden de la plantilla", () => {
    const f = filasLimpieza(limpieza, ml, "2026-11-01", "2026-11-30");
    expect(f.map((x) => x.producto)).toEqual(["Crystal", "Germicida"]);
    expect(f[1]).toEqual({ producto: "Germicida", saldoAnterior: 4, recibida: 6, consumida: 3, saldoFinal: 7 });
  });
  it("genera el documento con la tabla y los datos del pedido", async () => {
    const buf = await generarControlLimpieza({ desde: "2026-11-01", hasta: "2026-11-30", pedidos: [{ fecha: "2026-11-03", proveedor: "Higiene 365", factura: "A-9" }], filas: filasLimpieza(limpieza, ml, "2026-11-01", "2026-11-30") });
    const xml = await (await JSZip.loadAsync(buf)).file("word/document.xml")!.async("string");
    for (const texto of ["CONTROL MENSUAL DE INVENTARIO Y CONSUMO DE PRODUCTOS DE LIMPIEZA", "Saldo anterior", "Cantidad consumida", "Higiene 365", "A-9", "Autorizado por"]) expect(xml).toContain(texto);
  });
});
