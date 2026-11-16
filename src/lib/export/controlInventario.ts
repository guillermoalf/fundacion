/**
 * Control mensual de inventario (alimentos — Formulario 1 — y limpieza).
 * NOTA: las plantillas originales (data/plantillas/) no estaban disponibles al construir esto; el formato
 * sigue un control de inventario estándar (saldo inicial, entradas, salidas, mermas, saldo final + entregas).
 * Ajustar encabezados cuando se comparen con las plantillas reales (ver docs/PROGRESO.md).
 */
import ExcelJS from "exceljs";

export type MovimientoInv = {
  producto_id: number;
  tipo: "entrada" | "salida" | "merma" | "ajuste";
  cantidad: number;
  fecha: string; // YYYY-MM-DD
  entregado_a?: string | null;
  motivo?: string | null;
};
export type ProductoInv = { id: number; nombre: string; unidad: string; categoria: string };

export type FilaControl = {
  producto: string;
  unidad: string;
  inicial: number;
  entradas: number;
  salidas: number;
  mermas: number;
  final: number;
};

const signo = (t: MovimientoInv["tipo"]) => (t === "entrada" || t === "ajuste" ? 1 : -1);
const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** Saldos del mes "YYYY-MM" por producto a partir de todos los movimientos (los anteriores dan el saldo inicial). */
export function resumenMensual(productos: ProductoInv[], movs: MovimientoInv[], mes: string): FilaControl[] {
  return productos
    .map((p) => {
      const suyos = movs.filter((m) => m.producto_id === p.id);
      const antes = suyos.filter((m) => m.fecha < `${mes}-01`);
      const delMes = suyos.filter((m) => m.fecha.startsWith(mes));
      const inicial = r3(antes.reduce((s, m) => s + signo(m.tipo) * m.cantidad, 0));
      const entradas = r3(delMes.filter((m) => m.tipo === "entrada" || m.tipo === "ajuste").reduce((s, m) => s + m.cantidad, 0));
      const salidas = r3(delMes.filter((m) => m.tipo === "salida").reduce((s, m) => s + m.cantidad, 0));
      const mermas = r3(delMes.filter((m) => m.tipo === "merma").reduce((s, m) => s + m.cantidad, 0));
      return { producto: p.nombre, unidad: p.unidad, inicial, entradas, salidas, mermas, final: r3(inicial + entradas - salidas - mermas) };
    })
    .filter((f) => f.inicial !== 0 || f.entradas !== 0 || f.salidas !== 0 || f.mermas !== 0);
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export async function generarControlInventario(opts: {
  titulo: string;
  mes: string;
  filas: FilaControl[];
  entregas: { fecha: string; producto: string; cantidad: number; unidad: string; entregado_a: string | null; motivo: string | null }[];
  organizacion?: string;
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Portal Fundación Creciendo Feliz";
  const ws = wb.addWorksheet("Control mensual");
  const [y, m] = opts.mes.split("-").map(Number);
  ws.mergeCells("A1:H1");
  ws.getCell("A1").value = opts.organizacion ?? "Fundación Creciendo Feliz";
  ws.mergeCells("A2:H2");
  ws.getCell("A2").value = opts.titulo;
  ws.mergeCells("A3:H3");
  ws.getCell("A3").value = `Mes: ${MESES[m - 1]} ${y}`;
  for (const c of ["A1", "A2", "A3"]) {
    ws.getCell(c).font = { bold: true, size: c === "A2" ? 14 : 12 };
    ws.getCell(c).alignment = { horizontal: "center" };
  }
  const enc = ["N.º", "Producto", "Unidad", "Saldo inicial", "Entradas", "Salidas", "Mermas / vencidos", "Saldo final"];
  ws.getRow(5).values = enc;
  ws.getRow(5).font = { bold: true };
  ws.getRow(5).eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDDEBF7" } };
    c.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
    c.alignment = { wrapText: true, vertical: "middle", horizontal: "center" };
  });
  opts.filas.forEach((f, i) => {
    const row = ws.getRow(6 + i);
    row.values = [i + 1, f.producto, f.unidad, f.inicial, f.entradas, f.salidas, f.mermas, f.final];
    row.eachCell((c) => (c.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }));
  });
  [6, 36, 12, 14, 12, 12, 16, 14].forEach((w, i) => (ws.getColumn(i + 1).width = w));
  for (let c = 4; c <= 8; c++) ws.getColumn(c).numFmt = "#,##0.###";
  const pie = 6 + opts.filas.length + 2;
  ws.getCell(`B${pie}`).value = "Elaborado por: ______________________";
  ws.getCell(`F${pie}`).value = "Revisado por: ______________________";

  const we = wb.addWorksheet("Entregas del mes");
  we.getRow(1).values = ["Fecha", "Producto", "Cantidad", "Unidad", "Entregado a", "Motivo", "Firma de quien recibe"];
  we.getRow(1).font = { bold: true };
  opts.entregas.forEach((e, i) => {
    const [ey, em, ed] = e.fecha.split("-");
    we.getRow(2 + i).values = [`${ed}/${em}/${ey}`, e.producto, e.cantidad, e.unidad, e.entregado_a ?? "", e.motivo ?? "", ""];
  });
  [12, 36, 10, 10, 24, 30, 24].forEach((w, i) => (we.getColumn(i + 1).width = w));

  return Buffer.from(await wb.xlsx.writeBuffer());
}
