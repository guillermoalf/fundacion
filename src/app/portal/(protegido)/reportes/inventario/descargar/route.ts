import { conUsuario } from "@/lib/db";
import { obtenerUsuario } from "@/lib/portal/sesion";
import { generarControlInventario, resumenMensual } from "@/lib/export/controlInventario";
import { XLSX_MIME } from "@/lib/export/auxiliarPani";
import { hoyCR, rangoMes } from "@/lib/portal/formato";

const TIPOS = {
  alimentos: { titulo: "Control de inventario de alimentos (Formulario 1)", categorias: ["perecedero", "no_perecedero"] as const },
  limpieza: { titulo: "Control mensual de productos de limpieza", categorias: ["limpieza"] as const },
};

/** Control mensual de alimentos o limpieza (.xlsx). Ruta sin punto: la protege el middleware; además revisa la sesión. */
export async function GET(req: Request) {
  const usuario = await obtenerUsuario();
  if (!usuario) return new Response("Inicie sesión para descargar el reporte.", { status: 401 });
  const p = new URL(req.url).searchParams;
  const tipo = TIPOS[p.get("tipo") as keyof typeof TIPOS] ? (p.get("tipo") as keyof typeof TIPOS) : "alimentos";
  const mes = /^\d{4}-\d{2}$/.test(p.get("mes") ?? "") ? p.get("mes")! : hoyCR().slice(0, 7);
  const { hasta } = rangoMes(mes);
  const cats = [...TIPOS[tipo].categorias];

  const { productos, movs } = await conUsuario(usuario.id, async (tx) => ({
    productos: await tx.selectFrom("productos").select(["id", "nombre", "unidad", "categoria"]).where("categoria", "in", cats).orderBy("nombre").execute(),
    movs: await tx.selectFrom("inventario_movimientos as m").innerJoin("productos as p", "p.id", "m.producto_id")
      .select(["m.producto_id", "m.tipo", "m.cantidad", "m.fecha", "m.entregado_a", "m.motivo", "p.nombre", "p.unidad"])
      .where("p.categoria", "in", cats).where("m.fecha", "<=", hasta).orderBy("m.fecha").execute(),
  }));
  const ms = movs.map((m) => ({ ...m, cantidad: Number(m.cantidad) }));
  const buf = await generarControlInventario({
    titulo: TIPOS[tipo].titulo,
    mes,
    filas: resumenMensual(productos, ms, mes),
    entregas: ms.filter((m) => m.tipo === "salida" && m.fecha.startsWith(mes)).map((m) => ({ fecha: m.fecha, producto: m.nombre, cantidad: m.cantidad, unidad: m.unidad, entregado_a: m.entregado_a, motivo: m.motivo })),
  });
  return new Response(new Uint8Array(buf), {
    headers: { "Content-Type": XLSX_MIME, "Content-Disposition": `attachment; filename="Control_${tipo}_${mes}.xlsx"`, "Cache-Control": "no-store" },
  });
}
