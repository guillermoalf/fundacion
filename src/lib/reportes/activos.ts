/**
 * Reportes configurables (activos, compras e inventario): especificaciones (qué entra y cómo se agrupa) y los filtros.
 * Las listas de Activos e Inventario no tienen condiciones; las reglas (p. ej. la baja cuantía del PANI) viven en cada reporte.
 * Sin base de datos: se prueba aparte y lo usan la vista previa y la descarga.
 */
export type TipoReporte = "activos" | "compras" | "inventario";
export const TIPOS_REPORTE: Record<TipoReporte, string> = { activos: "Activos", compras: "Compras", inventario: "Inventario" };
export const tipoReporte = (v: unknown): TipoReporte => (v === "compras" || v === "inventario" ? v : "activos");
export type MontoMinimo = { tipo: "ninguno" } | { tipo: "monto"; valor: number } | { tipo: "umbral" };
export type ConfigReporte = {
  /** Encabezado del Excel, p. ej. «Auxiliar de activos fijos Recursos PANI» */
  titulo: string;
  programa: string;
  /** códigos de fuente; vacío = todas */
  fuentes: string[];
  montoMinimo: MontoMinimo;
  /** el monto mínimo se compara con el costo de cada unidad o con el total de la línea de la compra */
  montoBase: "unidad" | "linea";
  agrupar: "ubicacion" | "categoria" | "ninguno";
  /** vacío = todas */
  ubicaciones: number[];
  categorias: number[];
  adquiridoDesde: string | null;
  adquiridoHasta: string | null;
  /** vacío = todos los estados excepto «dado de baja» */
  estados: string[];
  incluirBajas: boolean;
  /** texto que debe tener el nombre (p. ej. «silla»); vacío = todo */
  buscar: string;
  /** activos: «auxiliar» = formato del Auxiliar de activos fijos · «conteo» = cuántos hay por aula y estado (control interno) */
  formato: "auxiliar" | "conteo";
  /** compras: ids de proveedores; vacío = todos */
  proveedores: number[];
  /** compras e inventario: códigos de categorías de inventario; vacío = todas */
  categoriasProducto: string[];
  /** compras: cómo se divide el Excel */
  agruparCompras: "proveedor" | "categoria" | "ninguno";
};

export const CONFIG_INICIAL: ConfigReporte = {
  titulo: "Auxiliar de activos fijos", programa: "Fundación Creciendo Feliz ABC", fuentes: [], montoMinimo: { tipo: "ninguno" }, montoBase: "unidad",
  agrupar: "ubicacion", ubicaciones: [], categorias: [], adquiridoDesde: null, adquiridoHasta: null, estados: [], incluirBajas: false,
  buscar: "", formato: "auxiliar", proveedores: [], categoriasProducto: [], agruparCompras: "proveedor",
};

const fecha = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
const numeros = (v: unknown) => (Array.isArray(v) ? v.map(Number).filter((n) => Number.isInteger(n) && n > 0) : []);
const textos = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.length > 0 && x.length < 40) : []);

/** Convierte lo guardado (o lo que manda el formulario) en una configuración válida, con valores por defecto. */
export function normalizarConfig(v: unknown): ConfigReporte {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const m = (o.montoMinimo && typeof o.montoMinimo === "object" ? o.montoMinimo : {}) as Record<string, unknown>;
  const valor = Number(m.valor);
  const montoMinimo: MontoMinimo = m.tipo === "umbral" ? { tipo: "umbral" }
    : m.tipo === "monto" && Number.isFinite(valor) && valor > 0 ? { tipo: "monto", valor } : { tipo: "ninguno" };
  const texto = (k: string, def: string) => (typeof o[k] === "string" && (o[k] as string).trim() ? (o[k] as string).trim().slice(0, 150) : def);
  return {
    titulo: texto("titulo", CONFIG_INICIAL.titulo),
    programa: texto("programa", CONFIG_INICIAL.programa),
    fuentes: textos(o.fuentes),
    montoMinimo,
    montoBase: o.montoBase === "linea" ? "linea" : "unidad",
    agrupar: o.agrupar === "categoria" || o.agrupar === "ninguno" ? o.agrupar : "ubicacion",
    ubicaciones: numeros(o.ubicaciones),
    categorias: numeros(o.categorias),
    adquiridoDesde: fecha(o.adquiridoDesde),
    adquiridoHasta: fecha(o.adquiridoHasta),
    estados: textos(o.estados),
    incluirBajas: o.incluirBajas === true,
    buscar: typeof o.buscar === "string" ? o.buscar.trim().slice(0, 80) : "",
    formato: o.formato === "conteo" ? "conteo" : "auxiliar",
    proveedores: numeros(o.proveedores),
    categoriasProducto: textos(o.categoriasProducto),
    agruparCompras: o.agruparCompras === "categoria" || o.agruparCompras === "ninguno" ? o.agruparCompras : "proveedor",
  };
}

export type ActivoReporte = {
  id: string; tipoBien: string; marca: string | null; modelo: string | null; serie: string | null; placa: string | null;
  fuente: string; ubicacionId: number | null; ubicacion: string | null; categoriaId: number | null; categoria: string | null;
  estado: string; fechaAdquisicion: string | null; fechaBaja: string | null;
  /** costo registrado del activo (puede cubrir varias unidades si así venía del Excel) */
  costo: number | null; unidades: number | null; totalLinea: number | null; depreciacion: number | null;
};

