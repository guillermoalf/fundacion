"use server";

import { revalidatePath } from "next/cache";
import { sql } from "kysely";
import { hashPassword } from "better-auth/crypto";
import { obtenerSesion } from "@/lib/portal/sesion";
import { ejecutar, ErrorUsuario, texto, textoObligatorio, type Resultado } from "@/lib/portal/acciones";
import { contrasenaTemporal } from "@/lib/portal/contrasenas";
import type { RolPortal } from "@/lib/db/tipos";

const ROLES: RolPortal[] = ["admin", "contabilidad", "coordinacion", "auditor", "personal", "superadmin"];
const rolDe = (f: FormData): RolPortal => {
  const r = textoObligatorio(f, "rol", "el rol") as RolPortal;
  if (!ROLES.includes(r)) throw new ErrorUsuario("Elija un rol de la lista.");
  return r;
};

export type ResultadoContrasena = Resultado<{ contrasena: string; nombre: string }> | null;

export async function crearUsuario(_: ResultadoContrasena, f: FormData): Promise<ResultadoContrasena> {
  const { consultar } = await obtenerSesion();
  return ejecutar(async () => {
    const nombre = textoObligatorio(f, "nombre", "el nombre");
    const correo = textoObligatorio(f, "correo", "el correo");
    const rol = rolDe(f);
    const accesoHasta = texto(f, "acceso_hasta");
    const contrasena = contrasenaTemporal();
    const hash = await hashPassword(contrasena);
    await consultar((tx) =>
      sql`select crear_usuario_portal(${correo}, ${nombre}, ${rol}::rol_portal, ${hash}, ${rol === "auditor" ? accesoHasta : null}::date)`.execute(tx),
    );
    revalidatePath("/portal/usuarios");
    return { contrasena, nombre };
  });
}

export async function restablecerContrasena(_: ResultadoContrasena, f: FormData): Promise<ResultadoContrasena> {
  const { consultar } = await obtenerSesion();
  return ejecutar(async () => {
    const id = textoObligatorio(f, "id", "el usuario");
    const nombre = textoObligatorio(f, "nombre", "el nombre");
    const contrasena = contrasenaTemporal();
    const hash = await hashPassword(contrasena);
    await consultar((tx) => sql`select restablecer_contrasena_portal(${id}::uuid, ${hash})`.execute(tx));
    return { contrasena, nombre };
  });
}

export async function actualizarAcceso(_: Resultado | null, f: FormData): Promise<Resultado | null> {
  const { consultar } = await obtenerSesion();
  return ejecutar(async () => {
    const id = textoObligatorio(f, "id", "el usuario");
    const rol = rolDe(f);
    const accesoHasta = texto(f, "acceso_hasta");
    if (rol === "auditor" && !accesoHasta) throw new ErrorUsuario("Un auditor necesita una fecha de vencimiento del acceso.");
    const actualizado = await consultar((tx) =>
      tx.updateTable("perfiles")
        .set({ nombre: textoObligatorio(f, "nombre", "el nombre"), rol, acceso_hasta: rol === "auditor" ? accesoHasta : null })
        .where("id", "=", id)
        .returning("id")
        .executeTakeFirst(),
    );
    if (!actualizado) throw new ErrorUsuario("No tiene permiso para cambiar este usuario.");
    revalidatePath("/portal/usuarios");
    return {};
  });
}

export async function cambiarActivo(_: Resultado | null, f: FormData): Promise<Resultado | null> {
  const { consultar } = await obtenerSesion();
  return ejecutar(async () => {
    const id = textoObligatorio(f, "id", "el usuario");
    const activo = f.get("activo") === "true";
    const r = await consultar((tx) => tx.updateTable("perfiles").set({ activo }).where("id", "=", id).returning("id").executeTakeFirst());
    if (!r) throw new ErrorUsuario("No tiene permiso para cambiar este usuario.");
    revalidatePath("/portal/usuarios");
    return {};
  });
}
