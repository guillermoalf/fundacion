import type { Rol } from "@/lib/portal/sesion";

export type ItemMenu = { href: string; etiqueta: string; roles?: Rol[] };
export type SeccionMenu = { titulo?: string; items: ItemMenu[] };

/** Menú lateral. `roles` solo oculta el enlace (comodidad): el permiso real lo decide el RLS. */
export const MENU: SeccionMenu[] = [
  { items: [{ href: "/portal", etiqueta: "Inicio" }] },
  { titulo: "Cuenta", items: [{ href: "/portal/cuenta", etiqueta: "Mi cuenta" }] },
];
