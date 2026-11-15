/**
 * Guarda en Supabase lo que devolvió `importarActivosExcel`, después de que la directora revisó la vista previa.
 * Crea las ubicaciones que no existan y registra cada activo con origen = 'importacion' y su movimiento de alta.
 */
import type { FilaImportada } from "./activosExcel";

const ROMANOS = /\b(Ii|Iii|Iv|Vi)\b/g;
const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** "AULA 1 AFTER II" → "Aula 1 After II" */
const MENORES = new Set(["de", "del", "la", "el", "al", "y", "a", "en", "por", "entre", "frente", "hasta", "final"]);
export const nombreUbicacion = (s: string) =>
  s.trim().toLowerCase().split(/\s+/)
    .map((w, i) => (i > 0 && MENORES.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ").replace(ROMANOS, (r) => r.toUpperCase());

export function tipoUbicacion(n: string) {
  const k = sinTildes(n);
  if (/^(aula|estimulacion|instrumentos)/.test(k)) return "aula";
  if (k.includes("bodega")) return "bodega";
  if (k.includes("oficina") || k.includes("psicolog")) return "oficina";
  if (k.includes("patio")) return "exterior";
  return "area_comun";
}

/** Cliente mínimo (compatible con @supabase/supabase-js) para no acoplar este módulo a una versión. */
interface ClienteDB {
  from(tabla: string): any;
  rpc(funcion: string, args: Record<string, unknown>): any;
}

/** El archivo ya se había importado (la base lo detecta por `fila_origen`). Se puede reintentar con `forzar`. */
export class ImportacionDuplicadaError extends Error {}

/**
 * Todo se guarda en una sola transacción (función `guardar_importacion_activos`): si una fila falla
 * no queda nada a medias. Aquí solo se arma el envío: qué ubicaciones faltan y a cuál va cada activo.
 */
export async function guardarImportacion(
  db: ClienteDB,
  filas: FilaImportada[],
  opts: { fuenteCodigo: string; archivo: string; categoriaIdPorNombre: Map<string, number>; forzar?: boolean },
): Promise<{ activos: number; ubicacionesCreadas: string[] }> {
  const { data: ubic, error: e1 } = await db.from("ubicaciones").select("id, nombre");
  if (e1) throw e1;
  // Una ubicación existente se reconoce aunque cambien tildes o mayúsculas, y se usa su nombre tal como está guardado
  const existentes = new Map<string, string>((ubic as { nombre: string }[]).map((u) => [sinTildes(u.nombre), u.nombre]));
  const nombreFinal = (u: string | null) => {
    const n = nombreUbicacion(u ?? "Sin ubicación");
    return existentes.get(sinTildes(n)) ?? n;
  };

  const faltantes = [...new Set(filas.map((f) => nombreFinal(f.ubicacion)))].filter((n) => !existentes.has(sinTildes(n)));

  const activos = filas.map((f) => ({
    placa: f.placa,
    tipo_bien: f.tipoBien,
    marca: f.marca,
    modelo: f.modelo,
    serie: f.serie,
    categoria_id: f.categoria ? opts.categoriaIdPorNombre.get(f.categoria.nombre) ?? null : null,
    ubicacion: nombreFinal(f.ubicacion),
    fecha_adquisicion: f.fechaAdquisicion,
    costo: f.costo,
    unidades_compra: f.unidadesCompra,
    fila_origen: `${opts.archivo} · fila ${f.filaOrigen}`,
    notas: f.pendientes.length ? f.pendientes.join(" | ") : null,
  }));

  const { data, error } = await db.rpc("guardar_importacion_activos", {
    p_fuente: opts.fuenteCodigo,
    p_archivo: opts.archivo,
    p_ubicaciones_nuevas: faltantes.map((nombre) => ({ nombre, tipo: tipoUbicacion(nombre) })),
    p_activos: activos,
    p_forzar: opts.forzar ?? false,
  });
  if (error) {
    if (error.code === "CF001") throw new ImportacionDuplicadaError(error.message);
    throw error;
  }
  return data as { activos: number; ubicacionesCreadas: string[] };
}
