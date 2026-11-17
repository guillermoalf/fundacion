/** Planilla en Excel agrupada por fuente de financiamiento (para liquidar a PANI, IMAS, JPS…). */
import ExcelJS from "exceljs";

export type LineaExport = {
  fuente: string; nombre: string; cedula: string; puesto: string; dias: number; base: number; rebajos: number; extras: number;
  incapacidad: number; bruto: number; ccss: number; renta: number; otras: number; neto: number; cargas: number; provAguinaldo: number; provVacaciones: number;
};

const COLUMNAS: [keyof LineaExport, string, number][] = [
  ["nombre", "Nombre", 30], ["cedula", "Cédula", 14], ["puesto", "Puesto", 18], ["dias", "Días laborados", 10], ["base", "Salario base", 14],
  ["rebajos", "Rebajos", 12], ["extras", "Horas extra", 12], ["incapacidad", "Pago incapacidad/licencia", 14], ["bruto", "Salario bruto", 14],
  ["ccss", "CCSS obrero", 13], ["renta", "Impuesto renta", 12], ["otras", "Otras deducciones", 12], ["neto", "Salario neto", 14],
  ["cargas", "Cargas patronales", 14], ["provAguinaldo", "Provisión aguinaldo", 14], ["provVacaciones", "Provisión vacaciones", 14],
];
const NUMERICAS = COLUMNAS.filter(([k]) => !["nombre", "cedula", "puesto", "dias"].includes(k)).map(([k]) => k);

export async function generarPlanillaPorFuente(opts: { titulo: string; periodo: string; estado: string; lineas: LineaExport[] }): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Portal Fundación Creciendo Feliz";
  const ws = wb.addWorksheet("Planilla");
  ws.addRow(["Fundación Creciendo Feliz"]).font = { bold: true, size: 13 };
  ws.addRow([opts.titulo]).font = { bold: true, size: 12 };
  ws.addRow([`Periodo: ${opts.periodo} · Estado: ${opts.estado}`]);
  ws.addRow([]);
  COLUMNAS.forEach(([, , w], i) => (ws.getColumn(i + 1).width = w));
  const fuentes = [...new Set(opts.lineas.map((l) => l.fuente))].sort();
  const totalGeneral: Partial<Record<keyof LineaExport, number>> = {};
  for (const f of fuentes) {
    ws.addRow([`Fuente: ${f}`]).font = { bold: true, color: { argb: "FF1F4E79" } };
    const enc = ws.addRow(COLUMNAS.map(([, t]) => t));
    enc.font = { bold: true };
    enc.eachCell((c) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDDEBF7" } }; c.alignment = { wrapText: true, vertical: "middle" }; });
    const suyas = opts.lineas.filter((l) => l.fuente === f);
    for (const l of suyas) ws.addRow(COLUMNAS.map(([k]) => l[k]));
    const sub: Partial<Record<keyof LineaExport, number>> = {};
    for (const k of NUMERICAS) {
      sub[k] = Math.round(suyas.reduce((s, l) => s + (l[k] as number), 0) * 100) / 100;
      totalGeneral[k] = Math.round(((totalGeneral[k] ?? 0) + sub[k]!) * 100) / 100;
    }
    const filaSub = ws.addRow(COLUMNAS.map(([k], i) => (i === 0 ? `Subtotal ${f}` : NUMERICAS.includes(k) ? sub[k] : null)));
    filaSub.font = { bold: true };
    ws.addRow([]);
  }
  const tot = ws.addRow(COLUMNAS.map(([k], i) => (i === 0 ? "TOTAL GENERAL" : NUMERICAS.includes(k) ? totalGeneral[k] : null)));
  tot.font = { bold: true };
  for (let c = 5; c <= COLUMNAS.length; c++) ws.getColumn(c).numFmt = "#,##0.00";
  return Buffer.from(await wb.xlsx.writeBuffer());
}
