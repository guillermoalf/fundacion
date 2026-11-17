/**
 * Control de inventarios mensual — "FORMULARIO NO.1", con la misma disposición de las plantillas que usa la
 * fundación (1. Control de Inventarios Alimentos.xlsx y 2. Control de Inventarios Aseo.xlsx):
 *   B5 FORMULARIO NO.1 · B6 NOMBRE DE LA ORGANIZACIÓN · B8 CONTROL DE INVENTARIOS MENSUAL · H8 CONSECUTIVO · J8 #nnn-aaaa
 *   Fila 10, columnas B:J: Fecha ingreso | Producto | Número de factura | Cantidad de ingreso… | Cantidad de salida |
 *     Fecha salida | Saldo inventario | (alimentos) Nombre encargado de bodega · Fecha de recibido
 *                                       (aseo) Firma de encargado de bodega · Firma de recibido
 *   Una fila por movimiento (desde la 11; la plantilla trae 22 renglones) y al pie Responsable / Revisado por + fecha.
 */
import ExcelJS from "exceljs";

export type MovimientoInv = {
  producto_id: number;
  tipo: "entrada" | "salida" | "merma" | "ajuste";
  cantidad: number;
  fecha: string; // YYYY-MM-DD
  entregado_a?: string | null;
  motivo?: string | null;
  factura?: string | null;
  registrado_por?: string | null;
};
export type ProductoInv = { id: number; nombre: string; unidad: string };

export type FilaFormulario1 = {
  fechaIngreso: string | null;
  producto: string;
  factura: string | null;
  ingreso: number | null;
  salida: number | null;
  fechaSalida: string | null;
  saldo: number;
  encargado: string | null;
  recibido: string | null;
};

const signo = (t: MovimientoInv["tipo"]) => (t === "entrada" || t === "ajuste" ? 1 : -1);
const r3 = (n: number) => Math.round(n * 1000) / 1000;
const fechaCR = (f: string) => `${f.slice(8, 10)}/${f.slice(5, 7)}/${f.slice(0, 4)}`;

/**
 * Filas del mes "YYYY-MM" en orden de fecha. Primero el saldo que traía cada producto del mes anterior;
 * después cada entrada, salida o merma con el saldo del producto después de ese movimiento.
 */
export function filasFormulario1(productos: ProductoInv[], movs: MovimientoInv[], mes: string): FilaFormulario1[] {
  const inicio = `${mes}-01`;
  const saldo = new Map<number, number>();
  for (const m of movs.filter((x) => x.fecha < inicio)) saldo.set(m.producto_id, r3((saldo.get(m.producto_id) ?? 0) + signo(m.tipo) * m.cantidad));
  const nombre = new Map(productos.map((p) => [p.id, `${p.nombre} (${p.unidad})`]));

  const filas: FilaFormulario1[] = productos
    .filter((p) => (saldo.get(p.id) ?? 0) !== 0)
    .map((p) => ({ fechaIngreso: inicio, producto: nombre.get(p.id)!, factura: "Saldo anterior", ingreso: null, salida: null, fechaSalida: null, saldo: saldo.get(p.id)!, encargado: null, recibido: null }));

  const delMes = movs.filter((m) => m.fecha.startsWith(mes) && nombre.has(m.producto_id)).sort((a, b) => a.fecha.localeCompare(b.fecha));
  for (const m of delMes) {
    const s = r3((saldo.get(m.producto_id) ?? 0) + signo(m.tipo) * m.cantidad);
    saldo.set(m.producto_id, s);
    const entra = signo(m.tipo) > 0;
    filas.push({
      fechaIngreso: entra ? m.fecha : null,
      producto: m.tipo === "merma" ? `${nombre.get(m.producto_id)} — merma${m.motivo ? `: ${m.motivo}` : ""}` : nombre.get(m.producto_id)!,
      factura: entra ? (m.factura ?? m.motivo ?? null) : null,
      ingreso: entra ? m.cantidad : null,
      salida: entra ? null : m.cantidad,
      fechaSalida: entra ? null : m.fecha,
      saldo: s,
      encargado: m.registrado_por ?? null,
      recibido: entra ? null : (m.entregado_a ?? null),
    });
  }
  return filas;
}

const VARIANTES = {
  alimentos: { col9: "NOMBRE ENCARGADO DE BODEGA", col10: "FECHA DE RECIBIDO" },
  aseo: { col9: "FIRMA DE ENCARGADO DE BODEGA", col10: "FIRMA DE RECIBIDO" },
} as const;
export type VarianteFormulario1 = keyof typeof VARIANTES;

