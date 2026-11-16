export const CATEGORIAS_PRODUCTO = {
  perecedero: "Alimentos perecederos",
  no_perecedero: "Alimentos no perecederos",
  limpieza: "Limpieza",
  didactico: "Material didáctico",
  oficina: "Oficina",
  otro: "Otro",
} as const;
export const opcionesCategoria = Object.entries(CATEGORIAS_PRODUCTO).map(([valor, texto]) => ({ valor, texto }));
/** Días antes del vencimiento en que se avisa. */
export const DIAS_AVISO_VENCIMIENTO = 15;
