import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { obtenerSesion } from "@/lib/portal/sesion";
import { cantidad, colones, fecha } from "@/lib/portal/formato";
import { ESTADOS_ACTIVO } from "@/lib/portal/catalogos";
import { armarReporte, comprasParaReporte, inventarioParaReporte, periodo } from "@/lib/portal/reportes";
import { conteoActivos, ESTADOS_CONTEO, normalizarConfig, tipoReporte, TIPOS_REPORTE, type ConfigReporte, type TipoReporte } from "@/lib/reportes/activos";
import { filtrarCompras, resumenInventario, sumar } from "@/lib/reportes/inventario";
import Encabezado from "../../../_ui/Encabezado";
import Tabla from "../../../_ui/Tabla";
import { Insignia } from "../../../_ui/Insignias";
import { estiloBoton, estiloEtiqueta, estiloInput, estiloTarjeta } from "../../../_ui/estilos";
import FormularioReporte from "../FormularioReporte";
import { opcionesReporte } from "../opciones";
import AccionesReporte from "./Acciones";

export const metadata: Metadata = { title: "Reporte" };

function resumenConfig(tipo: TipoReporte, c: ConfigReporte, minimo: number | null) {
  const comunes = [c.buscar ? `nombre con «${c.buscar}»` : null];
  if (tipo === "activos") {
    return [
      c.formato === "conteo" ? "Conteo por aula y estado" : "Auxiliar de activos fijos",
      c.fuentes.length ? `fondos ${c.fuentes.join(", ")}` : "todos los fondos", ...comunes,
      c.montoMinimo.tipo === "ninguno" ? null : `desde ${colones(minimo) ?? "—"} ${c.montoBase === "unidad" ? "por unidad" : "por total de la línea"}`,
      c.ubicaciones.length ? `${c.ubicaciones.length} aula(s)` : null, c.categorias.length ? `${c.categorias.length} categoría(s)` : null,
      c.incluirBajas ? "incluye dados de baja" : null,
    ];
  }
  return [
    c.fuentes.length && tipo === "compras" ? `fondos ${c.fuentes.join(", ")}` : null, ...comunes,
    c.proveedores.length && tipo === "compras" ? `${c.proveedores.length} proveedor(es)` : null,
    c.categoriasProducto.length ? `${c.categoriasProducto.length} categoría(s)` : "todas las categorías",
  ];
}

