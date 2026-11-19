import type { Metadata } from "next";
import Link from "next/link";
import { sql } from "kysely";
import { obtenerSesion } from "@/lib/portal/sesion";
import { colones, fecha } from "@/lib/portal/formato";
import { VolverAlBorrador } from "../../_ui/Borrador";
import Encabezado from "../../_ui/Encabezado";
import Tabla from "../../_ui/Tabla";
import Vacio from "../../_ui/Vacio";
import { estiloBoton } from "../../_ui/estilos";

export const metadata: Metadata = { title: "Compras" };

export default async function ComprasPage() {
  const { consultar, puedeEscribir } = await obtenerSesion();
  const compras = await consultar((tx) =>
    tx.selectFrom("compras as c").innerJoin("proveedores as p", "p.id", "c.proveedor_id").innerJoin("fuentes_financiamiento as f", "f.id", "c.fuente_id")
      .leftJoin("perfiles as u", "u.id", "c.registrado_por")
      .select(["c.id", "c.fecha", "c.numero_factura", "c.total", "c.subtotal", "c.iva", "c.factura_url", "c.observaciones", "c.creado_en", "p.nombre as proveedor", "f.codigo as fuente", "u.nombre as registro",
        sql<number>`(select count(*)::int from compra_lineas l where l.compra_id = c.id)`.as("lineas"),
        sql<number>`(select count(*)::int from compra_archivos a where a.compra_id = c.id)`.as("archivos"),
        sql<string>`(select string_agg(distinct l.tipo::text, ',') from compra_lineas l where l.compra_id = c.id)`.as("tipos")])
      .orderBy("c.fecha", "desc").execute(),
  );
  const TIPO = { activo: "Activos", consumible: "Inventario", servicio: "Servicios" } as Record<string, string>;
  return (
    <>
      <VolverAlBorrador nombre="compra" href="/portal/compras/nueva" />
      <Encabezado
        migas={[{ etiqueta: "Compras" }]}
        titulo="Compras"
        descripcion="Cada factura con su foto, su fuente de financiamiento y lo que generó (activos o entradas al inventario)."
        acciones={puedeEscribir && <Link href="/portal/compras/nueva" className={estiloBoton.primario}>+ Registrar compra</Link>}
      />
      <Tabla
        columnas={[
          { clave: "factura", titulo: "Factura" },
          { clave: "fecha", titulo: "Fecha" },
          { clave: "proveedor", titulo: "Proveedor" },
          { clave: "fuente", titulo: "Fuente" },
          { clave: "tipos", titulo: "Incluye", ocultarEnMovil: true },
          { clave: "adjunto", titulo: "Foto/PDF" },
          { clave: "total", titulo: "Total", alinear: "derecha" },
          { clave: "subtotal", titulo: "Subtotal (sin IVA)", alinear: "derecha", oculta: true },
          { clave: "iva", titulo: "IVA", alinear: "derecha", oculta: true },
          { clave: "lineas", titulo: "Líneas", alinear: "derecha", oculta: true },
          { clave: "archivos", titulo: "Archivos", alinear: "derecha", oculta: true },
          { clave: "registro", titulo: "Registrada por", oculta: true },
          { clave: "observaciones", titulo: "Observaciones", oculta: true },
        ]}
        filtros={[{ clave: "fuente", titulo: "Fuente" }, { clave: "proveedor", titulo: "Proveedor" }, { clave: "mes", titulo: "Mes" }, { clave: "incluye", titulo: "Incluye" }]}
        filas={compras.map((c) => ({
          id: c.id,
          href: `/portal/compras/${c.id}`,
          celdas: {
            factura: `N.º ${c.numero_factura}`, fecha: fecha(c.fecha)!, proveedor: c.proveedor, fuente: c.fuente,
            tipos: (c.tipos ?? "").split(",").filter(Boolean).map((t) => TIPO[t]).join(", "),
            adjunto: c.factura_url ? { texto: "Sí", tono: "verde" } : null,
            total: colones(c.total)!,
            subtotal: colones(c.subtotal), iva: colones(c.iva), lineas: c.lineas, archivos: c.archivos,
            registro: c.registro ?? { vacio: true }, observaciones: c.observaciones ?? { vacio: true },
          },
          orden: { fecha: c.fecha, total: Number(c.total), subtotal: Number(c.subtotal), iva: Number(c.iva), lineas: c.lineas, archivos: c.archivos },
          filtros: { fuente: c.fuente, proveedor: c.proveedor, mes: c.fecha.slice(0, 7), incluye: (c.tipos ?? "").split(",").filter(Boolean).map((t) => TIPO[t]).join(", ") || "Nada" },
        }))}
        vacio={<Vacio titulo="Todavía no hay compras registradas." accion={puedeEscribir && <Link href="/portal/compras/nueva" className={estiloBoton.primario}>Registrar la primera</Link>} />}
      />
    </>
  );
}
