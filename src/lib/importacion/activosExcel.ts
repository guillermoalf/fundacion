/**
 * Importador de Excel de activos — lo usa la directora desde el portal para migrar sus archivos.
 *
 * Acepta tanto el formato oficial del PANI (con columna "Ubicación Física") como el formato que
 * usaba la fundación (títulos de sección: "AULA 1 AFTER II", "COCINA"...). Lee el archivo, normaliza
 * fechas/costos/placas, sugiere la categoría del Anexo 2, RECALCULA la depreciación (ignora la
 * del Excel) y devuelve cada fila con la lista de pendientes. Nada bloquea la importación: si falta
 * un dato el campo queda vacío y aparece como pendiente.
 */
import ExcelJS from "exceljs";
import { calcularDepreciacion } from "../calculos/depreciacion";
import { sugerirCategoria } from "../catalogos/anexo2";

export interface CategoriaRef {
  id?: number;
  nombre: string;
  tasaAnual: number;
  aniosVida: number;
  palabrasClave: string[];
}

export interface FilaImportada {
  filaOrigen: number;
  ubicacion: string | null;
  tipoBien: string;
  marca: string | null;
  modelo: string | null;
  serie: string | null;
  placa: string | null;
  fechaAdquisicion: string | null; // YYYY-MM-DD
  fechaAproximada: boolean;
  costoEnArchivo: number | null; // tal como venía en la fila
  unidadesCompra: number | null; // si el costo de la fila cubría varias unidades
  costo: number | null; // costo unitario que se registra
  categoria: CategoriaRef | null;
  depreciacionAcumulada: number | null;
  valorLibros: number | null;
  pendientes: string[];
}

export interface ResultadoImportacion {
  filas: FilaImportada[];
  resumen: {
    articulosEnArchivo: number;
    activos: number;
    conPendientes: number;
    costoSumadoEnArchivo: number;
    costoRegistrado: number;
    depreciacionAcumulada: number;
    valorLibros: number;
  };
}

// --------------------------------------------------------------------------- utilidades de celdas
const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

function valorCelda(v: ExcelJS.CellValue): unknown {
  if (v && typeof v === "object" && !(v instanceof Date)) {
    if ("result" in v) return (v as any).result ?? null;
    if ("richText" in v) return (v as any).richText.map((t: any) => t.text).join("");
    if ("text" in v) return (v as any).text;
    return null;
  }
  return v;
}

const texto = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/\s+/g, " ").trim();
  return s === "" ? null : s;
};

export function parsearCosto(v: unknown): number | null {
  if (typeof v === "number") return v;
  const raw = texto(v);
  if (!raw) return null;
  let s = raw.replace(/[₡¢$]/g, "").replace(/\s/g, "");
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, "").replace(",", "."); // 1.002.998,5
  else if (/^\d{1,3}(\.\d{3})+\.\d{1,2}$/.test(s)) { const p = s.split("."); s = p.slice(0, -1).join("") + "." + p.at(-1); } // 1.002.998.5
  else if (/^\d{1,3}\.\d{3}$/.test(s)) s = s.replace(".", ""); // 4.778
  else s = s.replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export function parsearFecha(v: unknown): { fecha: string | null; aproximada: boolean } {
  if (v instanceof Date) return { fecha: iso(v.getUTCFullYear(), v.getUTCMonth() + 1, v.getUTCDate()), aproximada: false };
  if (typeof v === "number" && v > 20000 && v < 80000) { // número de serie de Excel
    const d = new Date(Date.UTC(1899, 11, 30) + v * 86400000);
    return { fecha: iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()), aproximada: false };
  }
  const s = texto(v);
  if (!s) return { fecha: null, aproximada: false };
  let m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/); // dd/mm/aaaa
  if (m) { const y = Number(m[3]) < 100 ? 2000 + Number(m[3]) : Number(m[3]); return { fecha: iso(y, Number(m[2]), Number(m[1])), aproximada: false }; }
  m = s.match(/^(\d{1,2})[/-](\d{2}|\d{4})$/); // mm/aa → día 1
  if (m) { const y = m[2].length === 2 ? 2000 + Number(m[2]) : Number(m[2]); return { fecha: iso(y, Number(m[1]), 1), aproximada: true }; }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return { fecha: iso(Number(m[1]), Number(m[2]), Number(m[3])), aproximada: false };
  return { fecha: null, aproximada: false };
}

