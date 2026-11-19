/**
 * Control de asistencia mensual de niños y niñas (Excel), para presentarlo al IMAS, al PANI u otra entidad.
 * Una fila por niño y una columna por día con lista: P (presente), A (ausente), J (justificada).
 * Al final: días con lista, presentes, ausencias, justificadas y porcentaje de asistencia.
 */
import ExcelJS from "exceljs";
import { resumenAsistencia, type EstadoAsistencia } from "@/lib/calculos/ninos";

export type FilaAsistenciaNino = {
  nombre: string;
  identificacion: string | null;
  fechaNacimiento: string | null;
  aula: string | null;
  fuente: string | null;
  porDia: Record<string, EstadoAsistencia>;
};

export const LETRA: Record<EstadoAsistencia, string> = { presente: "P", ausente: "A", justificada: "J" };
const fechaCR = (f: string) => `${f.slice(8, 10)}/${f.slice(5, 7)}/${f.slice(0, 4)}`;
const fino: Partial<ExcelJS.Borders> = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };

export async function generarAsistenciaNinos(opts: { titulo: string; subtitulo: string; dias: string[]; filas: FilaAsistenciaNino[]; organizacion?: string }): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Portal Fundación Creciendo Feliz";
  const ws = wb.addWorksheet("Asistencia", { pageSetup: { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });

  ws.getCell("A1").value = opts.organizacion ?? "Fundación Creciendo Feliz";
  ws.getCell("A2").value = opts.titulo;
  ws.getCell("A3").value = opts.subtitulo;
  ws.getCell("A1").font = { bold: true, size: 14 };
  ws.getCell("A2").font = { bold: true, size: 12 };

  const fijas = ["#", "Nombre", "Identificación", "Fecha de nacimiento", "Aula", "Subsidio"];
  const totales = ["Días con lista", "Presentes", "Ausencias", "Justificadas", "% asistencia"];
  const enc = ws.getRow(5);
  enc.values = [...fijas, ...opts.dias.map((d) => d.slice(8, 10)), ...totales];
  enc.font = { bold: true };
  enc.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  enc.height = 32;

  opts.filas.forEach((f, i) => {
    const estados = opts.dias.map((d) => f.porDia[d]).filter(Boolean) as EstadoAsistencia[];
    const r = resumenAsistencia(estados);
    ws.getRow(6 + i).values = [
      i + 1, f.nombre, f.identificacion ?? "", f.fechaNacimiento ? fechaCR(f.fechaNacimiento) : "", f.aula ?? "", f.fuente ?? "",
      ...opts.dias.map((d) => (f.porDia[d] ? LETRA[f.porDia[d]] : "")),
      r.dias, r.presentes, r.ausentes, r.justificadas, r.porcentaje === null ? "" : r.porcentaje / 100,
    ];
  });

  const ultimaCol = fijas.length + opts.dias.length + totales.length;
  for (let fila = 5; fila < 6 + opts.filas.length; fila++) {
    for (let c = 1; c <= ultimaCol; c++) ws.getRow(fila).getCell(c).border = fino;
    ws.getRow(fila).getCell(ultimaCol).numFmt = "0.0%";
  }
  ws.getColumn(1).width = 4;
  ws.getColumn(2).width = 30;
  ws.getColumn(3).width = 14;
  ws.getColumn(4).width = 12;
  ws.getColumn(5).width = 14;
  ws.getColumn(6).width = 10;
  for (let c = fijas.length + 1; c <= fijas.length + opts.dias.length; c++) {
    ws.getColumn(c).width = 4;
    ws.getColumn(c).alignment = { horizontal: "center" };
  }
  for (let c = fijas.length + opts.dias.length + 1; c <= ultimaCol; c++) ws.getColumn(c).width = 11;

  const pie = 6 + opts.filas.length + 1;
  ws.getCell(`A${pie}`).value = "P = presente · A = ausente · J = ausencia justificada. Solo se muestran los días en que se pasó lista.";
  ws.getCell(`B${pie + 2}`).value = "Responsable:";
  ws.getCell(`E${pie + 2}`).value = "Firma:";
  ws.getCell(`B${pie + 3}`).value = "Fecha:";
  ws.views = [{ state: "frozen", xSplit: 2, ySplit: 5 }];
  return Buffer.from(await wb.xlsx.writeBuffer());
}
