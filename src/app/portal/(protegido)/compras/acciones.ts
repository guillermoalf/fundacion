"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/portal/sesion";
import { ejecutar, ErrorUsuario, entero, numero, texto, textoObligatorio, type Resultado } from "@/lib/portal/acciones";
import { idsArchivos, rutaArchivo } from "@/lib/portal/archivos";
import { umbralActivo } from "@/lib/portal/catalogos";
import { colones } from "@/lib/portal/formato";
import { leerFacturaElectronica, type FacturaElectronica } from "@/lib/importacion/facturaElectronica";
import { sql } from "kysely";
import type { CategoriaProducto, TipoLineaCompra } from "@/lib/db/tipos";

type R = Resultado | null;

export type LineaCompra = {
  tipo: TipoLineaCompra;
  descripcion: string;
  cantidad: string;
  unidad: string;
  precio: string;
  producto_id?: string; // "nuevo" = crear el producto con los campos nuevo_*
  nuevo_categoria?: string;
  vencimiento?: string;
  ubicacion_id?: string;
  categoria_id?: string;
  placas?: string;
  es_activo_igual?: boolean;
};

const num = (s: string | undefined, que: string) => {
  const t = (s ?? "").trim().replace(/[₡\s]/g, "");
  const n = Number(/,\d{1,3}$/.test(t) ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, ""));
  if (t === "" || !Number.isFinite(n)) throw new ErrorUsuario(`Falta ${que} o no es un número válido.`);
  return n;
};

export type DatosXml = Resultado<{
  esFactura: boolean;
  factura?: FacturaElectronica;
  proveedorId?: number | null;
  productos?: { linea: number; productoId: number | null }[];
  umbral?: number | null;
}> | null;

/** Lee el XML de la factura electrónica (ya subido) para llenar la compra: proveedor, número, fecha y líneas. */
export async function leerFacturaXml(archivoId: string): Promise<DatosXml> {
  const { consultar } = await obtenerSesion();
  return ejecutar(async () => {
    return consultar(async (tx) => {
      const a = await tx.selectFrom("archivos").select(["tipo", "contenido"]).where("id", "=", archivoId).executeTakeFirst();
      if (!a) throw new ErrorUsuario("No se encontró el archivo.");
      const r = leerFacturaElectronica(Buffer.from(a.contenido).toString("utf8"));
      if (r.tipo !== "factura") return { esFactura: false };
      const f = r.factura;
      const prov = await tx.selectFrom("proveedores").select("id")
        .where((eb) => eb.or([eb("cedula_juridica", "=", f.emisor.identificacion ?? "-"), eb(sql`lower(nombre)`, "=", f.emisor.nombre.toLowerCase()), eb(sql`lower(nombre)`, "=", (f.emisor.nombreComercial ?? "-").toLowerCase())]))
        .executeTakeFirst();
      const productos = await tx.selectFrom("productos").select(["id", "nombre"]).where("activo", "=", true).execute();
      const sinTildes = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
      return {
        esFactura: true,
        factura: f,
        proveedorId: prov?.id ?? null,
        productos: f.lineas.map((l, i) => ({ linea: i, productoId: productos.find((p) => sinTildes(p.nombre) === sinTildes(l.detalle))?.id ?? null })),
        umbral: await umbralActivo(tx, f.fecha),
      };
    });
  });
}

