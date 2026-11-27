/** Colores para las ubicaciones (Dirección escoge uno; si no, se asigna uno automático por el número de la ubicación). */
export const COLORES_UBICACION = [
  { valor: "#ef4444", nombre: "Rojo" }, { valor: "#f97316", nombre: "Naranja" }, { valor: "#eab308", nombre: "Amarillo" },
  { valor: "#84cc16", nombre: "Verde limón" }, { valor: "#16a34a", nombre: "Verde" }, { valor: "#14b8a6", nombre: "Turquesa" },
  { valor: "#0ea5e9", nombre: "Celeste" }, { valor: "#2563eb", nombre: "Azul" }, { valor: "#7c3aed", nombre: "Morado" },
  { valor: "#db2777", nombre: "Fucsia" }, { valor: "#a16207", nombre: "Café" }, { valor: "#64748b", nombre: "Gris" },
  { valor: "#065f46", nombre: "Verde oscuro" }, { valor: "#0891b2", nombre: "Cian" }, { valor: "#4f46e5", nombre: "Índigo" },
  { valor: "#c026d3", nombre: "Magenta" }, { valor: "#fb7185", nombre: "Rosado" }, { valor: "#ca8a04", nombre: "Mostaza" },
  { valor: "#9a3412", nombre: "Terracota" }, { valor: "#1e3a8a", nombre: "Azul marino" },
];

export const colorUbicacion = (id: number, color: string | null | undefined) => color ?? COLORES_UBICACION[id % COLORES_UBICACION.length].valor;
