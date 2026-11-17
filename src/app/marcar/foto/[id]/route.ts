import { cookies } from "next/headers";
import { COOKIE_KIOSKO, dispositivoPorToken, fotoEmpleado } from "@/lib/kiosko";

/** Foto de la persona para la pantalla del kiosko (solo a una tablet registrada). */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await dispositivoPorToken((await cookies()).get(COOKIE_KIOSKO)?.value))) return new Response(null, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response(null, { status: 404 });
  const f = await fotoEmpleado(id);
  if (!f) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(f.contenido), { headers: { "Content-Type": f.tipo, "Cache-Control": "private, max-age=86400" } });
}
