import { sql } from "kysely";
import { conUsuario } from "@/lib/db";
import { obtenerUsuario } from "@/lib/portal/sesion";
import { filaDesdeRpc, generarAuxiliarPani, XLSX_MIME } from "@/lib/export/auxiliarPani";
import { hoyCR } from "@/lib/portal/formato";

/**
 * Descarga del Auxiliar de activos PANI (.xlsx) con las columnas oficiales.
 * La ruta no tiene punto (…/descargar), así que el middleware la protege; además se revisa la sesión aquí.
 */
export async function GET(req: Request) {
  const usuario = await obtenerUsuario();
  if (!usuario) return new Response("Inicie sesión para descargar el reporte.", { status: 401 });
  const p = new URL(req.url).searchParams;
  const corte = /^\d{4}-\d{2}-\d{2}$/.test(p.get("corte") ?? "") ? p.get("corte")! : hoyCR();
  const fuente = p.get("fuente") || null;
  const conPendientes = p.get("pendientes") === "1";

  const { filas, pendientes } = await conUsuario(usuario.id, async (tx) => {
    const filas = (await sql<Record<string, unknown>>`select * from activos_al_corte(${corte}::date, ${fuente})`.execute(tx)).rows;
    const pendientes = conPendientes
      ? await tx.selectFrom("v_activos_alertas as v").innerJoin("activos as a", "a.id", "v.activo_id").innerJoin("fuentes_financiamiento as f", "f.id", "a.fuente_id")
          .select(["v.placa", "v.tipo_bien", "v.ubicacion", "v.alerta"])
          .$if(!!fuente, (q) => q.where("f.codigo", "=", fuente!))
          .orderBy("v.ubicacion").execute()
      : [];
    return { filas, pendientes };
  });

  const buf = await generarAuxiliarPani(filas.map(filaDesdeRpc), {
    corte,
    programa: "Fundación Creciendo Feliz ABC",
    pendientes: conPendientes ? pendientes.map((x) => ({ placa: x.placa, tipoBien: x.tipo_bien!, ubicacion: x.ubicacion, pendiente: x.alerta! })) : undefined,
  });
  const nombre = `Auxiliar_${fuente ?? "todas_las_fuentes"}_${corte}.xlsx`;
  return new Response(new Uint8Array(buf), {
    headers: { "Content-Type": XLSX_MIME, "Content-Disposition": `attachment; filename="${nombre}"`, "Cache-Control": "no-store" },
  });
}
