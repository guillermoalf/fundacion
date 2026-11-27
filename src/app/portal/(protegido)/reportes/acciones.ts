"use server";

import { revalidatePath } from "next/cache";
import { sql } from "kysely";
import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/portal/sesion";
import { ejecutar, ErrorUsuario, texto, textoObligatorio, type Resultado } from "@/lib/portal/acciones";
import { normalizarConfig, tipoReporte } from "@/lib/reportes/activos";

type R = Resultado | null;
const SIN_PERMISO = "Solo la dirección puede crear o cambiar reportes.";

/** Crea o actualiza un reporte con sus especificaciones. */
export async function guardarReporte(_: R, f: FormData): Promise<R> {
  const { consultar } = await obtenerSesion();
  const id = texto(f, "id");
  const r = await ejecutar(async () => {
    const nombre = textoObligatorio(f, "nombre", "el nombre del reporte");
    let config;
    try { config = normalizarConfig(JSON.parse(String(f.get("config") ?? "{}"))); } catch { throw new ErrorUsuario("Revise las especificaciones del reporte."); }
    const datos = { nombre, descripcion: texto(f, "descripcion"), tipo: tipoReporte(f.get("tipo")), config: JSON.stringify(config), actualizado_en: new Date() };
    const guardado = await consultar((tx) => id
      ? tx.updateTable("reportes").set(datos).where("id", "=", id).returning("id").executeTakeFirst()
      : tx.insertInto("reportes").values(datos).returning("id").executeTakeFirst());
    if (!guardado) throw new ErrorUsuario(SIN_PERMISO);
    return { id: guardado.id };
  });
  if (r.ok) {
    revalidatePath("/portal/reportes", "layout");
    redirect(`/portal/reportes/${r.id}${id ? "?guardado=1" : ""}`);
  }
  return r;
}

/** Copia un reporte (p. ej. «PANI activos 2026» → 2027) para no armarlo de nuevo. */
export async function duplicarReporte(id: string): Promise<Resultado> {
  const { consultar } = await obtenerSesion();
  const r = await ejecutar(async () => {
    const nuevo = await consultar(async (tx) => {
      const o = await tx.selectFrom("reportes").select(["nombre", "descripcion", "tipo", "config"]).where("id", "=", id).executeTakeFirst();
      if (!o) throw new ErrorUsuario("El reporte no existe.");
      return tx.insertInto("reportes").values({ nombre: `${o.nombre} (copia)`, descripcion: o.descripcion, tipo: o.tipo, config: JSON.stringify(o.config) }).returning("id").executeTakeFirst();
    });
    if (!nuevo) throw new ErrorUsuario(SIN_PERMISO);
    return { id: nuevo.id };
  });
  if (r.ok) redirect(`/portal/reportes/${(r as { id: string }).id}`);
  return r;
}

export async function cambiarActivoReporte(id: string, activo: boolean): Promise<Resultado> {
  const { consultar } = await obtenerSesion();
  const r = await ejecutar(async () => {
    const n = await consultar((tx) => tx.updateTable("reportes").set({ activo, actualizado_en: new Date() }).where("id", "=", id).returning("id").executeTakeFirst());
    if (!n) throw new ErrorUsuario(SIN_PERMISO);
    return {};
  });
  if (r.ok) revalidatePath("/portal/reportes", "layout");
  return r;
}

// ----------------------------------------------------------------------------- categorías (desde el ⋮ del formulario)
const SIN_PERMISO_CAT = "Solo la dirección puede cambiar las categorías.";

