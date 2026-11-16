"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/portal/sesion";
import { ejecutar, ErrorUsuario, entero, numero, texto, textoObligatorio, type Resultado } from "@/lib/portal/acciones";
import { guardarArchivo } from "@/lib/portal/archivos";
import type { TipoLineaCompra } from "@/lib/db/tipos";

type R = Resultado | null;

export type LineaCompra = {
  tipo: TipoLineaCompra;
  descripcion: string;
  cantidad: string;
  unidad: string;
  precio: string;
  producto_id?: string;
  vencimiento?: string;
  ubicacion_id?: string;
  categoria_id?: string;
  placas?: string;
};

const num = (s: string | undefined, que: string) => {
  const t = (s ?? "").trim().replace(/[₡\s]/g, "");
  const n = Number(/,\d{1,3}$/.test(t) ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, ""));
  if (t === "" || !Number.isFinite(n)) throw new ErrorUsuario(`Falta ${que} o no es un número válido.`);
  return n;
};

export async function registrarCompra(_: R, f: FormData): Promise<R> {
  const { consultar } = await obtenerSesion();
  const r = await ejecutar(async () => {
    const proveedor = entero(f, "proveedor_id");
    const fuente = entero(f, "fuente_id");
    if (!proveedor) throw new ErrorUsuario("Elija el proveedor.");
    if (!fuente) throw new ErrorUsuario("Elija con qué fondos se pagó (fuente de financiamiento).");
    const numeroFactura = textoObligatorio(f, "numero_factura", "el número de factura");
    const fecha = textoObligatorio(f, "fecha", "la fecha de la factura");
    const iva = numero(f, "iva") ?? 0;
    const lineas = JSON.parse(String(f.get("lineas") ?? "[]")) as LineaCompra[];
    if (lineas.length === 0) throw new ErrorUsuario("Agregue al menos una línea a la factura.");

    const limpias = lineas.map((l, i) => {
      const n = i + 1;
      const descripcion = l.descripcion?.trim();
      if (!descripcion) throw new ErrorUsuario(`Falta la descripción en la línea ${n}.`);
      const cantidad = num(l.cantidad, `la cantidad en la línea ${n}`);
      const precio = num(l.precio, `el precio unitario en la línea ${n}`);
      if (cantidad <= 0) throw new ErrorUsuario(`La cantidad de la línea ${n} debe ser mayor que cero.`);
      if (precio < 0) throw new ErrorUsuario(`El precio de la línea ${n} no puede ser negativo.`);
      if (l.tipo === "consumible" && !l.producto_id) throw new ErrorUsuario(`En la línea ${n} elija el producto del inventario.`);
      if (l.tipo === "activo") {
        if (!Number.isInteger(cantidad)) throw new ErrorUsuario(`En la línea ${n} (activo) la cantidad debe ser un número entero.`);
        if (!l.ubicacion_id) throw new ErrorUsuario(`En la línea ${n} elija dónde va a estar el activo.`);
      }
      const placas = (l.placas ?? "").split(/[,;\s]+/).map((p) => p.trim()).filter(Boolean);
      if (l.tipo === "activo" && placas.length > cantidad) throw new ErrorUsuario(`En la línea ${n} hay más placas (${placas.length}) que unidades (${cantidad}).`);
      return { ...l, descripcion, cantidad, precio, placas };
    });
    const subtotal = limpias.reduce((s, l) => s + Math.round(l.cantidad * l.precio * 100) / 100, 0);

    const id = await consultar(async (tx) => {
      const factura = await guardarArchivo(tx, f.get("factura"));
      const { id } = await tx.insertInto("compras").values({
        proveedor_id: proveedor, fuente_id: fuente, numero_factura: numeroFactura, fecha, subtotal, iva, total: subtotal + iva,
        factura_url: factura, observaciones: texto(f, "observaciones"),
      }).returning("id").executeTakeFirstOrThrow();

      for (const l of limpias) {
        const { id: lineaId } = await tx.insertInto("compra_lineas").values({
          compra_id: id, tipo: l.tipo, descripcion: l.descripcion, cantidad: l.cantidad, unidad: l.unidad || "unidad",
          precio_unitario: l.precio, producto_id: l.tipo === "consumible" ? Number(l.producto_id) : null,
        }).returning("id").executeTakeFirstOrThrow();

        if (l.tipo === "consumible") {
          await tx.insertInto("inventario_movimientos").values({
            producto_id: Number(l.producto_id), tipo: "entrada", cantidad: l.cantidad, fecha, compra_linea_id: lineaId, fecha_vencimiento: l.vencimiento || null,
          }).execute();
        }
        if (l.tipo === "activo") {
          // Un activo por unidad: cada uno lleva su placa (las que falten quedan en Pendientes).
          for (let u = 0; u < l.cantidad; u++) {
            const { id: activoId } = await tx.insertInto("activos").values({
              tipo_bien: l.descripcion, placa: l.placas[u] ?? null, ubicacion_id: Number(l.ubicacion_id), fuente_id: fuente,
              categoria_id: l.categoria_id ? Number(l.categoria_id) : null, compra_linea_id: lineaId, fecha_adquisicion: fecha, costo: l.precio,
            }).returning("id").executeTakeFirstOrThrow();
            await tx.insertInto("activo_movimientos").values({
              activo_id: activoId, tipo: "alta", fecha, ubicacion_destino_id: Number(l.ubicacion_id), motivo: `Compra, factura N.º ${numeroFactura}`,
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

/** La factura se adjunta después (por ejemplo, si al registrar no se tenía la foto). */
export async function adjuntarFactura(_: R, f: FormData): Promise<R> {
  const { consultar } = await obtenerSesion();
  const id = String(f.get("id"));
  const r = await ejecutar(async () => {
    await consultar(async (tx) => {
      const url = await guardarArchivo(tx, f.get("factura"));
      if (!url) throw new ErrorUsuario("Elija la foto o el PDF de la factura.");
      await tx.updateTable("compras").set({ factura_url: url }).where("id", "=", id).execute();
    });
    return {};
  });
  if (r.ok) revalidatePath(`/portal/compras/${id}`);
  return r;
}
