"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/portal/sesion";
import { casilla, ejecutar, ErrorUsuario, entero, numero, texto, textoObligatorio, type Resultado } from "@/lib/portal/acciones";
import { hoyCR } from "@/lib/portal/formato";

type R = Resultado | null;

export async function registrarMovimiento(_: R, f: FormData): Promise<R> {
  const { consultar } = await obtenerSesion();
  const r = await ejecutar(async () => {
    const tipo = textoObligatorio(f, "tipo", "el tipo de movimiento");
    if (!["salida", "merma", "entrada"].includes(tipo)) throw new ErrorUsuario("Tipo de movimiento no válido.");
    const producto = entero(f, "producto_id");
    if (!producto) throw new ErrorUsuario("Elija el producto.");
    const cantidad = numero(f, "cantidad");
    if (!cantidad || cantidad <= 0) throw new ErrorUsuario("La cantidad debe ser mayor que cero.");
    const entregadoA = texto(f, "entregado_a");
    const motivo = texto(f, "motivo");
    if (tipo === "salida" && !entregadoA) throw new ErrorUsuario("Anote a quién se le entregó.");
    if (tipo === "merma" && !motivo) throw new ErrorUsuario("Anote el motivo (vencido, dañado…).");
    if (tipo === "entrada" && !motivo) throw new ErrorUsuario("Anote de dónde viene (por ejemplo, donación de…). Las compras se registran en Compras.");
    await consultar(async (tx) => {
      if (tipo !== "entrada") {
        const s = await tx.selectFrom("v_saldo_inventario").select(["saldo", "unidad"]).where("producto_id", "=", producto).executeTakeFirst();
        if (!s || Number(s.saldo) < cantidad) throw new ErrorUsuario(`No hay suficiente en inventario: quedan ${Number(s?.saldo ?? 0)} ${s?.unidad ?? ""}. Si entró algo sin registrar, regístrelo primero.`);
      }
      await tx.insertInto("inventario_movimientos").values({
        producto_id: producto, tipo: tipo as "salida" | "merma" | "entrada", cantidad, fecha: texto(f, "fecha") ?? hoyCR(),
        entregado_a: entregadoA, motivo, fecha_vencimiento: tipo === "entrada" ? texto(f, "fecha_vencimiento") : null,
      }).execute();
    });
    return {};
  });
  if (r.ok) revalidatePath("/portal/inventario");
  return r;
}

function datosProducto(f: FormData) {
  const minimo = numero(f, "stock_minimo") ?? 0;
  if (minimo < 0) throw new ErrorUsuario("El mínimo no puede ser negativo.");
  return {
    nombre: textoObligatorio(f, "nombre", "el nombre del producto"),
    categoria: textoObligatorio(f, "categoria", "la categoría"),
    unidad: textoObligatorio(f, "unidad", "la unidad (kg, litro, paquete…)"),
    proveedor_habitual_id: entero(f, "proveedor_habitual_id"),
    stock_minimo: minimo,
  };
}

export async function crearProducto(_: R, f: FormData): Promise<R> {
  const { consultar } = await obtenerSesion();
  const r = await ejecutar(async () => {
    await consultar((tx) => tx.insertInto("productos").values(datosProducto(f)).execute());
    return {};
  });
  if (r.ok) {
    revalidatePath("/portal/inventario/productos");
    revalidatePath("/portal/proveedores", "layout");
  }
  return r;
}

export async function editarProducto(_: R, f: FormData): Promise<R> {
  const { consultar } = await obtenerSesion();
  const id = entero(f, "id")!;
  const r = await ejecutar(async () => {
    const n = await consultar((tx) => tx.updateTable("productos").set({ ...datosProducto(f), activo: casilla(f, "activo") }).where("id", "=", id).returning("id").executeTakeFirst());
    if (!n) throw new ErrorUsuario("No tiene permiso para editar productos.");
    return {};
  });
  if (r.ok) {
    revalidatePath("/portal/inventario");
    redirect(`/portal/inventario/productos/${id}?guardado=1`);
  }
  return r;
}

function datosCategoria(f: FormData) {
  const reporte = textoObligatorio(f, "reporte", "en cuál reporte sale");
  if (!["alimentos", "aseo", "ninguno"].includes(reporte)) throw new ErrorUsuario("Elija un reporte de la lista.");
  return { nombre: textoObligatorio(f, "nombre", "el nombre de la categoría"), reporte, orden: entero(f, "orden") ?? 100 };
}

const SIN_PERMISO_CATEGORIAS = "Solo la dirección puede cambiar las categorías.";

export async function crearCategoria(_: R, f: FormData): Promise<R> {
  const { consultar } = await obtenerSesion();
  const r = await ejecutar(async () => {
    const d = datosCategoria(f);
    const base = d.nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "categoria";
    await consultar(async (tx) => {
      const usados = new Set((await tx.selectFrom("categorias_producto").select("codigo").execute()).map((c) => c.codigo));
      let codigo = base;
      for (let i = 2; usados.has(codigo); i++) codigo = `${base}_${i}`;
      const n = await tx.insertInto("categorias_producto").values({ ...d, codigo }).returning("codigo").executeTakeFirst().catch((e) => {
        if (e?.code === "42501") throw new ErrorUsuario(SIN_PERMISO_CATEGORIAS);
        if (e?.code === "23505") throw new ErrorUsuario("Ya existe una categoría con ese nombre.");
        throw e;
      });
      if (!n) throw new ErrorUsuario(SIN_PERMISO_CATEGORIAS);
    });
    return {};
  });
  if (r.ok) revalidatePath("/portal/inventario", "layout");
  return r;
}

export async function editarCategoria(_: R, f: FormData): Promise<R> {
  const { consultar } = await obtenerSesion();
  const codigo = String(f.get("codigo"));
  const r = await ejecutar(async () => {
    const d = datosCategoria(f);
    await consultar(async (tx) => {
      const n = await tx.updateTable("categorias_producto").set({ ...d, activo: casilla(f, "activo") }).where("codigo", "=", codigo).returning("codigo").executeTakeFirst()
        .catch((e) => { if (e?.code === "23505") throw new ErrorUsuario("Ya existe una categoría con ese nombre."); throw e; });
      if (!n) throw new ErrorUsuario(SIN_PERMISO_CATEGORIAS);
    });
    return {};
  });
  if (r.ok) revalidatePath("/portal/inventario", "layout");
  return r;
}
