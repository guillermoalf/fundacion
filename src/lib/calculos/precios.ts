/**
 * Precios de compra con IVA. Montos en colones con 2 decimales.
 * Mismo reparto que la migración 20261119000004 (relleno de compras viejas).
 */
const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Reparte el IVA de una factura entre sus líneas en proporción a su monto. Lo que sobra o falta por redondeo
 * va a la línea más grande, para que la suma dé exacto el IVA de la factura.
 */
export function prorratearIva(montos: number[], ivaTotal: number): number[] {
  const suma = montos.reduce((s, m) => s + m, 0);
  if (!montos.length) return [];
  if (suma <= 0) return montos.map(() => 0);
  const partes = montos.map((m) => r2((ivaTotal * m) / suma));
  const resto = r2(ivaTotal - partes.reduce((s, p) => s + p, 0));
  let mayor = 0;
  montos.forEach((m, i) => { if (m > montos[mayor]) mayor = i; });
  partes[mayor] = r2(partes[mayor] + resto);
  return partes;
}

/**
 * IVA de cada línea: el de la factura electrónica si viene en todas las líneas y suma el IVA total (±₡1);
 * si no, el reparto proporcional.
 */
export function ivaPorLinea(lineas: { monto: number; iva?: number | null }[], ivaTotal: number): number[] {
  const conXml = lineas.every((l) => typeof l.iva === "number" && Number.isFinite(l.iva) && l.iva >= 0);
  if (conXml && Math.abs(lineas.reduce((s, l) => s + (l.iva as number), 0) - ivaTotal) <= 1) return lineas.map((l) => r2(l.iva as number));
  return prorratearIva(lineas.map((l) => l.monto), ivaTotal);
}

/** Variación porcentual de un precio respecto al anterior (1 decimal). null si no hay anterior. */
export function variacion(actual: number | null, anterior: number | null): number | null {
  if (actual === null || anterior === null || anterior === 0) return null;
  return Math.round(((actual - anterior) / anterior) * 1000) / 10;
}
