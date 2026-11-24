import type { Rol } from "@/lib/portal/sesion";

/** `personal`: el rol Personal solo ve los enlaces marcados así. */
export type ItemMenu = { href: string; etiqueta: string; roles?: Rol[]; personal?: boolean };
/** `icono`: nombre del ícono en Menu.tsx · `color`: color del arcoíris del kínder para la sección. */
export type SeccionMenu = { titulo: string; icono: IconoMenu; color: string; items: ItemMenu[] };
export type IconoMenu = "inicio" | "ninos" | "activos" | "compras" | "personal" | "reportes" | "administracion" | "cuenta";

/** Menú lateral. `roles` solo oculta el enlace (comodidad): el permiso real lo decide el RLS. */
export const MENU: SeccionMenu[] = [
  { titulo: "Inicio", icono: "inicio", color: "#6ec1ff", items: [{ href: "/portal", etiqueta: "Inicio", personal: true }] },
  { titulo: "Niños", icono: "ninos", color: "#ff9800", items: [
      { href: "/portal/ninos", etiqueta: "Niños y niñas", roles: ["admin", "coordinacion", "auditor", "personal"], personal: true },
      { href: "/portal/ninos/lista", etiqueta: "Pasar lista", roles: ["admin", "coordinacion", "personal"], personal: true },
      { href: "/portal/ninos/asistencia", etiqueta: "Asistencia de niños", roles: ["admin", "coordinacion", "auditor"] },
      { href: "/portal/ninos/estudios", etiqueta: "Estudios socioeconómicos", roles: ["admin", "coordinacion", "auditor"] },
    ] },
  { titulo: "Activos", icono: "activos", color: "#fbbf24", items: [
      { href: "/portal/activos", etiqueta: "Activos" },
      { href: "/portal/pendientes", etiqueta: "Pendientes" },
      { href: "/portal/depreciacion", etiqueta: "Tabla de depreciación" },
      { href: "/portal/conteos", etiqueta: "Conteo físico" },
    ] },
  { titulo: "Compras", icono: "compras", color: "#4ade80", items: [
      { href: "/portal/compras", etiqueta: "Compras" },
      { href: "/portal/proveedores", etiqueta: "Proveedores" },
      { href: "/portal/inventario", etiqueta: "Inventario" },
    ] },
  { titulo: "Personal", icono: "personal", color: "#fb7185", items: [
      { href: "/portal/personal", etiqueta: "Personal" },
      { href: "/portal/asistencia", etiqueta: "Asistencia" },
      { href: "/portal/ausencias", etiqueta: "Ausencias" },
      { href: "/portal/vacaciones", etiqueta: "Vacaciones", personal: true },
      { href: "/portal/planilla", etiqueta: "Planilla", roles: ["admin", "contabilidad", "auditor"] },
      { href: "/portal/parametros", etiqueta: "Parámetros legales", roles: ["admin", "contabilidad", "auditor"] },
    ] },
  { titulo: "Reportes", icono: "reportes", color: "#67e8f9", items: [{ href: "/portal/reportes", etiqueta: "Reportes" }] },
  { titulo: "Administración", icono: "administracion", color: "#c4b5fd", items: [{ href: "/portal/usuarios", etiqueta: "Usuarios", roles: ["admin"] },
      { href: "/portal/kiosko", etiqueta: "Kiosko de asistencia", roles: ["admin"] },
      { href: "/portal/bitacora", etiqueta: "Bitácora", roles: ["admin", "contabilidad", "auditor"] },
    ] },
  { titulo: "Cuenta", icono: "cuenta", color: "#e2e8f0", items: [{ href: "/portal/cuenta", etiqueta: "Mi cuenta", personal: true }] },
];
