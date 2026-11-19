import { conUsuario } from "@/lib/db";
import { obtenerUsuario } from "@/lib/portal/sesion";

/** Sirve un archivo adjunto solo a quien tiene sesión y permiso de lectura (RLS). */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const usuario = await obtenerUsuario();
  if (!usuario) return new Response("Inicie sesión para ver este archivo.", { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("No encontrado", { status: 404 });

  const archivo = await conUsuario(usuario.id, (tx) =>
    tx.selectFrom("archivos").select(["nombre", "tipo", "contenido"]).where("id", "=", id).executeTakeFirst(),
  );
  if (!archivo) return new Response("No encontrado o sin permiso.", { status: 404 });

  return new Response(new Uint8Array(archivo.contenido), {
    headers: {
      "Content-Type": archivo.tipo,
      // Fotos y PDF se abren en el navegador; los XML se descargan (abrirlos como página no es seguro).
      "Content-Disposition": `${archivo.tipo.includes("xml") ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(archivo.nombre)}`,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
