import { describe, expect, it } from "vitest";
import { CONFIG_INICIAL, conteoActivos, filtrarActivos, type ActivoReporte } from "./activos";
import { agruparCompras, filtrarCompras, resumenInventario, type LineaCompra } from "./inventario";

const linea = (o: Partial<LineaCompra>): LineaCompra => ({
  id: "1", compraId: "c", fecha: "2026-11-10", factura: "F1", proveedorId: 1, proveedor: "Carnicería", fuente: "JPS", descripcion: "Carne molida",
  producto: "Carne molida", categoria: "carnes", categoriaNombre: "Carnes", cantidad: 2, unidad: "kg", precioConIva: 3000, total: 6000, ...o,
});

describe("reportes de compras", () => {
  const lineas = [linea({}), linea({ id: "2", categoria: "lacteos", categoriaNombre: "Lácteos", descripcion: "Leche", total: 1000 }),
    linea({ id: "3", fecha: "2026-10-30" }), linea({ id: "4", proveedorId: 2, proveedor: "Súper", fuente: "PANI", total: null })];
  it("filtra por período, categoría, fondo y proveedor", () => {
    expect(filtrarCompras(lineas, { ...CONFIG_INICIAL, categoriasProducto: ["carnes"] }, "2026-11-01", "2026-11-30").map((l) => l.id)).toEqual(["1", "4"]);
    expect(filtrarCompras(lineas, { ...CONFIG_INICIAL, fuentes: ["JPS"], proveedores: [1] }, "2026-11-01", "2026-11-30").map((l) => l.id)).toEqual(["1", "2"]);
  });
  it("agrupa y suma sin inventar montos faltantes", () => {
    const g = agruparCompras(filtrarCompras(lineas, CONFIG_INICIAL, "2026-11-01", "2026-11-30"), "proveedor");
    expect(g.map((x) => [x.titulo, x.total])).toEqual([["Carnicería", 7000], ["Súper", 0]]);
  });
});

describe("reporte de inventario", () => {
  it("calcula saldo inicial, entradas, salidas y final del período", () => {
    const r = resumenInventario([{ id: 1, nombre: "Leche", categoria: "lacteos", categoriaNombre: "Lácteos", unidad: "L" }], [
      { productoId: 1, fecha: "2026-10-05", tipo: "entrada", cantidad: 10 }, { productoId: 1, fecha: "2026-10-20", tipo: "salida", cantidad: 4 },
      { productoId: 1, fecha: "2026-11-02", tipo: "entrada", cantidad: 5 }, { productoId: 1, fecha: "2026-11-15", tipo: "merma", cantidad: 1 },
      { productoId: 1, fecha: "2026-12-01", tipo: "salida", cantidad: 9 },
    ], CONFIG_INICIAL, "2026-11-01", "2026-11-30");
    expect(r[0]).toMatchObject({ inicial: 6, entradas: 5, salidas: 1, ajustes: 0, final: 10 });
  });
});

describe("conteo de activos", () => {
  const a = (o: Partial<ActivoReporte>): ActivoReporte => ({
    id: "x", tipoBien: "Silla de bebé para comer", marca: null, modelo: null, serie: null, placa: null, fuente: "PANI", ubicacionId: 1, ubicacion: "Aula 1",
    categoriaId: null, categoria: null, estado: "en_uso", fechaAdquisicion: "2025-01-01", fechaBaja: null, costo: 1000, unidades: 1, totalLinea: null, depreciacion: 0, ...o,
  });
  it("busca sin tildes y cuenta por aula y estado", () => {
    const todos = [a({}), a({ ubicacion: "Aula 2" }), a({ estado: "en_reparacion" }), a({ estado: "dado_de_baja", fechaBaja: "2026-01-01" }), a({ tipoBien: "Mesa" })];
    const { filas } = filtrarActivos(todos, { ...CONFIG_INICIAL, buscar: "SILLA", incluirBajas: true }, "2026-11-27", null);
    const c = conteoActivos(filas, "2026-11-27");
    expect(c.total).toBe(4);
    expect(c.porEstado).toMatchObject({ en_uso: 2, en_reparacion: 1, dado_de_baja: 1 });
    expect(c.porUbicacion.map((u) => [u.ubicacion, u.total])).toEqual([["Aula 1", 3], ["Aula 2", 1]]);
  });
});
