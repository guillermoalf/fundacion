import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerSesion } from "@/lib/portal/sesion";
import { cantidad, colones, fecha } from "@/lib/portal/formato";
import Encabezado from "../../../_ui/Encabezado";
import { Insignia, Valor } from "../../../_ui/Insignias";
import { estiloBoton, estiloTarjeta } from "../../../_ui/estilos";
import { AdjuntarFactura, LigarActivo } from "./Adjuntos";

export const metadata: Metadata = { title: "Compra" };

export default async function CompraPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ guardado?: string }> }) {
  const { id } = await params;
  const { guardado } = await searchParams;
  const { consultar, puedeEscribir } = await obtenerSesion();
  const d = await consultar(async (tx) => {
    const c = await tx.selectFrom("compras as c").innerJoin("proveedores as p", "p.id", "c.proveedor_id").innerJoin("fuentes_financiamiento as f", "f.id", "c.fuente_id")
      .leftJoin("perfiles as u", "u.id", "c.registrado_por")
      .select(["c.id", "c.fecha", "c.numero_factura", "c.subtotal", "c.iva", "c.total", "c.factura_url", "c.observaciones", "c.creado_en", "p.nombre as proveedor", "f.codigo as fuente", "u.nombre as quien"])
      .where("c.id", "=", id).executeTakeFirst();
    if (!c) return null;
    const lineas = await tx.selectFrom("compra_lineas").selectAll().where("compra_id", "=", id).orderBy("id").execute();
    const ids = lineas.map((l) => l.id);
    const [activos, entradas, sinFactura] = await Promise.all([
      ids.length ? tx.selectFrom("activos as a").innerJoin("ubicaciones as u", "u.id", "a.ubicacion_id").select(["a.id", "a.placa", "a.tipo_bien", "a.compra_linea_id", "u.nombre as ubicacion"]).where("a.compra_linea_id", "in", ids).execute() : [],
      ids.length ? tx.selectFrom("inventario_movimientos as m").innerJoin("productos as p", "p.id", "m.producto_id").select(["m.id", "m.cantidad", "m.fecha_vencimiento", "m.compra_linea_id", "p.nombre", "p.unidad"]).where("m.compra_linea_id", "in", ids).execute() : [],
      tx.selectFrom("activos").select(["id", "placa", "tipo_bien"]).where("compra_linea_id", "is", null).where("estado", "<>", "dado_de_baja").orderBy("tipo_bien").execute(),
    ]);
    return { c, lineas, activos, entradas, sinFactura };
  });
  if (!d) notFound();
  const { c, lineas, activos, entradas, sinFactura } = d;
  const TIPO = { activo: ["Activo", "azul"], consumible: ["Inventario", "verde"], servicio: ["Servicio", "gris"] } as const;

  return (
    <>
      <Encabezado
        migas={[{ etiqueta: "Compras", href: "/portal/compras" }, { etiqueta: `Factura ${c.numero_factura}` }]}
        titulo={`Factura N.º ${c.numero_factura}`}
        descripcion={`${c.proveedor} · ${fecha(c.fecha)} · fondos ${c.fuente}`}
      />
      {guardado && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900">Compra registrada.</p>}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className={`${estiloTarjeta} space-y-4`}>
          <h2 className="text-xl font-semibold">Líneas</h2>
          {lineas.map((l) => {
            const suyos = activos.filter((a) => a.compra_linea_id === l.id);
            const suyas = entradas.filter((e) => e.compra_linea_id === l.id);
            return (
              <div key={l.id} className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold"><Insignia tono={TIPO[l.tipo][1]}>{TIPO[l.tipo][0]}</Insignia> {l.descripcion}</p>
                  <p className="tabular-nums">{cantidad(l.cantidad)} {l.unidad} × {colones(l.precio_unitario)} = <strong>{colones(l.total_linea)}</strong></p>
                </div>
                {suyos.length > 0 && (
                  <ul className="flex flex-wrap gap-2">
                    {suyos.map((a) => (
                      <li key={a.id}><Link href={`/portal/activos/${a.id}`} className="inline-block rounded-lg bg-white px-3 py-1 text-base font-medium text-sky-700 ring-1 ring-slate-200 hover:underline">{a.placa ? `Placa ${a.placa}` : "Sin placa"} · {a.ubicacion}</Link></li>
                    ))}
                  </ul>
                )}
                {suyas.map((e) => (
                  <p key={e.id} className="text-base text-slate-700">
                    Entró al inventario: {cantidad(e.cantidad)} {e.unidad} de <Link className={estiloBoton.enlace} href="/portal/inventario">{e.nombre}</Link>
                    {e.fecha_vencimiento && ` · vence ${fecha(e.fecha_vencimiento)}`}
                  </p>
                ))}
                {l.tipo === "activo" && puedeEscribir && (
                  <LigarActivo compraId={c.id} lineaId={l.id} opciones={sinFactura.map((a) => ({ valor: a.id, texto: `${a.tipo_bien}${a.placa ? ` · placa ${a.placa}` : " · sin placa"}` }))} />
                )}
              </div>
            );
          })}
          <div className="space-y-1 border-t border-slate-200 pt-3 text-right text-base tabular-nums">
            <p>Subtotal: {colones(c.subtotal)}</p>
            <p>IVA: {colones(c.iva)}</p>
            <p className="text-xl font-bold">Total: {colones(c.total)}</p>
          </div>
        </section>
        <aside className="space-y-6">
          <section className={`${estiloTarjeta} space-y-3`}>
            <h2 className="text-xl font-semibold">Factura</h2>
            {c.factura_url ? (
              <a href={c.factura_url} target="_blank" className={estiloBoton.secundario}>Ver la foto o PDF</a>
            ) : (
              <>
                <p><Valor v={null} que="la factura" /> Sin foto de la factura.</p>
                {puedeEscribir && <AdjuntarFactura id={c.id} />}
              </>
            )}
            {c.observaciones && <p className="whitespace-pre-line text-slate-700">{c.observaciones}</p>}
            <p className="text-sm text-slate-500">Registrada por {c.quien ?? "—"}.</p>
          </section>
        </aside>
      </div>
    </>
  );
}