export default async function ReportePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ corte?: string; desde?: string; hasta?: string; guardado?: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const sp = await searchParams;
  const { consultar, esAdmin } = await obtenerSesion();
  const d = await consultar(async (tx) => {
    const r = await tx.selectFrom("reportes").selectAll().where("id", "=", id).executeTakeFirst();
    if (!r) return null;
    const tipo = tipoReporte(r.tipo);
    const config = normalizarConfig(r.config);
    const p = periodo(tipo, sp);
    const op = esAdmin ? await opcionesReporte(tx) : null;
    if (tipo === "compras") return { r, tipo, config, p, op, compras: filtrarCompras(await comprasParaReporte(tx, p.desde, p.hasta), config, p.desde, p.hasta) };
    if (tipo === "inventario") {
      const inv = await inventarioParaReporte(tx, p.hasta);
      return { r, tipo, config, p, op, inventario: resumenInventario(inv.productos, inv.movs, config, p.desde, p.hasta) };
    }
    return { r, tipo, config, p, op, activos: await armarReporte(tx, config, p.corte) };
  });
  if (!d) notFound();
  const { r, tipo, config, p } = d;
  const qs = tipo === "activos" ? `corte=${p.corte}` : `desde=${p.desde}&hasta=${p.hasta}`;

  return (
    <>
      <Encabezado migas={[{ etiqueta: "Reportes", href: "/portal/reportes" }, { etiqueta: r.nombre }]} titulo={r.nombre}
        descripcion={<><Insignia tono="azul">{TIPOS_REPORTE[tipo]}</Insignia> {!r.activo && <Insignia>Desactivado</Insignia>} {r.descripcion}</>}
        acciones={esAdmin && <AccionesReporte id={r.id} activo={r.activo} />} />
      {sp.guardado && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900">Especificaciones guardadas.</p>}

      <section className={`${estiloTarjeta} mb-6 space-y-4`}>
        <p className="text-slate-700"><span className="font-semibold">Especificaciones:</span> {resumenConfig(tipo, config, d.activos?.minimo ?? null).filter(Boolean).join(" · ")}.</p>
        <form className="flex flex-wrap items-end gap-3">
          {tipo === "activos" ? (
            <label className="space-y-1.5"><span className={estiloEtiqueta}>Fecha de corte</span>
              <input type="date" name="corte" defaultValue={p.corte} className={estiloInput} /></label>
          ) : (<>
            <label className="space-y-1.5"><span className={estiloEtiqueta}>Desde</span><input type="date" name="desde" defaultValue={p.desde} className={estiloInput} /></label>
            <label className="space-y-1.5"><span className={estiloEtiqueta}>Hasta</span><input type="date" name="hasta" defaultValue={p.hasta} className={estiloInput} /></label>
          </>)}
          <button className={estiloBoton.secundario}>Ver</button>
          <a href={`/portal/reportes/${r.id}/descargar?${qs}`} className={estiloBoton.primario}>Exportar Excel</a>
        </form>
      </section>

      {d.activos && config.formato === "conteo" && (() => {
        const c = conteoActivos(d.activos.filas, p.corte);
        return (
          <section className={`${estiloTarjeta} mb-6 space-y-4`}>
            <div className="flex flex-wrap gap-3">
              <div className="rounded-xl bg-slate-50 px-4 py-3"><p className="text-sm text-slate-500">Total</p><p className="text-3xl font-bold">{c.total}</p></div>
              {ESTADOS_CONTEO.filter((e) => c.porEstado[e]).map((e) => (
                <div key={e} className="rounded-xl bg-slate-50 px-4 py-3"><p className="text-sm text-slate-500">{ESTADOS_ACTIVO[e]}</p><p className="text-3xl font-bold">{c.porEstado[e]}</p></div>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-base">
                <thead className="text-sm text-slate-500"><tr><th className="py-2 pr-4">Aula o ubicación</th><th className="px-3 text-right">Total</th>{ESTADOS_CONTEO.map((e) => <th key={e} className="px-3 text-right">{ESTADOS_ACTIVO[e]}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {c.porUbicacion.map((u) => (
                    <tr key={u.ubicacion}><td className="py-2 pr-4">{u.ubicacion}</td><td className="px-3 text-right font-semibold">{u.total}</td>
                      {ESTADOS_CONTEO.map((e) => <td key={e} className="px-3 text-right tabular-nums">{u.porEstado[e] || "—"}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })()}

      {d.activos && (<>
        {config.formato === "auxiliar" && (
          <p className="mb-3 rounded-xl bg-slate-50 px-4 py-3">
            Al {fecha(p.corte)} entran <strong>{d.activos.filas.length}</strong> activos · costo total {colones(sumar(d.activos.filas.map((a) => a.costo))) ?? "₡0,00"}
            {d.activos.sinCosto > 0 && <span className="text-amber-800"> · {d.activos.sinCosto} activo(s) no entran porque les falta el costo</span>}.
          </p>
        )}
        <Tabla
          id="reporte-activos-vista"
          numerar
          columnas={[
            { clave: "bien", titulo: "Tipo de bien" }, { clave: "placa", titulo: "Placa" }, { clave: "aula", titulo: "Aula" }, { clave: "estado", titulo: "Estado" },
            { clave: "fuente", titulo: "Fondo" }, { clave: "fecha", titulo: "Adquisición", oculta: config.formato === "conteo" }, { clave: "costo", titulo: "Costo", alinear: "derecha", oculta: config.formato === "conteo" },
            { clave: "categoria", titulo: "Categoría", oculta: true }, { clave: "marca", titulo: "Marca", oculta: true }, { clave: "serie", titulo: "Serie", oculta: true },
          ]}
          filtros={[{ clave: "aula", titulo: "Aula" }, { clave: "estado", titulo: "Estado" }, { clave: "fuente", titulo: "Fondo" }]}
          filas={d.activos.filas.map((a) => ({
            id: a.id,
            href: `/portal/activos/${a.id}`,
            celdas: {
              bien: a.tipoBien, placa: a.placa ?? { vacio: true }, aula: a.ubicacion ?? { vacio: true },
              estado: ESTADOS_ACTIVO[a.estado as keyof typeof ESTADOS_ACTIVO] ?? a.estado,
              fuente: a.fuente, fecha: fecha(a.fechaAdquisicion), costo: colones(a.costo),
              categoria: a.categoria ?? { vacio: true }, marca: a.marca ?? { vacio: true }, serie: a.serie ?? { vacio: true },
            },
            orden: { costo: a.costo, fecha: a.fechaAdquisicion },
            filtros: { aula: a.ubicacion ?? "Sin ubicación", estado: ESTADOS_ACTIVO[a.estado as keyof typeof ESTADOS_ACTIVO] ?? a.estado, fuente: a.fuente },
          }))}
        />
      </>)}

      {d.compras && (<>
        <p className="mb-3 rounded-xl bg-slate-50 px-4 py-3">
          Del {fecha(p.desde)} al {fecha(p.hasta)}: <strong>{d.compras.length}</strong> líneas · total con IVA <strong>{colones(sumar(d.compras.map((l) => l.total)))}</strong>
        </p>
        <Tabla
          id="reporte-compras-vista"
          columnas={[
            { clave: "fecha", titulo: "Fecha" }, { clave: "proveedor", titulo: "Proveedor" }, { clave: "producto", titulo: "Producto" }, { clave: "categoria", titulo: "Categoría" },
            { clave: "cantidad", titulo: "Cantidad", alinear: "derecha" }, { clave: "precio", titulo: "Precio con IVA", alinear: "derecha" }, { clave: "total", titulo: "Total con IVA", alinear: "derecha" },
            { clave: "factura", titulo: "Factura", oculta: true }, { clave: "fuente", titulo: "Fondo", oculta: true },
          ]}
          filtros={[{ clave: "proveedor", titulo: "Proveedor" }, { clave: "categoria", titulo: "Categoría" }, { clave: "fuente", titulo: "Fondo" }]}
          filas={d.compras.map((l) => ({
            id: l.id,
            href: `/portal/compras/${l.compraId}`,
            celdas: {
              fecha: fecha(l.fecha), proveedor: l.proveedor, producto: l.producto ?? l.descripcion, categoria: l.categoriaNombre ?? { vacio: true },
              cantidad: `${cantidad(l.cantidad)} ${l.unidad}`, precio: colones(l.precioConIva), total: colones(l.total), factura: l.factura, fuente: l.fuente,
            },
            orden: { fecha: l.fecha, cantidad: l.cantidad, precio: l.precioConIva, total: l.total },
            filtros: { proveedor: l.proveedor, categoria: l.categoriaNombre ?? "Sin categoría", fuente: l.fuente },
          }))}
        />
      </>)}

      {d.inventario && (
        <Tabla
          id="reporte-inventario-vista"
          columnas={[
            { clave: "producto", titulo: "Producto" }, { clave: "categoria", titulo: "Categoría" }, { clave: "inicial", titulo: "Saldo inicial", alinear: "derecha" },
            { clave: "entradas", titulo: "Entradas", alinear: "derecha" }, { clave: "salidas", titulo: "Salidas", alinear: "derecha" },
            { clave: "ajustes", titulo: "Ajustes", alinear: "derecha", oculta: true }, { clave: "final", titulo: "Saldo final", alinear: "derecha" },
          ]}
          filtros={[{ clave: "categoria", titulo: "Categoría" }]}
          filas={d.inventario.map((f) => ({
            id: f.id,
            href: `/portal/inventario/productos/${f.id}`,
            celdas: {
              producto: f.nombre, categoria: f.categoriaNombre,
              inicial: `${cantidad(f.inicial)} ${f.unidad}`, entradas: cantidad(f.entradas), salidas: cantidad(f.salidas), ajustes: cantidad(f.ajustes), final: `${cantidad(f.final)} ${f.unidad}`,
            },
            orden: { inicial: f.inicial, entradas: f.entradas, salidas: f.salidas, final: f.final },
            filtros: { categoria: f.categoriaNombre },
          }))}
        />
      )}

      {d.op && (
        <details className={`${estiloTarjeta} mt-6`}>
          <summary className="cursor-pointer text-lg font-semibold text-sky-700">Modificar las especificaciones</summary>
          <div className="mt-4"><FormularioReporte v={{ id: r.id, nombre: r.nombre, descripcion: r.descripcion, tipo, config }} {...d.op} /></div>
        </details>
      )}
    </>
  );
}
