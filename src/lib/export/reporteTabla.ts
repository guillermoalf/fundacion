/**
 * Excel simple para los reportes internos (compras, inventario, conteo de activos): título, subtítulo, encabezados,
 * secciones opcionales con su subtotal y el total al final. Los datos que faltan quedan vacíos (nunca se inventan).
 */
import ExcelJS from "exceljs";
import { aFecha } from "../calculos/depreciacion";

export type ColumnaExcel = { titulo: string; ancho: number; tipo?: "texto" | "fecha" | "moneda" | "numero" };
export type Valor = string | number | null;
export type SeccionExcel = { titulo: string | null; filas: Valor[][]; subtotal?: Valor[] };

const MONEDA = '"₡"#,##0.00';
const NUMERO = "#,##0.##";
const fino = { style: "thin" as const, color: { argb: "FFBFBFBF" } };
const borde: Partial<ExcelJS.Borders> = { top: fino, left: fino, bottom: fino, right: fino };

export async function generarReporteTabla(opts: {
  hoja: string; titulo: string; subtitulo: string; columnas: ColumnaExcel[]; secciones: SeccionExcel[]; total?: Valor[];
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Portal Fundación Creciendo Feliz";
  const ws = wb.addWorksheet(opts.hoja.slice(0, 31), { views: [{ state: "frozen", ySplit: 4 }] });
  const n = opts.columnas.length;
  opts.columnas.forEach((c, i) => (ws.getColumn(i + 1).width = c.ancho));

  ws.mergeCells(1, 1, 1, n);
  Object.assign(ws.getCell(1, 1), { value: opts.titulo, font: { size: 14, bold: true } });
  ws.mergeCells(2, 1, 2, n);
  Object.assign(ws.getCell(2, 1), { value: opts.subtitulo, font: { size: 11, color: { argb: "FF475569" } } });

  const encabezado = ws.getRow(4);
  opts.columnas.forEach((c, i) => {
    const celda = encabezado.getCell(i + 1);
    celda.value = c.titulo;
    celda.font = { bold: true };
    celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFBFBFBF" } };
    celda.border = borde;
    celda.alignment = { vertical: "middle", wrapText: true, horizontal: c.tipo === "moneda" || c.tipo === "numero" ? "right" : "left" };
  });

  let fila = 5;
  const escribir = (valores: Valor[], estilo?: { negrita?: boolean; relleno?: string }) => {
    const r = ws.getRow(fila++);
    opts.columnas.forEach((c, i) => {
      const v = valores[i] ?? null;
      const celda = r.getCell(i + 1);
      celda.value = v === null ? null : c.tipo === "fecha" && typeof v === "string" ? aFecha(v) : v;
      if (c.tipo === "moneda") celda.numFmt = MONEDA;
      if (c.tipo === "numero") celda.numFmt = NUMERO;
      if (c.tipo === "fecha") celda.numFmt = "dd/mm/yyyy";
      celda.border = borde;
      if (estilo?.negrita) celda.font = { bold: true };
      if (estilo?.relleno) celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: estilo.relleno } };
    });
  };
  for (const s of opts.secciones) {
    if (s.titulo !== null) {
      ws.mergeCells(fila, 1, fila, n);
      const c = ws.getCell(fila, 1);
      c.value = s.titulo;
      c.font = { bold: true };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFB4A7D6" } };
      fila++;
    }
    for (const v of s.filas) escribir(v);
    if (s.subtotal) escribir(s.subtotal, { negrita: true, relleno: "FFF1F5F9" });
  }
  if (opts.total) escribir(opts.total, { negrita: true, relleno: "FFE2E8F0" });
  return Buffer.from(await wb.xlsx.writeBuffer());
}
