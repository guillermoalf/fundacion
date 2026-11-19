import type { Rol } from "@/lib/portal/sesion";

/** `personal`: el rol Personal solo ve los enlaces marcados así. */
export type ItemMenu = { href: string; etiqueta: string; roles?: Rol[]; personal?: boolean };
export type SeccionMenu = { titulo?: string; items: ItemMenu[] };

/** Menú lateral. `roles` solo oculta el enlace (comodidad): el permiso real lo decide el RLS. */
export const MENU: SeccionMenu[] = [
  { items: [{ href: "/portal", etiqueta: "Inicio" }] },
  { titulo: "Niños", items: [
      { href: "/portal/ninos", etiqueta: "Niños y niñas", roles: ["admin", "coordinacion", "auditor", "personal"], personal: true },
      { href: "/portal/ninos/lista", etiqueta: "Pasar lista", roles: ["admin", "coordinacion", "personal"], personal: true },
      { href: "/portal/ninos/asistencia", etiqueta: "Asistencia de niños", roles: ["admin", "coordinacion", "auditor"] },
    ] },
  { titulo: "Activos", items: [
      { href: "/portal/activos", etiqueta: "Activos" },
      { href: "/portal/pendientes", etiqueta: "Pendientes" },
      { href: "/portal/depreciacion", etiqueta: "Tabla de depreciación" },
      { href: "/portal/conteos", etiqueta: "Conteo físico" },
    ] },
  { titulo: "Compras", items: [
      { href: "/portal/compras", etiqueta: "Compras" },
      { href: "/portal/proveedores", etiqueta: "Proveedores" },
      { href: "/portal/inventario", etiqueta: "Inventario" },
    ] },
  { titulo: "Personal", items: [
      { href: "/portal/personal", etiqueta: "Personal" },
      { href: "/portal/asistencia", etiqueta: "Asistencia" },
      { href: "/portal/ausencias", etiqueta: "Ausencias" },
      { href: "/portal/planilla", etiqueta: "Planilla", roles: ["admin", "contabilidad", "auditor"] },
      { href: "/portal/parametros", etiqueta: "Parámetros legales", roles: ["admin", "contabilidad", "auditor"] },
    ] },
  { titulo: "Reportes", items: [{ href: "/portal/reportes", etiqueta: "Reportes" }] },
  { titulo: "Administración", items: [{ href: "/portal/usuarios", etiqueta: "Usuarios", roles: ["admin"] },
      { href: "/portal/kiosko", etiqueta: "Kiosko de asistencia", roles: ["admin"] },
      { href: "/portal/bitacora", etiqueta: "Bitácora", roles: ["admin", "contabilidad", "auditor"] },
    ] },
  { titulo: "Cuenta", items: [{ href: "/portal/cuenta", etiqueta: "Mi cuenta", personal: true }] },
];