export async function registrarCompra(_: R, f: FormData): Promise<R> {
  const { consultar } = await obtenerSesion();
  const r = await ejecutar(async () => {
    let proveedor = entero(f, "proveedor_id");
    const proveedorNuevo = texto(f, "proveedor_nuevo");
    const fuente = entero(f, "fuente_id");
    if (!proveedor && !proveedorNuevo) throw new ErrorUsuario("Elija el proveedor.");
    if (!fuente) throw new ErrorUsuario("Elija con qué fondos se pagó (fuente de financiamiento).");
    const numeroFactura = textoObligatorio(f, "numero_factura", "el número de factura");
    const fecha = textoObligatorio(f, "fecha", "la fecha de la factura");
    const iva = numero(f, "iva") ?? 0;
    const lineas = JSON.parse(String(f.get("lineas") ?? "[]")) as (LineaCompra & { nuevo_nombre?: string; nuevo_unidad?: string })[];
    if (lineas.length === 0) throw new ErrorUsuario("Agregue al menos una línea a la factura.");

    const limpias = lineas.map((l, i) => {
      const n = i + 1;
      const descripcion = l.descripcion?.trim();
      if (!descripcion) throw new ErrorUsuario(`Falta la descripción en la línea ${n}.`);
      const cantidad = num(l.cantidad, `la cantidad en la línea ${n}`);
      const precio = num(l.precio, `el precio por unidad en la línea ${n}`);
      if (cantidad <= 0) throw new ErrorUsuario(`La cantidad de la línea ${n} debe ser mayor que cero.`);
      if (precio < 0) throw new ErrorUsuario(`El precio de la línea ${n} no puede ser negativo.`);
      if (l.tipo === "consumible" && !l.producto_id) throw new ErrorUsuario(`En la línea ${n} elija el producto del inventario (o «Producto nuevo»).`);
      if (l.tipo === "consumible" && l.producto_id === "nuevo" && !l.nuevo_categoria) throw new ErrorUsuario(`En la línea ${n} elija la categoría del producto nuevo (comida, limpieza, oficina…): con ella sale en el control de inventario que corresponde.`);
      if (l.tipo === "activo" && !Number.isInteger(cantidad)) throw new ErrorUsuario(`En la línea ${n} (activo) la cantidad debe ser un número entero.`);
      const placas = (l.placas ?? "").split(/[,;\s]+/).map((p) => p.trim()).filter(Boolean);
      if (l.tipo === "activo" && placas.length > cantidad) throw new ErrorUsuario(`En la línea ${n} hay más placas (${placas.length}) que unidades (${cantidad}).`);
      return { ...l, n, descripcion, cantidad, precio, placas };
    });
    const subtotal = limpias.reduce((s, l) => s + Math.round(l.cantidad * l.precio * 100) / 100, 0);
    const adjuntos = idsArchivos(f.get("archivos"));

    const id = await consultar(async (tx) => {
      const umbral = await umbralActivo(tx, fecha);
      for (const l of limpias) {
        if (l.tipo === "activo" && umbral !== null && l.precio <= umbral && !l.es_activo_igual) {
          throw new ErrorUsuario(`Línea ${l.n} («${l.descripcion}»): cada unidad cuesta ${colones(l.precio)} y no supera ${colones(umbral)} (25 % de un salario base). Es de baja cuantía: márquela como «Inventario». Si de verdad es un activo, marque «Es activo igual».`);
        }
      }
      if (!proveedor) {
        const existente = await tx.selectFrom("proveedores").select("id").where(sql`lower(nombre)`, "=", proveedorNuevo!.toLowerCase()).executeTakeFirst();
        proveedor = existente?.id ?? (await tx.insertInto("proveedores").values({ nombre: proveedorNuevo!, cedula_juridica: texto(f, "proveedor_cedula") }).returning("id").executeTakeFirstOrThrow()).id;
      }
      const archivos = adjuntos.length
        ? await tx.selectFrom("archivos").select(["id", "tipo"]).where("id", "in", adjuntos).execute()
        : [];
      const principal = archivos.find((a) => a.tipo === "application/pdf") ?? archivos.find((a) => a.tipo.startsWith("image/")) ?? archivos[0];
      const { id } = await tx.insertInto("compras").values({
        proveedor_id: proveedor, fuente_id: fuente, numero_factura: numeroFactura, fecha, subtotal, iva, total: subtotal + iva,
        factura_url: principal ? rutaArchivo(principal.id) : null, observaciones: texto(f, "observaciones"),
      }).returning("id").executeTakeFirstOrThrow();
      if (archivos.length) await tx.insertInto("compra_archivos").values(archivos.map((a) => ({ compra_id: id, archivo_id: a.id }))).execute();

      for (const l of limpias) {
        let productoId = l.tipo === "consumible" && l.producto_id !== "nuevo" ? Number(l.producto_id) : null;
        if (l.tipo === "consumible" && l.producto_id === "nuevo") {
          const nombre = (l.nuevo_nombre ?? l.descripcion).trim();
          const unidad = (l.nuevo_unidad ?? l.unidad ?? "unidad").trim() || "unidad";
          const ya = await tx.selectFrom("productos").select("id").where("nombre", "=", nombre).where("unidad", "=", unidad).executeTakeFirst();
          productoId = ya?.id ?? (await tx.insertInto("productos").values({
            nombre, unidad, categoria: (l.nuevo_categoria ?? "otro") as CategoriaProducto, proveedor_habitual_id: proveedor,
          }).returning("id").executeTakeFirstOrThrow()).id;
        }
        const { id: lineaId } = await tx.insertInto("compra_lineas").values({
          compra_id: id, tipo: l.tipo, descripcion: l.descripcion, cantidad: l.cantidad, unidad: l.unidad || "unidad",
          precio_unitario: l.precio, producto_id: productoId,
        }).returning("id").executeTakeFirstOrThrow();

        if (l.tipo === "consumible") {
          await tx.insertInto("inventario_movimientos").values({
            producto_id: productoId!, tipo: "entrada", cantidad: l.cantidad, fecha, compra_linea_id: lineaId, fecha_vencimiento: l.vencimiento || null,
          }).execute();
        }
        if (l.tipo === "activo") {
          const ubicacion = l.ubicacion_id ? Number(l.ubicacion_id) : null;
          // Un activo por unidad: cada uno lleva su placa (las que falten quedan en Pendientes).
          for (let u = 0; u < l.cantidad; u++) {
            const { id: activoId } = await tx.insertInto("activos").values({
              tipo_bien: l.descripcion, placa: l.placas[u] ?? null, ubicacion_id: ubicacion, fuente_id: fuente,
              categoria_id: l.categoria_id ? Number(l.categoria_id) : null, compra_linea_id: lineaId, fecha_adquisicion: fecha, costo: l.precio,
            }).returning("id").executeTakeFirstOrThrow();
            await tx.insertInto("activo_movimientos").values({
              activo_id: activoId, tipo: "alta", fecha, ubicacion_destino_id: ubicacion, motivo: `Compra, factura N.º ${numeroFactura}`,
            }).execute();
          }
        }
      }
      return id;
    });
    return { id };
  });
  if (r.ok) {
    revalidatePath("/portal/compras");
    redirect(`/portal/compras/${r.id}?guardado=1`);
  }
  return r;
}

