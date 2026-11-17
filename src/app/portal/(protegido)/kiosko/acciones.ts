"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { obtenerSesion } from "@/lib/portal/sesion";
import { ejecutar, ErrorUsuario, textoObligatorio, type Resultado } from "@/lib/portal/acciones";
import { COOKIE_KIOSKO, hashToken, nuevoToken } from "@/lib/kiosko";

type R = Resultado | null;

/** Registra ESTA tablet (la que tiene abierto el portal) como kiosko: le deja un token en una cookie. */
export async function registrarTablet(_: R, f: FormData): Promise<R> {
  const { consultar, esAdmin } = await obtenerSesion();
  const r = await ejecutar(async () => {
    if (!esAdmin) throw new ErrorUsuario("Solo la dirección puede registrar tablets.");
    const nombre = textoObligatorio(f, "nombre", "un nombre para la tablet");
    const token = nuevoToken();
    await consultar((tx) => tx.insertInto("dispositivos_kiosko").values({ nombre, token_hash: hashToken(token) }).execute());
    (await cookies()).set(COOKIE_KIOSKO, token, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/marcar", maxAge: 60 * 60 * 24 * 365 * 5,
    });
    return {};
  });
  if (r.ok) revalidatePath("/portal/kiosko");
  return r;
}

export async function cambiarTablet(_: R, f: FormData): Promise<R> {
  const { consultar } = await obtenerSesion();
  const r = await ejecutar(async () => {
    const id = textoObligatorio(f, "id", "la tablet");
    const n = await consultar((tx) => tx.updateTable("dispositivos_kiosko").set({ activo: f.get("activo") === "true" }).where("id", "=", id).returning("id").executeTakeFirst());
    if (!n) throw new ErrorUsuario("Solo la dirección puede cambiar las tablets.");
    return {};
  });
  if (r.ok) revalidatePath("/portal/kiosko");
  return r;
}
