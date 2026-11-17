"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/portal/sesion";
import { casilla, ejecutar, ErrorUsuario, entero, texto, textoObligatorio, type Resultado } from "@/lib/portal/acciones";

type R = Resultado | null;
const datos = (f: FormData) => ({
  nombre: textoObligatorio(f, "nombre", "el nombre del proveedor"),
  cedula_juridica: texto(f, "cedula_juridica"),
  tipo: texto(f, "tipo"),
  telefono: texto(f, "telefono"),
  correo: texto(f, "correo"),
  es_habitual: casilla(f, "es_habitual"),
  notas: texto(f, "notas"),
});

export async function crearProveedor(_: R, f: FormData): Promise<R> {
  const { consultar } = await obtenerSesion();
  const r = await ejecutar(async () => {
    await consultar((tx) => tx.insertInto("proveedores").values(datos(f)).execute());
    return {};
  });
  if (r.ok) revalidatePath("/portal/proveedores");
  return r;
}

export async function editarProveedor(_: R, f: FormData): Promise<R> {
  const { consultar } = await obtenerSesion();
  const r = await ejecutar(async () => {
    const id = entero(f, "id")!;
    const n = await consultar((tx) => tx.updateTable("proveedores").set({ ...datos(f), activo: casilla(f, "activo") }).where("id", "=", id).returning("id").executeTakeFirst());
    if (!n) throw new ErrorUsuario("No tiene permiso para editar proveedores.");
    return {};
  });
  if (r.ok) {
    revalidatePath("/portal/proveedores");
    redirect("/portal/proveedores?guardado=1");
  }
  return r;
}
