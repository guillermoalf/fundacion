"use client";

/**
 * Borradores de formularios de registro, guardados SOLO en este navegador (localStorage) y por usuario:
 * otra persona que entre en la misma computadora no los ve. Se borran al registrar o cuando la persona
 * elige «Descartar».
 */
import { createContext, useContext, useEffect } from "react";
import { useRouter } from "next/navigation";

const ContextoUsuario = createContext<string | null>(null);
export function ProveedorUsuario({ id, children }: { id: string; children: React.ReactNode }) {
  return <ContextoUsuario.Provider value={id}>{children}</ContextoUsuario.Provider>;
}
export const useUsuarioId = () => useContext(ContextoUsuario);

export type Borrador = { guardado: number; datos: Record<string, string> };
const clave = (usuario: string, nombre: string) => `fcf:borrador:${usuario}:${nombre}`;

export function leerBorrador(usuario: string | null, nombre: string): Borrador | null {
  if (!usuario) return null;
  try {
    const b = JSON.parse(localStorage.getItem(clave(usuario, nombre)) ?? "null") as Borrador | null;
    return b && typeof b.guardado === "number" && b.datos ? b : null;
  } catch {
    return null;
  }
}
export function guardarBorrador(usuario: string | null, nombre: string, datos: Record<string, string>) {
  if (!usuario) return;
  try { localStorage.setItem(clave(usuario, nombre), JSON.stringify({ guardado: Date.now(), datos })); } catch { /* sin espacio o bloqueado */ }
}
export function borrarBorrador(usuario: string | null, nombre: string) {
  if (!usuario) return;
  try { localStorage.removeItem(clave(usuario, nombre)); } catch { /* bloqueado */ }
}

/** En la lista (p. ej. Compras): si hay un registro sin terminar, abre directo el formulario donde se quedó. */
export function VolverAlBorrador({ nombre, href }: { nombre: string; href: string }) {
  const usuario = useUsuarioId();
  const router = useRouter();
  useEffect(() => {
    if (leerBorrador(usuario, nombre)) router.replace(href);
  }, [usuario, nombre, href, router]);
  return null;
}
