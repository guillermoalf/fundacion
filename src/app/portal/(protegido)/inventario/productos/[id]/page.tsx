import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerSesion } from "@/lib/portal/sesion";
import { cantidad, fecha } from "@/lib/portal/formato";
import Encabezado from "../../../../_ui/Encabezado";
import { Insignia } from "../../../../_ui/Insignias";
import { estiloBoton, estiloTarjeta } from "../../../../_ui/estilos";
import { FormularioProducto } from "../../Formularios";
import { categoriasProducto } from "@/lib/portal/catalogos";
import { opcionesCategoria } from "../../datos";

export const metadata: Metadata = { title: "Producto" };
const TIPO = { entrada: ["Entrada", "verde"], salida: ["Salida", "azul"], merma: ["Merma", "rojo"], ajuste: ["Ajuste", "gris"] } as const;

export default async function ProductoPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ guardado?: string }> }) {
  const id = Number((await params).id);
  const { guardado } = await searchParams;
  const { consultar, puedeEscribir } = await obtenerSesion();
  const d = await consultar(async (tx) => {
    const p = await tx.selectFrom("productos").selectAll().where("id", "=", id).executeTakeFirst();
    if (!p) return null;
    const movs = await tx.selectFrom("inventario_movimientos as m").leftJoin("compra_lineas as l", "l.id", "m.compra_linea_id").leftJoin("compras as c", "c.id", "l.compra_id")
      .select(["m.id", "m.tipo", "m.cantidad", "m.fecha", "m.entregado_a", "m.motivo", "m.fecha_vencimiento", "c.id as compra_id", "c.numero_factura"])
      .where("m.producto_id", "=", id).orderBy("m.fecha").orderBy("m.creado_en").execute();
    const proveedores = await tx.selectFrom("proveedores").select(["id", "nombre"]).orderBy("nombre").execute();
    return { p, movs, proveedores, cats: await categoriasProducto(tx) };
  });
  if (!d) notFound();
  const { p, movs, proveedores } = d;
  let saldo = 0;
  const kardex = movs.map((m) => {
    saldo += (m.tipo === "entrada" || m.tipo === "ajuste" ? 1 : -1) * Number(m.cantidad);
    return { ...m, saldo: Math.round(saldo * 1000) / 1000 };
  }).reverse();

  return (
    <>
      <Encabezado
        migas={[{ etiqueta: "Inventario", href: "/portal/inventario" }, { etiqueta: "Productos", href: "/portal/inventario/productos" }, { etiqueta: p.nombre }]}
        titulo={p.nombre}
        descripcion={`En bodega: ${cantidad(saldo)} ${p.unidad}`}
        acciones={puedeEscribir && <Link href={`/portal/inventario/movimiento?producto=${p.id}`} className={estiloBoton.primario}>Registrar salida o merma</Link>}
      />
      {guardado && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900">Cambios guardados.</p>}
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <section className={estiloTarjeta}>
          <h2 className="mb-3 text-xl font-semibold">Kárdex</h2>
          {kardex.length === 0 ? <p className="text-slate-600">Sin movimientos todavía.</p> : (
            <ol className="divide-y divide-slate-100">
              {kardex.map((m) => (
                <li key={m.id} className="flex flex-wrap items-start justify-between gap-2 py-3">
                  <div>
                    <p><Insignia tono={TIPO[m.tipo][1]}>{TIPO[m.tipo][0]}</Insignia> <span className="font-medium">{fecha(m.fecha)}</span></p>
                    <p className="text-slate-600">
                      {m.compra_id ? <Link className={estiloBoton.enlace} href={`/portal/compras/${m.compra_id}`}>Factura {m.numero_factura}</Link> : null}
                      {m.entregado_a && `Entregado a ${m.entregado_a}. `}{m.motivo}
                      {m.fecha_vencimiento && ` · vence ${fecha(m.fecha_vencimiento)}`}
                    </p>
                  </div>
                  <div className="text-right tabular-nums">
                    <p className={m.tipo === "entrada" || m.tipo === "ajuste" ? "text-emerald-700" : "text-red-700"}>{m.tipo === "entrada" || m.tipo === "ajuste" ? "+" : "−"}{cantidad(m.cantidad)}</p>
                    <p className="text-sm text-slate-500">queda {cantidad(m.saldo)}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
        {puedeEscribir && (
          <section className={estiloTarjeta}>
            <h2 className="mb-4 text-xl font-semibold">Datos del producto</h2>
            <FormularioProducto v={p} categorias={opcionesCategoria(d.cats, p.categoria)} proveedores={proveedores.map((x) => ({ valor: x.id, texto: x.nombre }))} />
          </section>
        )}
      </div>
    </>
  );
}
