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
}

export async function guardarImportacion(
  db: ClienteDB,
  filas: FilaImportada[],
  opts: { fuenteCodigo: string; archivo: string; categoriaIdPorNombre: Map<string, number> },
) {
  const { data: fuente, error: e1 } = await db.from("fuentes_financiamiento").select("id").eq("codigo", opts.fuenteCodigo).single();
  if (e1) throw e1;

  const { data: ubic, error: e2 } = await db.from("ubicaciones").select("id, nombre");
  if (e2) throw e2;
  const porNombre = new Map<string, number>((ubic as { id: number; nombre: string }[]).map((u) => [sinTildes(u.nombre), u.id]));

  const faltantes = [...new Set(filas.map((f) => f.ubicacion).filter((u): u is string => !!u).map(nombreUbicacion))]
    .filter((n) => !porNombre.has(sinTildes(n)));
  if (faltantes.length) {
    const { data, error } = await db.from("ubicaciones").insert(faltantes.map((nombre) => ({ nombre, tipo: tipoUbicacion(nombre) }))).select("id, nombre");
    if (error) throw error;
    for (const u of data as { id: number; nombre: string }[]) porNombre.set(sinTildes(u.nombre), u.id);
  }
  const sinUbicacion = porNombre.get(sinTildes("Sin ubicación"));

  const registros = filas.map((f) => ({
    placa: f.placa,
    tipo_bien: f.tipoBien,
    marca: f.marca,
    modelo: f.modelo,
    serie: f.serie,
    categoria_id: f.categoria ? opts.categoriaIdPorNombre.get(f.categoria.nombre) ?? null : null,
    ubicacion_id: f.ubicacion ? porNombre.get(sinTildes(nombreUbicacion(f.ubicacion))) : sinUbicacion,
    fuente_id: fuente.id,
    fecha_adquisicion: f.fechaAdquisicion,
    costo: f.costo,
    unidades_compra: f.unidadesCompra,
    origen: "importacion",
    fila_origen: `${opts.archivo} · fila ${f.filaOrigen}`,
    notas: f.pendientes.length ? f.pendientes.join(" | ") : null,
  }));
  if (registros.some((r) => r.ubicacion_id === undefined)) throw new Error('Hay filas sin ubicación: cree la ubicación "Sin ubicación" o asigne una');

  const { data: activos, error: e3 } = await db.from("activos").insert(registros).select("id, ubicacion_id");
  if (e3) throw e3;
  const { error: e4 } = await db.from("activo_movimientos").insert(
    (activos as { id: string; ubicacion_id: number }[]).map((a) => ({
      activo_id: a.id, tipo: "alta", ubicacion_destino_id: a.ubicacion_id, motivo: `Migración desde Excel: ${opts.archivo}`,
    })),
  );
  if (e4) throw e4;
  return { activos: activos.length, ubicacionesCreadas: faltantes };
}
