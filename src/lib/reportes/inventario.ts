/**
 * Reportes de compras e inventario: filtros y totales (sin base de datos, se prueban aparte).
 * El período (desde–hasta) se escoge al ver o exportar el reporte; las especificaciones fijas viven en ConfigReporte.
 */
import { contiene, type ConfigReporte } from "./activos";

export type LineaCompra = {
  id: string; compraId: string; fecha: string; factura: string; proveedorId: number; proveedor: string; fuente: string;
  descripcion: string; producto: string | null; categoria: string | null; categoriaNombre: string | null;
  cantidad: number; unidad: string; precioConIva: number | null; total: number | null;
};

/** Líneas de compra del período que cumplen las especificaciones. */
export function filtrarCompras(lineas: LineaCompra[], c: ConfigReporte, desde: string, hasta: string) {
  return lineas.filter((l) => {
    if (l.fecha < desde || l.fecha > hasta) return false;
    if (c.fuentes.length && !c.fuentes.includes(l.fuente)) return false;
    if (c.proveedores.length && !c.proveedores.includes(l.proveedorId)) return false;
    if (c.categoriasProducto.length && (!l.categoria || !c.categoriasProducto.includes(l.categoria))) return false;
    return contiene([l.descripcion, l.producto], c.buscar);
  });
}

/** Grupos (por proveedor o categoría) con su total, en orden alfabético. */
export function agruparCompras(lineas: LineaCompra[], modo: ConfigReporte["agruparCompras"]) {
  const clave = (l: LineaCompra) => (modo === "proveedor" ? l.proveedor : modo === "categoria" ? l.categoriaNombre ?? "Sin categoría" : "");
  const grupos = new Map<string, LineaCompra[]>();
  for (const l of lineas) grupos.set(clave(l), [...(grupos.get(clave(l)) ?? []), l]);
  return [...grupos].sort((x, y) => x[0].localeCompare(y[0], "es")).map(([titulo, items]) => ({
    titulo: modo === "ninguno" ? null : titulo,
    items: items.sort((x, y) => x.fecha.localeCompare(y.fecha) || x.descripcion.localeCompare(y.descripcion, "es")),
    total: sumar(items.map((i) => i.total)),
  }));
}

/** Suma de montos; los que faltan no se inventan (se cuentan aparte). */
export const sumar = (v: (number | null)[]) => v.reduce<number>((s, x) => s + (x ?? 0), 0);

export type MovimientoInventario = { productoId: number; fecha: string; tipo: "entrada" | "salida" | "merma" | "ajuste"; cantidad: number };
export type ProductoInventario = { id: number; nombre: string; categoria: string; categoriaNombre: string; unidad: string };

/** Por producto: saldo al inicio del período, entradas, salidas (incluye mermas), ajustes y saldo al final. */
export function resumenInventario(productos: ProductoInventario[], movs: MovimientoInventario[], c: ConfigReporte, desde: string, hasta: string) {
  const filas = productos
    .filter((p) => (!c.categoriasProducto.length || c.categoriasProducto.includes(p.categoria)) && contiene([p.nombre], c.buscar))
    .map((p) => ({ ...p, inicial: 0, entradas: 0, salidas: 0, ajustes: 0, final: 0 }));
  const porId = new Map(filas.map((f) => [f.id, f]));
  for (const m of movs) {
    const f = porId.get(m.productoId);
    if (!f || m.fecha > hasta) continue;
    const signo = m.tipo === "entrada" || m.tipo === "ajuste" ? m.cantidad : -m.cantidad;
    if (m.fecha < desde) { f.inicial += signo; continue; }
    if (m.tipo === "entrada") f.entradas += m.cantidad;
    else if (m.tipo === "ajuste") f.ajustes += m.cantidad;
    else f.salidas += m.cantidad;
  }
  for (const f of filas) f.final = f.inicial + f.entradas - f.salidas + f.ajustes;
  return filas
    .filter((f) => f.inicial || f.entradas || f.salidas || f.ajustes || f.final)
    .sort((x, y) => x.categoriaNombre.localeCompare(y.categoriaNombre, "es") || x.nombre.localeCompare(y.nombre, "es"));
}
