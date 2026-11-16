/**
 * Servidor del kiosko de asistencia (/marcar). Es la única parte del portal que escribe con la conexión
 * del dueño fuera de scripts/ (AGENTS.md, regla 2): en la tablet no hay usuario del portal.
 * Seguridad: token de la tablet (hash SHA-256 en la base) + PIN de 4 dígitos (scrypt) + freno de intentos.
 */
import { createHash, randomBytes } from "node:crypto";
import { sql } from "kysely";
import { verifyPassword } from "better-auth/crypto";
import { dbDueno } from "@/lib/db/conexion";

export const COOKIE_KIOSKO = "kiosko_token";
/** Intentos fallidos permitidos por persona en la ventana, y por tablet (alguien probando con todos). */
export const MAX_FALLOS_PERSONA = 5;
export const MAX_FALLOS_TABLET = 20;
export const VENTANA_MIN = 15;

export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");
export const nuevoToken = () => randomBytes(32).toString("base64url");

export async function dispositivoPorToken(token: string | undefined) {
  if (!token) return null;
  const d = await dbDueno.selectFrom("dispositivos_kiosko").select(["id", "nombre"]).where("token_hash", "=", hashToken(token)).where("activo", "=", true).executeTakeFirst();
  return d ?? null;
}

export async function personalParaKiosko() {
  return dbDueno.selectFrom("empleados").select(["id", "nombre", "foto_url"]).where("activo", "=", true).orderBy("nombre").execute();
}

/** Foto de una persona activa (solo la sirve a una tablet registrada). */
export async function fotoEmpleado(empleadoId: string) {
  const e = await dbDueno.selectFrom("empleados").select("foto_url").where("id", "=", empleadoId).where("activo", "=", true).executeTakeFirst();
  const archivo = e?.foto_url?.match(/\/portal\/archivos\/([0-9a-f-]{36})$/)?.[1];
  if (!archivo) return null;
  return (await dbDueno.selectFrom("archivos").select(["tipo", "contenido"]).where("id", "=", archivo).executeTakeFirst()) ?? null;
}

export type ResultadoMarca =
  | { ok: true; nombre: string; tipo: "entrada" | "salida"; hora: Date }
  | { ok: false; error: string; bloqueado?: boolean };

export async function registrarMarca(dispositivoId: string, empleadoId: string, pin: string, tipo: "entrada" | "salida"): Promise<ResultadoMarca> {
  const e = await dbDueno.selectFrom("empleados").select(["id", "nombre"]).where("id", "=", empleadoId).where("activo", "=", true).executeTakeFirst();
  if (!e) return { ok: false, error: "No se encontró a esa persona." };

  const { rows: [f] } = await sql<{ persona: number; tablet: number }>`
    select count(*) filter (where empleado_id = ${empleadoId})::int as persona, count(*)::int as tablet
    from intentos_pin where not exitoso and en > now() - make_interval(mins => ${VENTANA_MIN}) and dispositivo_id = ${dispositivoId}`.execute(dbDueno);
  if (f.persona >= MAX_FALLOS_PERSONA || f.tablet >= MAX_FALLOS_TABLET) {
    return { ok: false, bloqueado: true, error: `Demasiados intentos con PIN incorrecto. Espere ${VENTANA_MIN} minutos o pida a administración que registre la marca.` };
  }

  const { rows: [p] } = await sql<{ pin_hash: string }>`select pin_hash from empleados_pin where empleado_id = ${empleadoId}`.execute(dbDueno);
  const valido = !!p && /^\d{4}$/.test(pin) && (await verifyPassword({ hash: p.pin_hash, password: pin }));
  await sql`insert into intentos_pin (empleado_id, dispositivo_id, exitoso) values (${empleadoId}, ${dispositivoId}, ${valido})`.execute(dbDueno);
  if (!p) return { ok: false, error: "Todavía no tiene PIN. Pida a administración que se lo asigne." };
  if (!valido) {
    const quedan = MAX_FALLOS_PERSONA - f.persona - 1;
    return { ok: false, error: quedan > 0 ? `PIN incorrecto. Le quedan ${quedan} intentos.` : "PIN incorrecto.", bloqueado: quedan <= 0 };
  }

  const m = await dbDueno.insertInto("marcas")
    .values({ empleado_id: empleadoId, tipo, origen: "kiosko", dispositivo_id: dispositivoId, registrado_por: null })
    .returning("marcado_en").executeTakeFirstOrThrow();
  await dbDueno.updateTable("dispositivos_kiosko").set({ ultimo_uso: new Date() }).where("id", "=", dispositivoId).execute();
  return { ok: true, nombre: e.nombre, tipo, hora: m.marcado_en };
}
