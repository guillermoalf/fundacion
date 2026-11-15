/**
 * Depreciación de activos — Anexo 2 del Reglamento de la Ley del Impuesto sobre la Renta (Costa Rica).
 * Debe dar exactamente lo mismo que la función SQL `depreciacion_acumulada` (ver migración 1).
 *
 * Convención (la misma que ya usaba la fundación en su Excel):
 *   - Se deprecia desde el MES SIGUIENTE a la compra (compra en marzo → primer mes = abril).
 *   - Prorrateo mensual: Costo × tasa anual × meses / 12, con tope en (costo − valor residual).
 */

export type MetodoDepreciacion = "linea_recta" | "suma_digitos";

export interface ActivoDepreciable {
  costo: number;
  valorResidual?: number;
  tasaAnual: number; // % anual línea recta (ej. 20)
  aniosVida: number; // años para suma de dígitos (ej. 5)
  metodo?: MetodoDepreciacion;
  fechaAdquisicion: Date | string;
  fechaBaja?: Date | string | null;
}

export interface ResultadoDepreciacion {
  mesesDepreciados: number;
  depreciacionAcumulada: number;
  valorLibros: number;
  totalmenteDepreciado: boolean;
}

// Redondeo a céntimos igual que numeric de Postgres (mitad hacia arriba). Se pasa por 15 dígitos
// significativos para quitar el error binario: 88193.715 se guarda como 88193.71499999… y sin
// esto redondearía a .71, mientras la base (depreciacion_acumulada) da .72.
const r2 = (n: number) => Math.round(Number((n * 100).toPrecision(15))) / 100;

/** Interpreta "YYYY-MM-DD" como fecha local (evita el corrimiento de zona horaria de `new Date(string)`). */
export function aFecha(f: Date | string): Date {
  if (f instanceof Date) return f;
  const [y, m, d] = f.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function mesesDepreciados(fechaAdquisicion: Date | string, corte: Date | string): number {
  const a = aFecha(fechaAdquisicion);
  const c = aFecha(corte);
  return Math.max(0, (c.getFullYear() - a.getFullYear()) * 12 + (c.getMonth() - a.getMonth()));
}

export function calcularDepreciacion(activo: ActivoDepreciable, corte: Date | string): ResultadoDepreciacion {
  const residual = activo.valorResidual ?? 0;
  const base = activo.costo - residual;
  let corteEfectivo = aFecha(corte);
  if (activo.fechaBaja && aFecha(activo.fechaBaja) < corteEfectivo) corteEfectivo = aFecha(activo.fechaBaja);

  const meses = mesesDepreciados(activo.fechaAdquisicion, corteEfectivo);
  let dep = 0;

  if (base > 0 && meses > 0) {
    if ((activo.metodo ?? "linea_recta") === "linea_recta") {
      dep = Math.min(base, (base * activo.tasaAnual) / 100 * meses / 12);
    } else {
      const n = activo.aniosVida;
      const suma = (n * (n + 1)) / 2;
      let restantes = meses;
      for (let anio = 1; anio <= n && restantes > 0; anio++) {
        const m = Math.min(12, restantes);
        dep += ((base * (n - anio + 1)) / suma) * (m / 12);
        restantes -= m;
      }
      dep = Math.min(base, dep);
    }
  }
  dep = r2(dep);
  return {
    mesesDepreciados: meses,
    depreciacionAcumulada: dep,
    valorLibros: r2(activo.costo - dep),
    totalmenteDepreciado: base > 0 && dep >= r2(base),
  };
}

/** Tabla año por año, útil para mostrar en la ficha del activo. */
export function calendarioDepreciacion(activo: ActivoDepreciable) {
  const inicio = aFecha(activo.fechaAdquisicion);
  const filas: { anio: number; depreciacionAnio: number; acumulada: number; valorLibros: number }[] = [];
  let previa = 0;
  for (let y = inicio.getFullYear(); ; y++) {
    const r = calcularDepreciacion(activo, new Date(y, 11, 31));
    filas.push({ anio: y, depreciacionAnio: r2(r.depreciacionAcumulada - previa), acumulada: r.depreciacionAcumulada, valorLibros: r.valorLibros });
    previa = r.depreciacionAcumulada;
    if (r.totalmenteDepreciado || y - inicio.getFullYear() > 60) break;
  }
  return filas;
}
