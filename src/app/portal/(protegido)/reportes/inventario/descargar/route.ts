import { readFile } from "node:fs/promises";
import path from "node:path";
import { conUsuario } from "@/lib/db";
import { obtenerUsuario } from "@/lib/portal/sesion";
import { filasFormulario1, generarFormulario1 } from "@/lib/export/controlInventario";
import { filasLimpieza, generarControlLimpieza } from "@/lib/export/controlLimpieza";
import { XLSX_MIME } from "@/lib/export/auxiliarPani";
import { hoyCR, rangoMes } from "@/lib/portal/formato";
import type { CategoriaProducto } from "@/lib/db/tipos";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const CATEGORIAS: Record<string, CategoriaProducto[]> = {
  alimentos: ["perecedero", "no_perecedero"],
  aseo: ["limpieza"],
  limpieza: ["limpieza"],
};

/**
 * Controles mensuales de inventario con el formato de las plantillas de la fundación:
 *   tipo=alimentos | aseo → Formulario N.º 1 (.xlsx) · tipo=limpieza → control de limpieza (.docx)
 * Ruta sin punto (la protege el middleware); además revisa la sesión.
 */
export async function GET(req: Request) {
  const usuario = await obtenerUsuario();
  if (!usuario) return new Response("Inicie sesión para descargar el reporte.", { status: 401 });
  const p = new URL(req.url).searchParams;
  const tipo = (p.get("tipo") ?? "alimentos") in CATEGORIAS ? (p.get("tipo") ?? "alimentos") : "alimentos";
  const mes = /^\d{4}-\d{2}$/.test(p.get("mes") ?? "") ? p.get("mes")! : hoyCR().slice(0, 7);
  const { desde, hasta } = rangoMes(mes);
  const cats = CATEGORIAS[tipo];

  const d = await conUsuario(usuario.id, async (tx) => ({
    productos: await tx.selectFrom("productos").select(["id", "nombre", "unidad"]).where("categoria", "in", cats).orderBy("nombre").execute(),
    movs: await tx.selectFrom("inventario_movimientos as m").innerJoin("productos as p", "p.id", "m.producto_id")
      .leftJoin("compra_lineas as l", "l.id", "m.compra_linea_id").leftJoin("compras as c", "c.id", "l.compra_id").leftJoin("perfiles as u", "u.id", "m.registrado_por")
      .select(["m.producto_id", "m.tipo", "m.cantidad", "m.fecha", "m.entregado_a", "m.motivo", "c.numero_factura as factura", "u.nombre as registrado_por"])
      .where("p.categoria", "in", cats).where("m.fecha", "<=", hasta).orderBy("m.fecha").orderBy("m.creado_en").execute(),
    pedidos: tipo === "limpieza"
      ? await tx.selectFrom("compras as c").innerJoin("proveedores as pr", "pr.id", "c.proveedor_id")
          .select(["c.fecha", "pr.nombre as proveedor", "c.numero_factura as factura"]).distinct()
          .where("c.fecha", ">=", desde).where("c.fecha", "<=", hasta)
          .where((eb) => eb.exists(eb.selectFrom("compra_lineas as l").innerJoin("productos as pp", "pp.id", "l.producto_id").select("l.id").whereRef("l.compra_id", "=", "c.id").where("pp.categoria", "=", "limpieza")))
          .orderBy("c.fecha").execute()
      : [],
  }));
  const movs = d.movs.map((m) => ({ ...m, cantidad: Number(m.cantidad) }));

  if (tipo === "limpieza") {
    const logo = await readFile(path.join(process.cwd(), "src/assets/logo-secundario.png")).catch(() => undefined);
    const buf = await generarControlLimpieza({ desde, hasta, pedidos: d.pedidos, filas: filasLimpieza(d.productos, movs, desde, hasta), logo });
    return new Response(new Uint8Array(buf), {
      headers: { "Content-Type": DOCX_MIME, "Content-Disposition": `attachment; filename="Control_limpieza_${mes}.docx"`, "Cache-Control": "no-store" },
    });
  }
  const buf = await generarFormulario1({ variante: tipo as "alimentos" | "aseo", mes, filas: filasFormulario1(d.productos, movs, mes) });
  return new Response(new Uint8Array(buf), {
    headers: { "Content-Type": XLSX_MIME, "Content-Disposition": `attachment; filename="Control_inventarios_${tipo}_${mes}.xlsx"`, "Cache-Control": "no-store" },
  });
}