const RENGLONES_PLANTILLA = 22;
const borde: Partial<ExcelJS.Borders> = { top: { style: "medium" }, left: { style: "medium" }, bottom: { style: "medium" }, right: { style: "medium" } };
const bordeFino: Partial<ExcelJS.Borders> = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
const AZUL_ENCABEZADO = "FF95B3D7";

export async function generarFormulario1(opts: {
  variante: VarianteFormulario1;
  mes: string;
  filas: FilaFormulario1[];
  organizacion?: string;
}): Promise<Buffer> {
  const v = VARIANTES[opts.variante];
  const wb = new ExcelJS.Workbook();
  wb.creator = "Portal Fundación Creciendo Feliz";
  const ws = wb.addWorksheet("Hoja1", { pageSetup: { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  [3, 13.66, 15.16, 16.33, 22.5, 14.33, 14.16, 15.5, 16.33, 14.83].forEach((w, i) => (ws.getColumn(i + 1).width = w));
  const negrita = { name: "Arial", bold: true, size: 12 };

  ws.mergeCells("B5:D5");
  ws.getCell("B5").value = "FORMULARIO NO.1";
  ws.mergeCells("B6:J6");
  ws.getCell("B6").value = `NOMBRE DE LA ORGANIZACIÓN: ${opts.organizacion ?? "Fundación Creciendo Feliz"}`;
  ws.mergeCells("B8:G8");
  ws.getCell("B8").value = "CONTROL DE INVENTARIOS MENSUAL";
  ws.mergeCells("H8:I8");
  ws.getCell("H8").value = "CONSECUTIVO ";
  ws.getCell("J8").value = `#${opts.mes.slice(5, 7).padStart(3, "0")}-${opts.mes.slice(0, 4)}`;
  for (const c of ["B5", "B6", "B8", "H8", "J8"]) ws.getCell(c).font = negrita;

  const enc = ws.getRow(10);
  enc.values = [null, "FECHA INGRESO", "PRODUCTO", "NUMERO DE FACTURA", "CANTIDAD DE INGRESO EN PAQUETES,KILOS,LITROS", "CANTIDAD DE SALIDA", "FECHA SALIDA", "SALDO INVENTARIO", v.col9, v.col10];
  enc.height = 61.5;
  for (let c = 2; c <= 10; c++) {
    const celda = enc.getCell(c);
    celda.font = negrita;
    celda.alignment = { wrapText: true, vertical: "middle", horizontal: "center" };
    celda.border = borde;
    celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AZUL_ENCABEZADO } };
  }

  const renglones = Math.max(RENGLONES_PLANTILLA, opts.filas.length);
  for (let i = 0; i < renglones; i++) {
    const f = opts.filas[i];
    const fila = ws.getRow(11 + i);
    if (f) {
      fila.values = [
        null, f.fechaIngreso ? fechaCR(f.fechaIngreso) : null, f.producto, f.factura, f.ingreso, f.salida, f.fechaSalida ? fechaCR(f.fechaSalida) : null, f.saldo,
        opts.variante === "alimentos" ? f.encargado : null,
        opts.variante === "alimentos" ? (f.fechaSalida ? fechaCR(f.fechaSalida) : null) : null,
      ];
    }
    for (let c = 2; c <= 10; c++) {
      fila.getCell(c).border = bordeFino;
      fila.getCell(c).alignment = { wrapText: true, vertical: "middle" };
      fila.getCell(c).font = { name: "Arial", size: 10 };
    }
    for (const c of [5, 6, 8]) fila.getCell(c).numFmt = "#,##0.###";
  }

  const pie = 11 + renglones + 1;
  ws.getCell(`B${pie}`).value = "RESPONSABLE:";
  ws.getCell(`I${pie}`).value = "REVISADO POR:";
  ws.getCell(`B${pie + 1}`).value = "FECHA:";
  ws.getCell(`I${pie + 1}`).value = "FECHA:";
  for (const c of [`B${pie}`, `I${pie}`, `B${pie + 1}`, `I${pie + 1}`]) ws.getCell(c).font = { name: "Arial", bold: true, size: 10 };
  ws.pageSetup.printArea = `B5:J${pie + 2}`;

  return Buffer.from(await wb.xlsx.writeBuffer());
}