/** Nueva categoría de activos: copia la tasa y la vida útil de la fila del Anexo 2 que se escoja («se deprecia como…»). */
export async function crearCategoriaActivo(nombre: string, baseId: number): Promise<Resultado> {
  const { consultar } = await obtenerSesion();
  return ejecutar(async () => {
    const n = nombre.trim();
    if (!n) throw new ErrorUsuario("Escriba el nombre de la categoría.");
    const hecho = await consultar(async (tx) => {
      const b = await tx.selectFrom("categorias_activo").select(["tasa_anual", "anios_vida", "referencia"]).where("id", "=", baseId).executeTakeFirst();
      if (!b) throw new ErrorUsuario("Escoja cómo se deprecia la categoría nueva.");
      // Si ya existía y se había quitado, vuelve a la lista (con su tasa original).
      const ya = await tx.selectFrom("categorias_activo").select(["id", "activa"]).where(sql`lower(nombre)`, "=", n.toLowerCase()).executeTakeFirst();
      if (ya?.activa) throw new ErrorUsuario("Ya existe una categoría con ese nombre.");
      if (ya) return tx.updateTable("categorias_activo").set({ activa: true }).where("id", "=", ya.id).returning("id").executeTakeFirst();
      return tx.insertInto("categorias_activo").values({ nombre: n, tasa_anual: b.tasa_anual, anios_vida: b.anios_vida, referencia: b.referencia }).returning("id").executeTakeFirst();
    });
    if (!hecho) throw new ErrorUsuario(SIN_PERMISO_CAT);
    return {};
  });
}

/** Nueva categoría de inventario (no entra en el Formulario N.º 1 hasta que se indique en Inventario → Categorías). */
export async function crearCategoriaProducto(nombre: string): Promise<Resultado> {
  const { consultar } = await obtenerSesion();
  return ejecutar(async () => {
    const n = nombre.trim();
    if (!n) throw new ErrorUsuario("Escriba el nombre de la categoría.");
    const base = n.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 30) || "categoria";
    await consultar(async (tx) => {
      const ya = await tx.selectFrom("categorias_producto").select(["codigo", "activo"]).where(sql`lower(nombre)`, "=", n.toLowerCase()).executeTakeFirst();
      if (ya?.activo) throw new ErrorUsuario("Ya existe una categoría con ese nombre.");
      if (ya) { await tx.updateTable("categorias_producto").set({ activo: true }).where("codigo", "=", ya.codigo).execute(); return; }
      let codigo = base;
      for (let i = 2; await tx.selectFrom("categorias_producto").select("codigo").where("codigo", "=", codigo).executeTakeFirst(); i++) codigo = `${base}_${i}`;
      const orden = (await tx.selectFrom("categorias_producto").select(({ fn }) => fn.max("orden").as("m")).executeTakeFirst())?.m ?? 0;
      await tx.insertInto("categorias_producto").values({ codigo, nombre: n, orden: Number(orden) + 1 }).execute();
    });
    return {};
  });
}

/** Cambia el nombre de una categoría (de activos: id numérico; de inventario: código). */
export async function renombrarCategoria(tipo: "activo" | "producto", clave: string | number, nombre: string): Promise<Resultado> {
  const { consultar } = await obtenerSesion();
  return ejecutar(async () => {
    const n = nombre.trim();
    if (!n) throw new ErrorUsuario("Escriba el nombre.");
    const r: unknown = await consultar((tx): Promise<unknown> => tipo === "activo"
      ? tx.updateTable("categorias_activo").set({ nombre: n }).where("id", "=", Number(clave)).returning("id").executeTakeFirst()
      : tx.updateTable("categorias_producto").set({ nombre: n }).where("codigo", "=", String(clave)).returning("codigo").executeTakeFirst());
    if (!r) throw new ErrorUsuario(SIN_PERMISO_CAT);
    return {};
  });
}

/** Quita una categoría de la lista (no se borra: lo que ya la usa la conserva). */
export async function quitarCategoria(tipo: "activo" | "producto", clave: string | number): Promise<Resultado> {
  const { consultar } = await obtenerSesion();
  return ejecutar(async () => {
    const r: unknown = await consultar((tx): Promise<unknown> => tipo === "activo"
      ? tx.updateTable("categorias_activo").set({ activa: false }).where("id", "=", Number(clave)).returning("id").executeTakeFirst()
      : tx.updateTable("categorias_producto").set({ activo: false }).where("codigo", "=", String(clave)).returning("codigo").executeTakeFirst());
    if (!r) throw new ErrorUsuario(SIN_PERMISO_CAT);
    return {};
  });
}
