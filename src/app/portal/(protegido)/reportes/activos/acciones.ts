"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/portal/sesion";
import { ejecutar, ErrorUsuario, texto, textoObligatorio, type Resultado } from "@/lib/portal/acciones";
import { normalizarConfig } from "@/lib/reportes/activos";

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
    const datos = { nombre, descripcion: texto(f, "descripcion"), config: JSON.stringify(config), actualizado_en: new Date() };
    const guardado = await consultar((tx) => id
      ? tx.updateTable("reportes_activos").set(datos).where("id", "=", id).returning("id").executeTakeFirst()
      : tx.insertInto("reportes_activos").values(datos).returning("id").executeTakeFirst());
    if (!guardado) throw new ErrorUsuario(SIN_PERMISO);
    return { id: guardado.id };
  });
  if (r.ok) {
    revalidatePath("/portal/reportes", "layout");
    redirect(`/portal/reportes/activos/${r.id}${id ? "?guardado=1" : ""}`);
  }
  return r;
}

/** Copia un reporte (p. ej. «PANI activos 2026» → 2027) para no armarlo de nuevo. */
export async function duplicarReporte(id: string): Promise<Resultado> {
  const { consultar } = await obtenerSesion();
  const r = await ejecutar(async () => {
    const nuevo = await consultar(async (tx) => {
      const o = await tx.selectFrom("reportes_activos").select(["nombre", "descripcion", "config"]).where("id", "=", id).executeTakeFirst();
      if (!o) throw new ErrorUsuario("El reporte no existe.");
      return tx.insertInto("reportes_activos").values({ nombre: `${o.nombre} (copia)`, descripcion: o.descripcion, config: JSON.stringify(o.config) }).returning("id").executeTakeFirst();
    });
    if (!nuevo) throw new ErrorUsuario(SIN_PERMISO);
    return { id: nuevo.id };
  });
  if (r.ok) redirect(`/portal/reportes/activos/${(r as { id: string }).id}`);
  return r;
}

export async function cambiarActivoReporte(id: string, activo: boolean): Promise<Resultado> {
  const { consultar } = await obtenerSesion();
  const r = await ejecutar(async () => {
    const n = await consultar((tx) => tx.updateTable("reportes_activos").set({ activo, actualizado_en: new Date() }).where("id", "=", id).returning("id").executeTakeFirst());
    if (!n) throw new ErrorUsuario(SIN_PERMISO);
    return {};
  });
  if (r.ok) revalidatePath("/portal/reportes", "layout");
  return r;
}
