import { conUsuario } from "@/lib/db";
import { obtenerUsuario } from "@/lib/portal/sesion";

/** Foto de perfil (sale en el menú). El enlace lleva ?v=<fecha de cambio>, así que se puede guardar en caché. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const usuario = await obtenerUsuario();
  if (!usuario) return new Response("Inicie sesión.", { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("No encontrado", { status: 404 });
  const foto = await conUsuario(usuario.id, (tx) =>
    tx.selectFrom("fotos_perfil").select(["tipo", "contenido"]).where("id", "=", id).executeTakeFirst());
  if (!foto?.contenido || !foto.tipo) return new Response("No encontrado", { status: 404 });
  return new Response(new Uint8Array(foto.contenido), {
    headers: { "Content-Type": foto.tipo, "Cache-Control": "private, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
  });
}
