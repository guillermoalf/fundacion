import { cookies } from "next/headers";
import { COOKIE_KIOSKO, dispositivoPorToken, registrarMarca } from "@/lib/kiosko";

/** POST { empleadoId, pin, tipo } desde la tablet registrada. */
export async function POST(req: Request) {
  const dispositivo = await dispositivoPorToken((await cookies()).get(COOKIE_KIOSKO)?.value);
  if (!dispositivo) return Response.json({ ok: false, error: "Esta tablet no está registrada. Pida a la dirección que la registre." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { empleadoId?: string; pin?: string; tipo?: string } | null;
  if (!body?.empleadoId || !/^[0-9a-f-]{36}$/.test(body.empleadoId) || !["entrada", "salida"].includes(body.tipo ?? "")) {
    return Response.json({ ok: false, error: "Faltan datos. Intente de nuevo." }, { status: 400 });
  }
  const r = await registrarMarca(dispositivo.id, body.empleadoId, String(body.pin ?? ""), body.tipo as "entrada" | "salida");
  return Response.json(r, { status: r.ok ? 200 : r.bloqueado ? 429 : 400 });
}
