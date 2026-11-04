/**
 * Exporta el "Auxiliar de activos fijos Recursos PANI" con las columnas EXACTAS del formato oficial
 * entregado por el PANI (B10:K10):
 *   Tipo de bien | Marca | Modelo | Serie | Ubicación Física | Placa | Fecha de adquisición |
 *   Costo de adquisición | Depreciación acumulada | Valor en Libros
 *
 * Uso en una Route Handler de Next.js:
 *   const { data } = await supabase.rpc("activos_al_corte", { p_corte: "2026-10-31", p_fuente: "PANI" });
 *   const buf = await generarAuxiliarPani(data.map(filaDesdeRpc), { corte: "2026-10-31", programa: "Fundación Creciendo Feliz ABC" });
 *   return new Response(buf, { headers: { "Content-Type": XLSX_MIME, "Content-Disposition": 'attachment; filename="Auxiliar_PANI_2026-10-31.xlsx"' } });
 */
import ExcelJS from "exceljs";
import { aFecha } from "../calculos/depreciacion";

export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export interface FilaAuxiliar {
  tipoBien: string;
  marca: string | null;
  modelo: string | null;
  serie: string | null;
  ubicacion: string | null;
  placa: string | null;
  fechaAdquisicion: string | null; // YYYY-MM-DD
  /** null = dato faltante: la celda queda vacía, no se inventa un valor */
  costo: number | null;
  depreciacionAcumulada: number | null;
}

export interface Pendiente {
  placa: string | null;
  tipoBien: string;
  ubicacion: string | null;
  pendiente: string;
}

/** Mapea una fila del RPC `activos_al_corte` (snake_case) al formato del reporte. */
export const filaDesdeRpc = (r: Record<string, any>): FilaAuxiliar => ({
  tipoBien: r.tipo_bien,
  marca: r.marca,
  modelo: r.modelo,
  serie: r.serie,
  ubicacion: r.ubicacion,
  placa: r.placa,
  fechaAdquisicion: r.fecha_adquisicion,
  costo: r.costo === null ? null : Number(r.costo),
  depreciacionAcumulada: r.depreciacion_acumulada === null ? null : Number(r.depreciacion_acumulada),
});

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const NO_INDICA = "NO INDICA";