/** "139 (4 unidades)", "067-069-068", "206207222262", "95 (compra total 4 laptops)", "#29" … */
export function parsearPlacas(v: unknown): { placas: string[]; unidadesDeclaradas: number | null; nota: string | null } {
  const s = texto(v);
  if (!s) return { placas: [], unidadesDeclaradas: null, nota: null };
  let unidades: number | null = null;
  const m = s.match(/compra total\s*(\d+)|\((\d+)\s*unidades\)|compra de (\d+)|(\d+)\s*c[aá]maras/i);
  if (m) {
    unidades = Number(m.slice(1).find(Boolean));
    if (/y un gabinete/i.test(s)) unidades += 1;
  }
  const cabeza = s.split(/[(*]|compra|fue|no tiene|falta|\d+\s*c[aá]maras/i)[0].replace(/#/g, "");
  const placas: string[] = [];
  for (const n of cabeza.match(/\d+/g) ?? []) {
    if (n.length > 3 && n.length % 3 === 0) for (let i = 0; i < n.length; i += 3) placas.push(n.slice(i, i + 3));
    else placas.push(n);
  }
  const norm = placas.map((p) => String(Number(p)).padStart(3, "0"));
  const nota = s.trim() !== cabeza.trim() ? s : null;
  return { placas: norm, unidadesDeclaradas: unidades, nota };
}

// --------------------------------------------------------------------------- columnas
type Campo = "tipo" | "marca" | "modelo" | "serie" | "ubicacion" | "placa" | "fecha" | "costo" | "depreciacion" | "valorLibros";
const ENCABEZADOS: [Campo, RegExp][] = [
  ["tipo", /^(tipo de bien|articulo|descripcion|bien|nombre del articulo)/],
  ["marca", /^marca/],
  ["modelo", /^modelo/],
  ["serie", /^(serie|numero de serie|no\.? de serie)/],
  ["ubicacion", /^(ubicacion|aula|lugar)/],
  ["placa", /^(placa|no\.? placa|numero de placa)/],
  ["fecha", /^fecha/],
  ["costo", /^(costo|precio|valor de adquisicion)/],
  ["depreciacion", /^depreciacion/],
  ["valorLibros", /^valor en libros/],
];

function detectarEncabezado(ws: ExcelJS.Worksheet) {
  for (let r = 1; r <= Math.min(40, ws.rowCount); r++) {
    const cols: Partial<Record<Campo, number>> = {};
    ws.getRow(r).eachCell((cell, col) => {
      const t = texto(valorCelda(cell.value));
      if (!t) return;
      const k = sinTildes(t);
      for (const [campo, re] of ENCABEZADOS) if (re.test(k) && cols[campo] === undefined) cols[campo] = col;
    });
    if (cols.tipo !== undefined && (cols.placa !== undefined || cols.costo !== undefined)) return { fila: r, cols };
  }
  return null;
}

// --------------------------------------------------------------------------- importación
export async function importarActivosExcel(
  archivo: ArrayBuffer | Buffer,
  opts: { categorias: CategoriaRef[]; corte: string; hoja?: string },
): Promise<ResultadoImportacion> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(archivo as any);
  const ws = opts.hoja ? wb.getWorksheet(opts.hoja) : wb.worksheets[0];
  if (!ws) throw new Error("No se encontró la hoja en el archivo");
  const enc = detectarEncabezado(ws);
  if (!enc) throw new Error('No se encontró la fila de encabezados (debe tener al menos "Tipo de bien" y "Placa" o "Costo")');
  const { cols } = enc;
  const get = (row: ExcelJS.Row, c?: number) => (c === undefined ? null : valorCelda(row.getCell(c).value));

  type Cruda = { fila: number; ubicacion: string | null; tipo: string; marca: string | null; modelo: string | null; serie: string | null; placaRaw: unknown; fechaRaw: unknown; costoRaw: unknown; depRaw: unknown };
  const crudas: Cruda[] = [];
  let seccion: string | null = null;

  for (let r = enc.fila + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const tipo = texto(get(row, cols.tipo));
    const resto = (Object.entries(cols) as [Campo, number][]).filter(([k]) => k !== "tipo").map(([, c]) => texto(get(row, c)));
    if (!tipo) continue;
    if (/^total\b/i.test(tipo) || /^=/.test(tipo)) continue;
    if (resto.every((x) => x === null)) { seccion = tipo; continue; } // título de sección = ubicación
    crudas.push({
      fila: r,
      ubicacion: texto(get(row, cols.ubicacion)) ?? seccion,
      tipo,
      marca: texto(get(row, cols.marca)),
      modelo: texto(get(row, cols.modelo)),
      serie: texto(get(row, cols.serie)),
      placaRaw: get(row, cols.placa),
      fechaRaw: get(row, cols.fecha),
      costoRaw: get(row, cols.costo),
      depRaw: get(row, cols.depreciacion),
    });
  }

  // --- primera pasada: normalizar
  const pre = crudas.map((c) => {
    const pendientes: string[] = [];
    const { placas, unidadesDeclaradas, nota } = parsearPlacas(c.placaRaw);
    const { fecha, aproximada } = parsearFecha(c.fechaRaw);
    let costo = parsearCosto(c.costoRaw);
    if (costo === null && fecha === null && parsearCosto(c.depRaw) !== null) {
      costo = parsearCosto(c.depRaw);
      pendientes.push("El costo venía en la columna de depreciación; se tomó como costo");
    }
    if (nota && /falta|no tiene/i.test(nota)) pendientes.push(`Nota en la placa: "${nota}"`);
    return { c, placas, unidadesDeclaradas, fecha, aproximada, costo, pendientes };
  });

  // compras que aparecen repetidas (misma fecha y mismo costo en varias filas)
  const grupos = new Map<string, typeof pre>();
  for (const p of pre) if (p.fecha && p.costo !== null) {
    const k = `${p.fecha}|${p.costo}`;
    grupos.set(k, [...(grupos.get(k) ?? []), p]);
  }

  const filas: FilaImportada[] = [];
  for (const p of pre) {
    const { c } = p;
    const qNombre = Number(c.tipo.match(/^\s*(\d+)\s+\D/)?.[1] ?? 0);
    let unidades: number | null = null;
    if (p.unidadesDeclaradas) unidades = p.unidadesDeclaradas;
    else if (qNombre > 1 && p.placas.length === qNombre) unidades = qNombre;
    else if (p.placas.length > 1) unidades = p.placas.length;
    const costoUnit = p.costo === null ? null : unidades ? Math.round((p.costo / unidades) * 100) / 100 : p.costo;
    if (unidades && p.costo !== null)
      p.pendientes.push(`Costo de compra grupal: ₡${fmt(p.costo)} ÷ ${unidades} unidades = ₡${fmt(costoUnit!)} cada una`);

    const g = p.fecha && p.costo !== null ? grupos.get(`${p.fecha}|${p.costo}`) : undefined;
    if (g && g.length > 1) {
      const otras = g.filter((x) => x !== p).map((x) => x.c.fila).join(", ");
      p.pendientes.push(unidades
        ? `El total de esta compra también está en las filas ${otras}; ya se dividió entre ${unidades}`
        : `Mismo costo y fecha en las filas ${otras}: confirmar si ₡${fmt(p.costo!)} es el precio de cada unidad o el total de la compra`);
    }
    if (!p.fecha) p.pendientes.push("Sin fecha de adquisición");
    else if (p.aproximada) p.pendientes.push("La fecha solo tenía mes y año; se usó el día 1");
    if (p.costo === null) p.pendientes.push("Sin costo de adquisición");

    const categoria = sugerirCategoria(c.tipo, opts.categorias);
    if (!categoria) p.pendientes.push("Sin categoría de depreciación: elegirla en la lista");

    for (const placa of p.placas.length ? p.placas : [null]) {
      let dep: number | null = null;
      let vl: number | null = null;
      if (costoUnit !== null && p.fecha && categoria) {
        const r = calcularDepreciacion({ costo: costoUnit, tasaAnual: categoria.tasaAnual, aniosVida: categoria.aniosVida, fechaAdquisicion: p.fecha }, opts.corte);
        dep = r.depreciacionAcumulada;
        vl = r.valorLibros;
      }
      filas.push({
        filaOrigen: c.fila, ubicacion: c.ubicacion, tipoBien: c.tipo, marca: c.marca, modelo: c.modelo,
        serie: c.serie && !/^no (indica|se lee)$/i.test(c.serie) ? c.serie : null,
        placa, fechaAdquisicion: p.fecha, fechaAproximada: p.aproximada, costoEnArchivo: p.costo,
        unidadesCompra: unidades, costo: costoUnit, categoria, depreciacionAcumulada: dep, valorLibros: vl,
        pendientes: [...(placa ? [] : ["Sin placa"]), ...p.pendientes],
      });
    }
  }

  // placas y series repetidas
  const porPlaca = new Map<string, FilaImportada[]>();
  const porSerie = new Map<string, FilaImportada[]>();
  for (const f of filas) {
    if (f.placa) porPlaca.set(f.placa, [...(porPlaca.get(f.placa) ?? []), f]);
    if (f.serie) porSerie.set(f.serie, [...(porSerie.get(f.serie) ?? []), f]);
  }
  for (const [placa, fs] of porPlaca) if (fs.length > 1)
    for (const f of fs) f.pendientes.unshift(`Placa ${placa} repetida: también en ${fs.filter((x) => x !== f).map((x) => `${x.tipoBien} (fila ${x.filaOrigen})`).join("; ")}`);
  for (const [serie, fs] of porSerie) {
    const filasDistintas = new Set(fs.map((x) => x.filaOrigen));
    if (filasDistintas.size > 1)
      for (const f of fs) f.pendientes.push(`Serie ${serie} repetida en las filas ${[...filasDistintas].filter((x) => x !== f.filaOrigen).join(", ")}`);
  }

  const suma = (xs: (number | null)[]) => Math.round(xs.reduce<number>((a, b) => a + (b ?? 0), 0) * 100) / 100;
  return {
    filas,
    resumen: {
      articulosEnArchivo: crudas.length,
      activos: filas.length,
      conPendientes: filas.filter((f) => f.pendientes.length).length,
      costoSumadoEnArchivo: suma(pre.map((p) => p.costo)),
      costoRegistrado: suma(filas.map((f) => f.costo)),
      depreciacionAcumulada: suma(filas.map((f) => f.depreciacionAcumulada)),
      valorLibros: suma(filas.map((f) => f.valorLibros)),
    },
  };
}

const fmt = (n: number) => n.toLocaleString("es-CR", { maximumFractionDigits: 2 });
