import { cache } from "react";
import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";
import { RUTA_LOGIN } from "@/lib/supabase/middleware";
import type { Database } from "@/lib/supabase/tipos";

export type Rol = Database["public"]["Enums"]["rol_portal"];

/** Nombre de cada rol para mostrar en pantalla (no decide permisos: eso lo hace el RLS). */
export const NOMBRE_ROL: Record<Rol, string> = {
  admin: "Dirección",
  contabilidad: "Contabilidad",
  coordinacion: "Coordinación",
  auditor: "Auditoría",
};

/**
 * Usuario y perfil de la petición actual (una sola consulta por render gracias a `cache`).
 * `perfil` es null si el usuario no tiene perfil, está inactivo o su acceso venció: en esos casos
 * rol_actual() es null y el RLS no le deja leer ni su propia fila.
 * `puedeEscribir` y `esAdmin` vienen de las funciones de la base, para mostrar u ocultar botones
 * sin repetir aquí las reglas de permisos.
 */
export const obtenerSesion = cache(async () => {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(RUTA_LOGIN);

  const [{ data: perfil }, { data: puedeEscribir }, { data: esAdmin }] = await Promise.all([
    supabase.from("perfiles").select("nombre, rol, acceso_hasta").eq("id", user.id).maybeSingle(),
    supabase.rpc("puede_escribir"),
    supabase.rpc("es_admin"),
  ]);

  return { supabase, user, perfil, puedeEscribir: puedeEscribir === true, esAdmin: esAdmin === true };
});
