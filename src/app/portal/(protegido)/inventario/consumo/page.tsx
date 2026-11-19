import type { Metadata } from "next";
import { obtenerSesion } from "@/lib/portal/sesion";
import { cantidad, hoyCR, mesLargo } from "@/lib/portal/formato";
import Encabezado from "../../../_ui/Encabezado";
import Vacio from "../../../_ui/Vacio";

export const metadata: Metadata = { title: "Consumo mensual" };

/** Lo que salió de bodega (entregas + mermas) por producto en los últimos 6 meses. */
export default async function ConsumoPage() {
  const { consultar } = await obtenerSesion();
  const hoy = hoyCR();
  const meses = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Number(hoy.slice(0, 4)), Number(hoy.slice(5, 7)) - 1 - (5 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const movs = await consultar((tx) =>
    tx.selectFrom("inventario_movimientos as m").innerJoin("productos as p", "p.id", "m.producto_id").innerJoin("categorias_producto as cp", "cp.codigo", "p.categoria")
      .select(["p.id", "p.nombre", "p.unidad", "cp.nombre as categoria", "cp.orden", "m.tipo", "m.cantidad", "m.fecha"])
      .where("m.tipo", "in", ["salida", "merma"]).where("m.fecha", ">=", `${meses[0]}-01`).execute(),
  );
  const productos = new Map<number, { nombre: string; unidad: string; categoria: string; orden: number; porMes: Record<string, number> }>();
  for (const m of movs) {
    const p = productos.get(m.id) ?? { nombre: m.nombre, unidad: m.unidad, categoria: m.categoria, orden: m.orden, porMes: {} };
    p.porMes[m.fecha.slice(0, 7)] = (p.porMes[m.fecha.slice(0, 7)] ?? 0) + Number(m.cantidad);
    productos.set(m.id, p);
  }
  const filas = [...productos.values()].sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, "es"));

  return (
    <>
      <Encabezado migas={[{ etiqueta: "Inventario", href: "/portal/inventario" }, { etiqueta: "Consumo mensual" }]} titulo="Consumo mensual" descripcion="Entregas y mermas por producto en los últimos seis meses." />
      {filas.length === 0 ? <Vacio titulo="Todavía no hay salidas registradas." /> : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-base">
            <thead className="bg-slate-50 text-sm text-slate-600">
              <tr><th className="px-4 py-3 text-left">Producto</th>{meses.map((m) => <th key={m} className="px-3 py-3 text-right capitalize">{mesLargo(m).replace(/ \d+$/, "").slice(0, 3)} {m.slice(2, 4)}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filas.map((f) => (
                <tr key={f.nombre}>
                  <td className="px-4 py-2"><div className="font-medium">{f.nombre}</div><div className="text-sm text-slate-500">{f.categoria} · {f.unidad}</div></td>
                  {meses.map((m) => <td key={m} className="px-3 py-2 text-right tabular-nums">{f.porMes[m] ? cantidad(f.porMes[m]) : <span className="text-slate-300">—</span>}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