/** Costo de una unidad (si el costo registrado cubría varias unidades, se divide). */
export const costoUnidad = (a: ActivoReporte) => (a.costo === null ? null : a.unidades && a.unidades > 1 ? a.costo / a.unidades : a.costo);
/** Total de la línea de la compra (o el costo registrado si no vino de una compra). */
export const totalLinea = (a: ActivoReporte) => a.totalLinea ?? a.costo;

/**
 * Qué activos entran en el reporte a una fecha de corte. `umbral` = 25 % del salario base (de Parámetros) a esa fecha.
 * Un activo sin costo no se puede comparar con un monto mínimo: queda fuera y se cuenta en `sinCosto`.
 */
export function filtrarActivos(activos: ActivoReporte[], c: ConfigReporte, corte: string, umbral: number | null) {
  const minimo = c.montoMinimo.tipo === "monto" ? c.montoMinimo.valor : c.montoMinimo.tipo === "umbral" ? umbral : null;
  let sinCosto = 0;
  const filas = activos.filter((a) => {
    if (a.fechaAdquisicion && a.fechaAdquisicion > corte) return false;
    const dadoDeBaja = a.estado === "dado_de_baja" || (a.fechaBaja !== null && a.fechaBaja <= corte);
    if (dadoDeBaja && !c.incluirBajas) return false;
    if (c.estados.length && !c.estados.includes(a.estado)) return false;
    if (c.fuentes.length && !c.fuentes.includes(a.fuente)) return false;
    if (c.ubicaciones.length && (a.ubicacionId === null || !c.ubicaciones.includes(a.ubicacionId))) return false;
    if (c.categorias.length && (a.categoriaId === null || !c.categorias.includes(a.categoriaId))) return false;
    if (c.adquiridoDesde && (!a.fechaAdquisicion || a.fechaAdquisicion < c.adquiridoDesde)) return false;
    if (c.adquiridoHasta && (!a.fechaAdquisicion || a.fechaAdquisicion > c.adquiridoHasta)) return false;
    if (!contiene([a.tipoBien, a.marca, a.modelo], c.buscar)) return false;
    if (c.montoMinimo.tipo !== "ninguno") {
      if (minimo === null) return false;
      const monto = c.montoBase === "linea" ? totalLinea(a) : costoUnidad(a);
      if (monto === null) { sinCosto++; return false; }
      if (monto < minimo) return false;
    }
    return true;
  });
  return { filas, sinCosto, minimo };
}

/** Sin tildes ni mayúsculas, para buscar «silla» y encontrar «Sillas de bebé». */
export const sinTildes = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
/** ¿Alguno de los textos contiene lo buscado? (vacío = sí) */
export const contiene = (textos: (string | null)[], buscar: string) => !buscar || textos.some((t) => t && sinTildes(t).includes(sinTildes(buscar)));

export const ESTADOS_CONTEO = ["en_uso", "en_reparacion", "en_bodega", "extraviado", "dado_de_baja"] as const;
/** Cuántos hay en total, por estado y por aula (reporte de conteo, p. ej. «sillas de bebé»). Cada activo es una unidad. */
export function conteoActivos(filas: ActivoReporte[], corte: string) {
  const estadoA = (a: ActivoReporte) => (a.fechaBaja !== null && a.fechaBaja <= corte ? "dado_de_baja" : a.estado);
  const vacio = () => Object.fromEntries(ESTADOS_CONTEO.map((e) => [e, 0])) as Record<string, number>;
  const porEstado = vacio();
  const aulas = new Map<string, { total: number; porEstado: Record<string, number> }>();
  for (const a of filas) {
    const e = estadoA(a);
    porEstado[e] = (porEstado[e] ?? 0) + 1;
    const nombre = a.ubicacion ?? "Sin ubicación";
    const g = aulas.get(nombre) ?? { total: 0, porEstado: vacio() };
    g.total++;
    g.porEstado[e] = (g.porEstado[e] ?? 0) + 1;
    aulas.set(nombre, g);
  }
  return {
    total: filas.length, porEstado,
    porUbicacion: [...aulas].sort((x, y) => x[0].localeCompare(y[0], "es")).map(([ubicacion, g]) => ({ ubicacion, ...g })),
  };
}

/** Grupos del Excel (secciones con su encabezado de color) en orden alfabético. */
export function agrupar(filas: ActivoReporte[], modo: ConfigReporte["agrupar"]) {
  const clave = (a: ActivoReporte) => (modo === "ubicacion" ? a.ubicacion ?? "Sin ubicación" : modo === "categoria" ? a.categoria ?? "Sin categoría" : "");
  const grupos = new Map<string, ActivoReporte[]>();
  for (const a of filas) grupos.set(clave(a), [...(grupos.get(clave(a)) ?? []), a]);
  return [...grupos].sort((x, y) => x[0].localeCompare(y[0], "es")).map(([titulo, items]) => ({
    titulo: modo === "ninguno" ? null : titulo,
    items: items.sort((x, y) => x.tipoBien.localeCompare(y.tipoBien, "es") || (x.placa ?? "").localeCompare(y.placa ?? "", "es", { numeric: true })),
  }));
}
