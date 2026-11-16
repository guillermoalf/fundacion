/**
 * Resultado de las Server Actions: nunca lanzan excepciones a la pantalla.
 * `ejecutar` atrapa el error y lo traduce a un mensaje que la directora entienda.
 */
export type Resultado<T extends object = object> = ({ ok: true } & T) | { ok: false; error: string };

/** Estado inicial para useActionState. */
export const SIN_RESULTADO = null;

type ErrorPg = { code?: string; message?: string; constraint?: string };

export function mensajeError(e: unknown): string {
  const err = (e ?? {}) as ErrorPg;
  switch (err.code) {
    case "42501":
      return "No tiene permiso para hacer esto. Si lo necesita, pídaselo a la dirección.";
    case "P0001":
      // Mensajes escritos por nosotros en las funciones y triggers de la base (ya están en español).
      return err.message ?? "La base de datos rechazó el cambio.";
    case "23505":
      return "Ya existe un registro con esos mismos datos. Revise que no esté repetido.";
    case "23503":
      return "Falta un dato relacionado (por ejemplo, la ubicación o la fuente). Revise el formulario.";
    case "23514":
    case "22P02":
    case "22007":
    case "22008":
      return "Algún dato no es válido (un monto negativo, una fecha o un número mal escrito). Revise el formulario.";
    case "23502":
      return "Falta un dato obligatorio. Revise el formulario.";
  }
  if (e instanceof ErrorUsuario) return e.message;
  console.error(e);
  return "No se pudo guardar. Intente de nuevo; si sigue pasando, avise a quien da soporte al portal.";
}

/** Error con un mensaje pensado para mostrarse tal cual. */
export class ErrorUsuario extends Error {}

export async function ejecutar<T extends object>(fn: () => Promise<T>): Promise<Resultado<T>> {
  try {
    return { ok: true, ...(await fn()) };
  } catch (e) {
    // redirect() y notFound() de Next se lanzan como errores: hay que dejarlos pasar.
    if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_")) throw e;
    return { ok: false, error: mensajeError(e) };
  }
}

// ----------------------------------------------------------------------------- lectura de formularios
export const texto = (f: FormData, k: string): string | null => {
  const v = f.get(k);
  if (v === null || typeof v !== "string") return null;
  const s = v.trim();
  return s === "" ? null : s;
};
export const textoObligatorio = (f: FormData, k: string, nombre: string): string => {
  const v = texto(f, k);
  if (v === null) throw new ErrorUsuario(`Falta ${nombre}.`);
  return v;
};
/** Acepta "1.234,56", "1234.56" o "1 234". null si está vacío. */
export const numero = (f: FormData, k: string): number | null => {
  const v = texto(f, k);
  if (v === null) return null;
  const limpio = v.replace(/[₡\s]/g, "");
  const normal = /,\d{1,3}$/.test(limpio) ? limpio.replace(/\./g, "").replace(",", ".") : limpio.replace(/,/g, "");
  const n = Number(normal);
  if (!Number.isFinite(n)) throw new ErrorUsuario(`"${v}" no es un número válido.`);
  return n;
};
export const entero = (f: FormData, k: string): number | null => {
  const n = numero(f, k);
  return n === null ? null : Math.trunc(n);
};
export const casilla = (f: FormData, k: string) => f.get(k) === "on" || f.get(k) === "true";
