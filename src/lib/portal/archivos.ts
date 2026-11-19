import type { Tx } from "@/lib/db";
import { ErrorUsuario } from "./acciones";

export const TIPOS_ARCHIVO = ["image/jpeg", "image/png", "image/webp", "application/pdf", "application/xml", "text/xml"];
/** Tope por archivo: 5 MB (los PDF suben tal cual; las fotos llegan comprimidas del navegador). */
export const TOPE_ARCHIVO = 5 * 1024 * 1024;

/** Ruta con la que se guarda la referencia en las columnas *_url (sin extensión: la protege el middleware). */
export const rutaArchivo = (id: string) => `/portal/archivos/${id}`;

/**
 * Devuelve la ruta del archivo de un campo de formulario, o null si no se eligió ninguno.
 * El campo trae el id del archivo ya subido por partes (CampoArchivo → /portal/archivos/subir).
 * Si trae un archivo directo (formularios viejos), lo guarda aquí mismo.
 */
export async function guardarArchivo(tx: Tx, valor: FormDataEntryValue | null): Promise<string | null> {
  if (!valor) return null;
  if (typeof valor === "string") {
    if (valor === "") return null;
    if (!/^[0-9a-f-]{36}$/i.test(valor)) throw new ErrorUsuario("El archivo adjunto no es válido. Vuelva a elegirlo.");
    const a = await tx.selectFrom("archivos").select("id").where("id", "=", valor).executeTakeFirst();
    if (!a) throw new ErrorUsuario("El archivo adjunto no terminó de subir. Vuelva a elegirlo.");
    return rutaArchivo(a.id);
  }
  if (valor.size === 0) return null;
  if (!TIPOS_ARCHIVO.includes(valor.type)) throw new ErrorUsuario("El archivo debe ser una foto (JPG o PNG), un PDF o un XML de factura electrónica.");
  if (valor.size > TOPE_ARCHIVO) throw new ErrorUsuario("El archivo pesa más de 5 MB. Use un PDF más liviano.");
  const { id } = await tx
    .insertInto("archivos")
    .values({ nombre: valor.name.slice(0, 200) || "archivo", tipo: valor.type, tamano: valor.size, contenido: Buffer.from(await valor.arrayBuffer()) })
    .returning("id")
    .executeTakeFirstOrThrow();
  return rutaArchivo(id);
}

/** Ids de varios archivos ya subidos (campo de CampoArchivos: lista separada por comas). */
export function idsArchivos(valor: FormDataEntryValue | null): string[] {
  if (!valor || typeof valor !== "string") return [];
  return valor.split(",").map((x) => x.trim()).filter((x) => /^[0-9a-f-]{36}$/i.test(x));
}
