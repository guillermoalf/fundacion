/**
 * Guarda en la base lo que devolvió `importarActivosExcel`, después de que la directora revisó la vista previa.
 * Crea las ubicaciones que no existan y registra cada activo con origen = 'importacion' y su movimiento de alta.
 */
import { sql } from "kysely";
import type { Tx } from "@/lib/db";
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

type ArgsGuardar = {
  p_fuente: string;
  p_archivo: string;
  p_ubicaciones_nuevas: { nombre: string; tipo: string }[];
  p_activos: Record<string, unknown>[];
  p_forzar: boolean;
};
type Resultado = { activos: number; ubicacionesCreadas: string[] };

/** Lo único que este módulo necesita de la base (en los tests se reemplaza por uno falso). */
export interface ClienteDB {
  nombresUbicaciones(): Promise<string[]>;
  guardarImportacionActivos(args: ArgsGuardar): Promise<Resultado>;
}

/** Cliente real: corre dentro de la transacción del usuario (conUsuario), así aplica el RLS y la bitácora. */
export const clienteDB = (tx: Tx): ClienteDB => ({
  async nombresUbicaciones() {
    return (await tx.selectFrom("ubicaciones").select("nombre").execute()).map((u) => u.nombre);
  },
  async guardarImportacionActivos(a) {
    try {
      const { rows } = await sql<{ r: Resultado }>`select guardar_importacion_activos(
        ${a.p_fuente}, ${a.p_archivo}, ${JSON.stringify(a.p_ubicaciones_nuevas)}::jsonb,
        ${JSON.stringify(a.p_activos)}::jsonb, ${a.p_forzar}) as r`.execute(tx);
      return rows[0].r;
    } catch (e) {
      if ((e as { code?: string }).code === "CF001") throw new ImportacionDuplicadaError((e as Error).message);
      throw e;
    }
  },
});

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
): Promise<Resultado> {
  // Una ubicación existente se reconoce aunque cambien tildes o mayúsculas, y se usa su nombre tal como está guardado
  const existentes = new Map<string, string>((await db.nombresUbicaciones()).map((n) => [sinTildes(n), n]));
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

  return db.guardarImportacionActivos({
    p_fuente: opts.fuenteCodigo,
    p_archivo: opts.archivo,
    p_ubicaciones_nuevas: faltantes.map((nombre) => ({ nombre, tipo: tipoUbicacion(nombre) })),
    p_activos: activos,
    p_forzar: opts.forzar ?? false,
  });
}
