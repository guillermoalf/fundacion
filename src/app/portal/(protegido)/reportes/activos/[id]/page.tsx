import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { obtenerSesion } from "@/lib/portal/sesion";
import { colones, fecha, hoyCR } from "@/lib/portal/formato";
import { armarReporte } from "@/lib/portal/reportes";
import { normalizarConfig } from "@/lib/reportes/activos";
import Encabezado from "../../../../_ui/Encabezado";
import Tabla from "../../../../_ui/Tabla";
import { Insignia } from "../../../../_ui/Insignias";
import { estiloBoton, estiloEtiqueta, estiloInput, estiloTarjeta } from "../../../../_ui/estilos";
import FormularioReporte from "../FormularioReporte";
import { opcionesReporte } from "../opciones";
import AccionesReporte from "./Acciones";

export const metadata: Metadata = { title: "Reporte de activos" };

export default async function ReportePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ corte?: string; guardado?: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const sp = await searchParams;
  const corte = /^\d{4}-\d{2}-\d{2}$/.test(sp.corte ?? "") ? sp.corte! : hoyCR();
  const { consultar, esAdmin } = await obtenerSesion();
  const d = await consultar(async (tx) => {
    const r = await tx.selectFrom("reportes_activos").selectAll().where("id", "=", id).executeTakeFirst();
    if (!r) return null;
    const config = normalizarConfig(r.config);
    return { r, config, ...(await armarReporte(tx, config, corte)), op: esAdmin ? await opcionesReporte(tx) : null };
  });
  if (!d) notFound();
  const { r, config } = d;
  const costo = d.filas.reduce((s, a) => s + (a.costo ?? 0), 0);
  const resumen = [
    config.fuentes.length ? `Fondos: ${config.fuentes.join(", ")}` : "Todos los fondos",
    config.montoMinimo.tipo === "ninguno" ? "sin monto mínimo"
      : `desde ${colones(d.minimo) ?? "—"} ${config.montoBase === "unidad" ? "por unidad" : "por total de la línea de compra"}${config.montoMinimo.tipo === "umbral" ? " (25 % del salario base)" : ""}`,
    config.agrupar === "ubicacion" ? "dividido por aula" : config.agrupar === "categoria" ? "dividido por categoría" : "sin dividir",
    config.ubicaciones.length ? `${config.ubicaciones.length} aula(s)` : null,
    config.categorias.length ? `${config.categorias.length} categoría(s)` : null,
    config.adquiridoDesde || config.adquiridoHasta ? `comprados ${config.adquiridoDesde ? `desde ${fecha(config.adquiridoDesde)}` : ""} ${config.adquiridoHasta ? `hasta ${fecha(config.adquiridoHasta)}` : ""}` : null,
    config.incluirBajas ? "incluye dados de baja" : null,
  ].filter(Boolean).join(" · ");

  return (
    <>
      <Encabezado migas={[{ etiqueta: "Reportes", href: "/portal/reportes" }, { etiqueta: r.nombre }]} titulo={r.nombre}
        descripcion={<>{!r.activo && <Insignia>Desactivado</Insignia>} {r.descripcion}</>}
        acciones={esAdmin && <AccionesReporte id={r.id} activo={r.activo} />} />
      {sp.guardado && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900">Especificaciones guardadas.</p>}

      <section className={`${estiloTarjeta} mb-6 space-y-4`}>
        <p className="text-slate-700"><span className="font-semibold">Especificaciones:</span> {resumen}.</p>
        <form className="flex flex-wrap items-end gap-3">
          <label className="space-y-1.5"><span className={estiloEtiqueta}>Fecha de corte</span>
            <input type="date" name="corte" defaultValue={corte} className={estiloInput} /></label>
          <button className={estiloBoton.secundario}>Ver a esa fecha</button>
          <a href={`/portal/reportes/activos/${r.id}/descargar?corte=${corte}`} className={estiloBoton.primario}>Exportar Excel</a>
        </form>
        <p className="rounded-xl bg-slate-50 px-4 py-3">
          Al {fecha(corte)} entran <strong>{d.filas.length}</strong> activos · costo total {colones(costo) ?? "₡0,00"}
          {d.sinCosto > 0 && <span className="text-amber-800"> · {d.sinCosto} activo(s) no entran porque les falta el costo (complételo en su ficha)</span>}.
        </p>
      </section>

      <Tabla
        id="reporte-activos-vista"
        numerar
        columnas={[
          { clave: "bien", titulo: "Tipo de bien" }, { clave: "placa", titulo: "Placa" }, { clave: "grupo", titulo: config.agrupar === "categoria" ? "Categoría" : "Aula" },
          { clave: "fuente", titulo: "Fondo" }, { clave: "fecha", titulo: "Adquisición" }, { clave: "costo", titulo: "Costo", alinear: "derecha" },
          { clave: "libros", titulo: "Valor en libros", alinear: "derecha", oculta: true }, { clave: "marca", titulo: "Marca", oculta: true }, { clave: "serie", titulo: "Serie", oculta: true },
        ]}
        filtros={[{ clave: "grupo", titulo: config.agrupar === "categoria" ? "Categoría" : "Aula" }, { clave: "fuente", titulo: "Fondo" }]}
        filas={d.filas.map((a) => ({
          id: a.id,
          href: `/portal/activos/${a.id}`,
          celdas: {
            bien: a.tipoBien, placa: a.placa ?? { vacio: true },
            grupo: (config.agrupar === "categoria" ? a.categoria : a.ubicacion) ?? { vacio: true },
            fuente: a.fuente, fecha: fecha(a.fechaAdquisicion), costo: colones(a.costo),
            libros: a.costo !== null && a.depreciacion !== null ? colones(a.costo - a.depreciacion) : null,
            marca: a.marca ?? { vacio: true }, serie: a.serie ?? { vacio: true },
          },
          orden: { costo: a.costo, fecha: a.fechaAdquisicion },
          filtros: { grupo: (config.agrupar === "categoria" ? a.categoria : a.ubicacion) ?? "Sin asignar", fuente: a.fuente },
        }))}
      />

      {d.op && (
        <details className={`${estiloTarjeta} mt-6`}>
          <summary className="cursor-pointer text-lg font-semibold text-sky-700">Modificar las especificaciones</summary>
          <div className="mt-4"><FormularioReporte v={{ id: r.id, nombre: r.nombre, descripcion: r.descripcion, config }} {...d.op} /></div>
        </details>
      )}
    </>
  );
}