export async function generarAuxiliarPani(
  filas: FilaAuxiliar[],
  opts: {
    corte: string;
    programa: string;
    organizacion?: string;
    representanteLegal?: string;
    cargo?: string;
    /** si se pasa, agrega una segunda hoja "Pendientes" para uso interno (no se entrega al PANI) */
    pendientes?: Pendiente[];
  },
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Portal Fundación Creciendo Feliz";
  const ws = wb.addWorksheet("Auxiliar Activos Fijos", { views: [{ state: "frozen", ySplit: 10 }] });
  const corte = aFecha(opts.corte);

  ws.mergeCells("A1:K1");
  ws.getCell("A1").value = "Auxiliar de activos fijos Recursos PANI";
  ws.mergeCells("A4:K4");
  ws.getCell("A4").value = opts.organizacion ?? "Fundación Creciendo Feliz";
  ws.mergeCells("A5:K5");
  ws.getCell("A5").value = `Al ${corte.getDate()} de ${MESES[corte.getMonth()]} de ${corte.getFullYear()}`;
  for (const c of ["A1", "A4", "A5"]) {
    ws.getCell(c).font = { bold: true, size: 12 };
    ws.getCell(c).alignment = { horizontal: "center" };
  }
  ws.getCell("B8").value = "Programa:";
  ws.getCell("B8").font = { bold: true };
  ws.getCell("C8").value = opts.programa;

  const headers = ["Tipo de bien ", "Marca", "Modelo", "Serie", "Ubicación Física ", "Placa ", "Fecha de adquisición ", "Costo de adquisición ", "Depreciación acumulada ", "Valor en Libros "];
  const borde = { style: "thin" as const, color: { argb: "FF999999" } };
  const border = { top: borde, left: borde, bottom: borde, right: borde };
  headers.forEach((h, i) => {
    const c = ws.getRow(10).getCell(i + 2);
    c.value = h;
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E78" } };
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    c.border = border;
  });

  const ordenadas = [...filas].sort((a, b) =>
    (a.ubicacion ?? "").localeCompare(b.ubicacion ?? "", "es") || (a.placa ?? "").localeCompare(b.placa ?? "", "es", { numeric: true }));
  const primera = 11;
  ordenadas.forEach((f, i) => {
    const n = primera + i;
    const row = ws.getRow(n);
    row.getCell(2).value = f.tipoBien;
    row.getCell(3).value = f.marca || NO_INDICA;
    row.getCell(4).value = f.modelo || NO_INDICA;
    row.getCell(5).value = f.serie || NO_INDICA;
    row.getCell(6).value = f.ubicacion;
    row.getCell(7).value = f.placa;
    if (f.fechaAdquisicion) {
      row.getCell(8).value = aFecha(f.fechaAdquisicion);
      row.getCell(8).numFmt = "dd/mm/yyyy";
    }
    row.getCell(9).value = f.costo;
    row.getCell(10).value = f.depreciacionAcumulada;
    // Valor en libros como fórmula: el revisor puede verificar el cálculo en la misma hoja
    if (f.costo !== null && f.depreciacionAcumulada !== null)
      row.getCell(11).value = { formula: `I${n}-J${n}`, result: Math.round((f.costo - f.depreciacionAcumulada) * 100) / 100 };
    for (let c = 2; c <= 11; c++) row.getCell(c).border = border;
    for (const c of [9, 10, 11]) row.getCell(c).numFmt = '"₡"#,##0.00';
  });

  const ultima = primera + ordenadas.length - 1;
  const tot = ws.getRow(ultima + 1);
  tot.getCell(8).value = "TOTAL";
  tot.getCell(8).font = { bold: true };
  const suma = (k: "costo" | "depreciacionAcumulada" | "vl") =>
    ordenadas.reduce((a, f) => {
      if (k !== "vl") return a + (f[k] ?? 0);
      return f.costo !== null && f.depreciacionAcumulada !== null ? a + f.costo - f.depreciacionAcumulada : a;
    }, 0);
  ([["I", "costo"], ["J", "depreciacionAcumulada"], ["K", "vl"]] as const).forEach(([col, k]) => {
    const c = ws.getCell(`${col}${ultima + 1}`);
    c.value = { formula: `SUM(${col}${primera}:${col}${ultima})`, result: Math.round(suma(k) * 100) / 100 };
    c.font = { bold: true };
    c.numFmt = '"₡"#,##0.00';
  });

  ws.getCell(`B${ultima + 6}`).value = opts.representanteLegal ?? "MSc. Marta Chaverri Corrales";
  ws.getCell(`B${ultima + 7}`).value = opts.cargo ?? "Representante legal";

  [3, 34, 18, 18, 22, 22, 9, 13, 16, 16, 16].forEach((w, i) => (ws.getColumn(i + 1).width = w));
  ws.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: "10:10" };

  if (opts.pendientes?.length) {
    const hp = wb.addWorksheet("Pendientes");
    hp.addRow(["Placa", "Artículo", "Ubicación", "Pendiente"]);
    hp.getRow(1).eachCell((c) => {
      c.font = { bold: true, color: { argb: "FFFFFFFF" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E78" } };
    });
    for (const p of opts.pendientes) hp.addRow([p.placa ?? "—", p.tipoBien, p.ubicacion ?? "", p.pendiente]);
    [10, 40, 28, 110].forEach((w, i) => (hp.getColumn(i + 1).width = w));
    hp.getColumn(4).alignment = { wrapText: true, vertical: "top" };
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}
