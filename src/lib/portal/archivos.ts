import type { Tx } from "@/lib/db";
import { ErrorUsuario } from "./acciones";

const TIPOS = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const TOPE = 4.5 * 1024 * 1024;

/** Ruta con la que se guarda la referencia en las columnas *_url (sin extensión: la protege el middleware). */
export const rutaArchivo = (id: string) => `/portal/archivos/${id}`;

/**
 * Guarda un archivo subido en un formulario (dentro de la transacción del usuario) y devuelve su ruta.
 * Devuelve null si no se eligió ningún archivo.
 */
export async function guardarArchivo(tx: Tx, archivo: FormDataEntryValue | null): Promise<string | null> {
  if (!archivo || typeof archivo === "string" || archivo.size === 0) return null;
  if (!TIPOS.includes(archivo.type)) throw new ErrorUsuario("El archivo debe ser una foto (JPG o PNG) o un PDF.");
  if (archivo.size > TOPE) throw new ErrorUsuario("El archivo pesa más de 4,5 MB. Use una foto más liviana o un PDF más pequeño.");
  const { id } = await tx
    .insertInto("archivos")
    .values({ nombre: archivo.name.slice(0, 200) || "archivo", tipo: archivo.type, tamano: archivo.size, contenido: Buffer.from(await archivo.arrayBuffer()) })
    .returning("id")
    .executeTakeFirstOrThrow();
  return rutaArchivo(id);
}