/** Liga a una línea de activo un activo que ya estaba registrado (por ejemplo, importado del Excel sin factura). */
export async function ligarActivo(_: R, f: FormData): Promise<R> {
  const { consultar } = await obtenerSesion();
  const r = await ejecutar(async () => {
    const linea = textoObligatorio(f, "linea_id", "la línea");
    const activo = textoObligatorio(f, "activo_id", "el activo");
    await consultar(async (tx) => {
      const n = await tx.updateTable("activos").set({ compra_linea_id: linea }).where("id", "=", activo).where("compra_linea_id", "is", null).returning("id").executeTakeFirst();
      if (!n) throw new ErrorUsuario("Ese activo ya tiene una factura ligada o no tiene permiso.");
    });
    return {};
  });
  if (r.ok) revalidatePath(`/portal/compras/${String(f.get("compra_id"))}`);
  return r;
}

/** Archivos de la factura que se agregan después (PDF, XML o foto). */
export async function adjuntarFactura(_: R, f: FormData): Promise<R> {
  const { consultar } = await obtenerSesion();
  const id = String(f.get("id"));
  const r = await ejecutar(async () => {
    const ids = idsArchivos(f.get("archivos"));
    if (!ids.length) throw new ErrorUsuario("Elija el PDF, los XML o la foto de la factura.");
    await consultar(async (tx) => {
      await tx.insertInto("compra_archivos").values(ids.map((archivo_id) => ({ compra_id: id, archivo_id }))).onConflict((oc) => oc.doNothing()).execute();
      const c = await tx.selectFrom("compras").select("factura_url").where("id", "=", id).executeTakeFirstOrThrow();
      if (!c.factura_url) await tx.updateTable("compras").set({ factura_url: rutaArchivo(ids[0]) }).where("id", "=", id).execute();
    });
    return {};
  });
  if (r.ok) revalidatePath(`/portal/compras/${id}`);
  return r;
}
