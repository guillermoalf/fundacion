import { conUsuario } from "@/lib/db";
import { obtenerUsuario } from "@/lib/portal/sesion";
import { XLSX_MIME } from "@/lib/export/auxiliarPani";
import { generarAsistenciaNinos } from "@/lib/export/asistenciaNinos";
import { asistenciaDelMes } from "@/lib/portal/ninos";
import { hoyCR, mesLargo } from "@/lib/portal/formato";

/** Asistencia mensual de niños en Excel. Ruta sin punto (la protege el middleware) y con revisión de sesión; el RLS decide qué se ve. */
export async function GET(req: Request) {
  const usuario = await obtenerUsuario();
  if (!usuario) return new Response("Inicie sesión para descargar la asistencia.", { status: 401 });
  const sp = new URL(req.url).searchParams;
  const mes = /^\d{4}-\d{2}$/.test(sp.get("mes") ?? "") ? sp.get("mes")! : hoyCR().slice(0, 7);
  const fuente = sp.get("fuente") || null;
  const aula = Number(sp.get("aula")) || null;
  const d = await conUsuario(usuario.id, async (tx) => {
    const rol = (await tx.selectFrom("perfiles").select("rol").where("id", "=", usuario.id).executeTakeFirst())?.rol;
    if (!rol || rol === "personal" || rol === "contabilidad") return null;
    const datos = await asistenciaDelMes(tx, mes, { fuente, aula });
    const nombreAula = aula ? (await tx.selectFrom("ubicaciones").select("nombre").where("id", "=", aula).executeTakeFirst())?.nombre : null;
    return { ...datos, nombreAula };
  });
  if (!d) return new Response("No tiene permiso para descargar la asistencia de los niños.", { status: 403 });
  const buf = await generarAsistenciaNinos({
    titulo: `Control de asistencia mensual de niños y niñas — ${mesLargo(mes)}`,
    subtitulo: [fuente ? `Subsidio: ${fuente}` : "Todos los subsidios", d.nombreAula ? `Aula: ${d.nombreAula}` : null].filter(Boolean).join(" · "),
    dias: d.dias,
    filas: d.filas,
  });
  return new Response(new Uint8Array(buf), {
    headers: { "Content-Type": XLSX_MIME, "Content-Disposition": `attachment; filename="Asistencia_ninos_${mes}${fuente ? `_${fuente}` : ""}.xlsx"`, "Cache-Control": "no-store" },
  });
}
