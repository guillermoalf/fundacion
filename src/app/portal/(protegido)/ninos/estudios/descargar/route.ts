import ExcelJS from "exceljs";
import { conUsuario } from "@/lib/db";
import { obtenerUsuario } from "@/lib/portal/sesion";
import { XLSX_MIME } from "@/lib/export/auxiliarPani";
import { estudiosPani } from "@/lib/portal/estudios";
import { fecha, hoyCR } from "@/lib/portal/formato";
import { ESTADOS_ESTUDIO } from "../../datos";

/** Estudios socioeconómicos de los niños PANI en Excel. Ruta sin punto y con revisión de sesión; el RLS decide qué se ve. */
export async function GET() {
  const usuario = await obtenerUsuario();
  if (!usuario) return new Response("Inicie sesión para descargar.", { status: 401 });
  const hoy = hoyCR();
  const { estudios } = await conUsuario(usuario.id, (tx) => estudiosPani(tx, hoy));
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Estudios");
  ws.addRow(["Fundación Creciendo Feliz"]).font = { bold: true, size: 13 };
  ws.addRow([`Estudios socioeconómicos de niños y niñas PANI · al ${fecha(hoy)}`]).font = { bold: true };
  ws.addRow([]);
  const enc = ws.addRow(["#", "Niño o niña", "Aula", "Estado", "Elaborado", "Vence", "Días que faltan", "Trabajador(a) social"]);
  enc.font = { bold: true };
  [4, 34, 16, 26, 12, 12, 14, 28].forEach((w, i) => (ws.getColumn(i + 1).width = w));
  [...estudios].sort((a, b) => (a.vence ?? "").localeCompare(b.vence ?? "")).forEach((e, i) => {
    ws.addRow([i + 1, e.nombre, e.aula ?? "", ESTADOS_ESTUDIO[e.estado].texto, e.ultimo ? fecha(e.ultimo.fecha) : "", fecha(e.vence) ?? "", e.diasRestantes ?? "", e.ultimo?.trabajador ?? ""]);
  });
  const buf = await wb.xlsx.writeBuffer();
  return new Response(new Uint8Array(buf as ArrayBuffer), {
    headers: { "Content-Type": XLSX_MIME, "Content-Disposition": `attachment; filename="Estudios_socioeconomicos_${hoy}.xlsx"`, "Cache-Control": "no-store" },
  });
}
