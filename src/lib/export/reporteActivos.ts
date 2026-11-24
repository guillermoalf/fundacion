/**
 * Reporte de activos con el formato del «Auxiliar de activos fijos» que usa la fundación con el PANI
 * (Activos 2026 PANI.xlsx): título en A2, organización en A5, año en A6, «Programa:» en B9, encabezados en B11:J11
 * (Tipo de bien | Marca | Modelo | Serie | Placa | Fecha de adquisición | Costo de adquisición | Depreciación acumulada |
 * Valor en Libros), una sección por aula (fila de color) con sus activos, el TOTAL y la firma del representante legal.
 * Century Gothic 11 en todo. Los datos que faltan quedan vacíos (nunca se inventan).
 */
import ExcelJS from "exceljs";
import { aFecha } from "../calculos/depreciacion";

export type GrupoReporte = { titulo: string | null; items: FilaReporte[] };
export type FilaReporte = {
  tipoBien: string; marca: string | null; modelo: string | null; serie: string | null; placa: string | null;
  fechaAdquisicion: string | null; costo: number | null; depreciacion: number | null;
};

const FUENTE = "Century Gothic";
const NEGRO = { argb: "FF000000" };
const fino = { style: "thin" as const, color: NEGRO };
const borde: Partial<ExcelJS.Borders> = { top: fino, left: fino, bottom: fino, right: fino };
const MONEDA = '"₡"#,##0.00';
const NO_INDICA = "NO INDICA";

export async function generarReporteActivos(grupos: GrupoReporte[], opts: {
  titulo: string; organizacion?: string; corte: string; programa: string; representanteLegal?: string; cargo?: string;
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Portal Fundación Creciendo Feliz";
  const ws = wb.addWorksheet("Activos", { views: [{ state: "frozen", ySplit: 11 }] });
  [5.16, 34.16, 25.33, 21.16, 43.16, 18.16, 24.5, 17.5, 18.5, 17.16].forEach((w, i) => (ws.getColumn(i + 1).width = w));

  const encabezado = (celda: string, valor: string | number) => {
    ws.mergeCells(`${celda}:J${celda.slice(1)}`);
    const c = ws.getCell(celda);
    c.value = valor;
    c.font = { name: FUENTE, size: 16, bold: true, color: NEGRO };
    c.alignment = { horizontal: "center", vertical: "middle" };
  };
  encabezado("A2", opts.titulo);
  encabezado("A5", opts.organizacion ?? "Fundación Creciendo Feliz");
  encabezado("A6", aFecha(opts.corte).getFullYear());
  ws.getCell("B9").value = "Programa:";
  ws.getCell("B9").font = { name: FUENTE, size: 11, bold: true, color: NEGRO };
  ws.getCell("B9").alignment = { horizontal: "right", vertical: "middle" };
  ws.getCell("C9").value = opts.programa;
  ws.getCell("C9").font = { name: FUENTE, size: 11, color: NEGRO };
  ws.getCell("C9").border = { bottom: fino };

  const titulos = ["Tipo de bien ", "Marca", "Modelo", "Serie", "Placa ", "Fecha de adquisición ", "Costo de adquisición ", "Depreciación acumulada ", "Valor en Libros "];
  titulos.forEach((t, i) => {
    const c = ws.getRow(11).getCell(i + 2);
    c.value = t;
    c.font = { name: FUENTE, size: 11, bold: true };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFBFBFBF" } };
    c.alignment = { horizontal: i === 5 || i === 6 ? "left" : "center", wrapText: true };
    c.border = borde;
  });

  let n = 12;
  const primera = n;
  for (const g of grupos) {
    if (g.titulo !== null) {
      const fila = ws.getRow(n++);
      fila.getCell(2).value = g.titulo;
      for (let col = 2; col <= 10; col++) {
        const c = fila.getCell(col);
        c.font = { name: FUENTE, size: 11, bold: true };
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFB4A7D6" } };
        c.alignment = { horizontal: "left" };
        c.border = borde;
      }
    }
    for (const a of g.items) {
      const fila = ws.getRow(n);
      fila.getCell(2).value = a.tipoBien;
      fila.getCell(3).value = a.marca || NO_INDICA;
      fila.getCell(4).value = a.modelo || NO_INDICA;
      fila.getCell(5).value = a.serie || NO_INDICA;
      fila.getCell(6).value = a.placa;
      if (a.fechaAdquisicion) {
        fila.getCell(7).value = aFecha(a.fechaAdquisicion);
        fila.getCell(7).numFmt = "dd/mm/yyyy";
      }
      fila.getCell(8).value = a.costo;
      fila.getCell(9).value = a.depreciacion;
      if (a.costo !== null && a.depreciacion !== null) fila.getCell(10).value = { formula: `H${n}-I${n}`, result: Math.round((a.costo - a.depreciacion) * 100) / 100 };
      for (let col = 2; col <= 10; col++) {
        const c = fila.getCell(col);
        c.font = { name: FUENTE, size: 11 };
        c.alignment = { horizontal: "left" };
        c.border = borde;
        if (col >= 8) c.numFmt = MONEDA;
      }
      n++;
    }
  }

  const ultima = n - 1;
  const items = grupos.flatMap((g) => g.items);
  const total = ws.getRow(n);
  total.getCell(2).value = "TOTAL";
  const suma = (f: (a: FilaReporte) => number | null) => Math.round(items.reduce((s, a) => s + (f(a) ?? 0), 0) * 100) / 100;
  ([["H", (a: FilaReporte) => a.costo], ["I", (a: FilaReporte) => a.depreciacion], ["J", (a: FilaReporte) => (a.costo !== null && a.depreciacion !== null ? a.costo - a.depreciacion : null)]] as const)
    .forEach(([col, f]) => {
      const c = ws.getCell(`${col}${n}`);
      c.value = { formula: `SUM(${col}${primera}:${col}${Math.max(primera, ultima)})`, result: suma(f) };
      c.numFmt = MONEDA;
    });
  for (let col = 2; col <= 10; col++) {
    const c = total.getCell(col);
    c.font = { name: FUENTE, size: 11, bold: true };
    c.border = borde;
  }

  ws.getCell(`B${n + 8}`).value = opts.representanteLegal ?? "MSc. Marta Chaverri Corrales";
  ws.getCell(`B${n + 9}`).value = opts.cargo ?? "Representante legal";
  for (const c of [`B${n + 8}`, `B${n + 9}`]) ws.getCell(c).font = { name: FUENTE, size: 11, bold: true };

  ws.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: "11:11" };
  return Buffer.from(await wb.xlsx.writeBuffer());
}
