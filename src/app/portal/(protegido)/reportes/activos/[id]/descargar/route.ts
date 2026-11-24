import { conUsuario } from "@/lib/db";
import { obtenerUsuario } from "@/lib/portal/sesion";
import { XLSX_MIME } from "@/lib/export/auxiliarPani";
import { generarReporteActivos } from "@/lib/export/reporteActivos";
import { armarReporte } from "@/lib/portal/reportes";
import { normalizarConfig } from "@/lib/reportes/activos";
import { hoyCR } from "@/lib/portal/formato";

/** Exporta un reporte de activos con el formato del Auxiliar. Ruta sin punto y con revisión de sesión; el RLS decide qué se ve. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const usuario = await obtenerUsuario();
  if (!usuario) return new Response("Inicie sesión para exportar el reporte.", { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Reporte no encontrado.", { status: 404 });
  const p = new URL(req.url).searchParams;
  const corte = /^\d{4}-\d{2}-\d{2}$/.test(p.get("corte") ?? "") ? p.get("corte")! : hoyCR();
  const d = await conUsuario(usuario.id, async (tx) => {
    const r = await tx.selectFrom("reportes_activos").select(["nombre", "config"]).where("id", "=", id).executeTakeFirst();
    if (!r) return null;
    const config = normalizarConfig(r.config);
    return { nombre: r.nombre, config, ...(await armarReporte(tx, config, corte)) };
  });
  if (!d) return new Response("Reporte no encontrado o sin permiso.", { status: 404 });
  const buf = await generarReporteActivos(
    d.grupos.map((g) => ({ titulo: g.titulo, items: g.items.map((a) => ({ tipoBien: a.tipoBien, marca: a.marca, modelo: a.modelo, serie: a.serie, placa: a.placa, fechaAdquisicion: a.fechaAdquisicion, costo: a.costo, depreciacion: a.depreciacion })) })),
    { titulo: d.config.titulo, programa: d.config.programa, corte },
  );
  const archivo = `${d.nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w-]+/g, "_")}_${corte}.xlsx`;
  return new Response(new Uint8Array(buf), {
    headers: { "Content-Type": XLSX_MIME, "Content-Disposition": `attachment; filename="${archivo}"`, "Cache-Control": "no-store" },
  });
}
