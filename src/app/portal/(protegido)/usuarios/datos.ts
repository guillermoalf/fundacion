import { sql } from "kysely";
import type { obtenerSesion, Rol } from "@/lib/portal/sesion";
import { fecha, hoyCR } from "@/lib/portal/formato";

export type FilaUsuario = { id: string; nombre: string; correo: string; rol: Rol; activo: boolean; acceso_hasta: string | null; creado_en: Date; ultima_sesion: Date | null };

export const listarUsuarios = (consultar: Awaited<ReturnType<typeof obtenerSesion>>["consultar"]) =>
  consultar(async (tx) => (await sql<FilaUsuario>`select * from usuarios_portal()`.execute(tx)).rows);

export function estadoUsuario(u: Pick<FilaUsuario, "activo" | "acceso_hasta">) {
  if (!u.activo) return { texto: "Inactivo", tono: "gris" as const };
  if (u.acceso_hasta && u.acceso_hasta < hoyCR()) return { texto: "Acceso vencido", tono: "rojo" as const };
  if (u.acceso_hasta) return { texto: `Hasta ${fecha(u.acceso_hasta)}`, tono: "ambar" as const };
  return { texto: "Activo", tono: "verde" as const };
}

