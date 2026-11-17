import { sql } from "kysely";
import { conUsuario } from "@/lib/db";
import { obtenerUsuario } from "@/lib/portal/sesion";
import { mensajeError } from "@/lib/portal/acciones";
import { TIPOS_ARCHIVO } from "@/lib/portal/archivos";

const UUID = /^[0-9a-f-]{36}$/i;

/**
 * Subida de archivos por partes (Vercel no acepta más de 4,5 MB por petición).
 *   POST ?subida=<uuid>&parte=<0..9>   cuerpo: los bytes de la parte (máx. 3 MB)
 *   POST ?subida=<uuid>&completar=1    cuerpo JSON { nombre, tipo } → { ok, id }
 */
export async function POST(req: Request) {
  const usuario = await obtenerUsuario();
  if (!usuario) return Response.json({ ok: false, error: "Su sesión venció. Vuelva a ingresar." }, { status: 401 });
  const p = new URL(req.url).searchParams;
  const subida = p.get("subida") ?? "";
  if (!UUID.test(subida)) return Response.json({ ok: false, error: "Subida no válida." }, { status: 400 });
  try {
    if (p.get("completar")) {
      const { nombre, tipo } = (await req.json()) as { nombre?: string; tipo?: string };
      if (!tipo || !TIPOS_ARCHIVO.includes(tipo)) return Response.json({ ok: false, error: "El archivo debe ser una foto (JPG o PNG) o un PDF." }, { status: 400 });
      const id = await conUsuario(usuario.id, async (tx) =>
        (await sql<{ id: string }>`select completar_archivo(${subida}::uuid, ${nombre ?? "archivo"}, ${tipo}) as id`.execute(tx)).rows[0].id,
      );
      return Response.json({ ok: true, id });
    }
    const parte = Number(p.get("parte"));
    if (!Number.isInteger(parte) || parte < 0 || parte > 9) return Response.json({ ok: false, error: "Parte no válida." }, { status: 400 });
    const bytes = Buffer.from(await req.arrayBuffer());
    if (bytes.length === 0 || bytes.length > 3 * 1024 * 1024) return Response.json({ ok: false, error: "Parte demasiado grande." }, { status: 413 });
    await conUsuario(usuario.id, (tx) => tx.insertInto("archivos_partes").values({ subida_id: subida, parte, contenido: bytes }).execute());
    return Response.json({ ok: true });
  } catch (e) {
    const err = e as { code?: string };
    const error = err.code === "23514" ? "El archivo pesa más de 5 MB. Use un PDF más liviano." : mensajeError(e);
    return Response.json({ ok: false, error }, { status: 400 });
  }
}
