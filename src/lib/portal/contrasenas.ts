import { randomInt } from "node:crypto";

// Sin letras que se confunden al dictarlas o copiarlas a mano (0/O, 1/l/I).
const ALFABETO = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Contraseña temporal de 12 caracteres, en grupos de 4 para leerla en voz alta: "k7Pd-x9Qa-mR3t". */
export function contrasenaTemporal(): string {
  const c = Array.from({ length: 12 }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");
  return `${c.slice(0, 4)}-${c.slice(4, 8)}-${c.slice(8)}`;
}
