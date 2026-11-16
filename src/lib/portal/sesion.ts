import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { sql } from "kysely";
import { auth } from "@/lib/auth";
import { conUsuario, type Tx } from "@/lib/db";
import type { RolPortal } from "@/lib/db/tipos";
import { RUTA_LOGIN } from "./rutas";

export type Rol = RolPortal;

/** Nombre de cada rol para mostrar en pantalla (no decide permisos: eso lo hace el RLS). */
export const NOMBRE_ROL: Record<Rol, string> = {
  admin: "Dirección",
  contabilidad: "Contabilidad",
  coordinacion: "Coordinación",
  auditor: "Auditoría",
};

/** Usuario con sesión válida, o null. No redirige: sirve para el login y las Server Actions. */
export const obtenerUsuario = cache(async () => {
  const sesion = await auth.api.getSession({ headers: await headers() });
  return sesion ? { id: sesion.user.id, correo: sesion.user.email } : null;
});

/**
 * Usuario y perfil de la petición actual (una sola consulta por render gracias a `cache`).
 * Sin sesión válida manda al login.
 * `perfil` es null si el usuario no tiene perfil, está inactivo o su acceso venció: en esos casos
 * rol_actual() es null y el RLS no le deja leer ni su propia fila.
 * `puedeEscribir` y `esAdmin` vienen de las funciones de la base, para mostrar u ocultar botones
 * sin repetir aquí las reglas de permisos.
 * `consultar` corre consultas como este usuario (RLS + bitácora).
 */
export const obtenerSesion = cache(async () => {
  const usuario = await obtenerUsuario();
  if (!usuario) redirect(RUTA_LOGIN);

  const consultar = <T,>(fn: (tx: Tx) => Promise<T>) => conUsuario(usuario.id, fn);

  const { perfil, puedeEscribir, esAdmin } = await consultar(async (tx) => {
    const perfil = await tx
      .selectFrom("perfiles")
      .select(["nombre", "rol", "acceso_hasta"])
      .where("id", "=", usuario.id)
      .executeTakeFirst();
    const { rows } = await sql<{ puede_escribir: boolean; es_admin: boolean }>`select puede_escribir(), es_admin()`.execute(tx);
    return { perfil: perfil ?? null, puedeEscribir: rows[0]?.puede_escribir === true, esAdmin: rows[0]?.es_admin === true };
  });

  return { usuario, perfil, puedeEscribir, esAdmin, consultar };
});
