/**
 * Lee el XML de una factura electrónica de Costa Rica (Hacienda, versiones 4.3 y 4.4): factura, tiquete,
 * nota de crédito o débito. El otro XML que llega con la factura es el «MensajeHacienda» (la aceptación):
 * se reconoce y no trae líneas. Montos en colones (si viene en otra moneda se usa el tipo de cambio de la factura).
 */
import { XMLParser } from "fast-xml-parser";

export type LineaFactura = {
  detalle: string;
  cantidad: number;
  unidad: string;
  /** precio por unidad sin impuesto y con el descuento aplicado */
  precioUnitario: number;
  impuesto: number;
  totalLinea: number;
  cabys: string | null;
};

export type FacturaElectronica = {
  tipo: "factura" | "tiquete" | "nota_credito" | "nota_debito";
  clave: string | null;
  consecutivo: string | null;
  fecha: string | null; // YYYY-MM-DD (fecha de emisión tal como viene, hora de Costa Rica)
  emisor: { nombre: string; identificacion: string | null; nombreComercial: string | null };
  moneda: string;
  tipoCambio: number;
  lineas: LineaFactura[];
  subtotal: number;
  impuesto: number;
  total: number;
};

export type ResultadoXml = { tipo: "factura"; factura: FacturaElectronica } | { tipo: "mensaje_hacienda" } | { tipo: "desconocido" };

const RAICES = { FacturaElectronica: "factura", TiqueteElectronico: "tiquete", NotaCreditoElectronica: "nota_credito", NotaDebitoElectronica: "nota_debito" } as const;
const r2 = (n: number) => Math.round(n * 100) / 100;
const num = (v: unknown) => {
  const n = Number(typeof v === "object" && v !== null && "#text" in v ? (v as { "#text": unknown })["#text"] : v);
  return Number.isFinite(n) ? n : 0;
};
const txt = (v: unknown) => (v === undefined || v === null || v === "" ? null : String(typeof v === "object" && "#text" in (v as object) ? (v as { "#text": unknown })["#text"] : v).trim());
const lista = <T,>(v: T | T[] | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

export function leerFacturaElectronica(xml: string): ResultadoXml {
  const parser = new XMLParser({ ignoreAttributes: true, removeNSPrefix: true, parseTagValue: false, trimValues: true });
  let doc: Record<string, unknown>;
  try {
    doc = parser.parse(xml);
  } catch {
    return { tipo: "desconocido" };
  }
  if ("MensajeHacienda" in doc || "MensajeReceptor" in doc) return { tipo: "mensaje_hacienda" };
  const raiz = (Object.keys(RAICES) as (keyof typeof RAICES)[]).find((k) => k in doc);
  if (!raiz) return { tipo: "desconocido" };
  const f = doc[raiz] as any;

  const resumen = f.ResumenFactura ?? {};
  const moneda = txt(resumen.CodigoTipoMoneda?.CodigoMoneda) ?? "CRC";
  const tipoCambio = moneda === "CRC" ? 1 : num(resumen.CodigoTipoMoneda?.TipoCambio) || 1;
  const enColones = (n: number) => r2(n * tipoCambio);

  const lineas: LineaFactura[] = lista<any>(f.DetalleServicio?.LineaDetalle).map((l) => {
    const cantidad = num(l.Cantidad) || 1;
    const subTotal = l.SubTotal !== undefined ? num(l.SubTotal) : num(l.MontoTotal) - lista<{ MontoDescuento?: unknown }>(l.Descuento).reduce((s, d) => s + num(d.MontoDescuento), 0);
    const impuesto = lista<{ Monto?: unknown }>(l.Impuesto).reduce((s, i) => s + num(i.Monto), 0);
    return {
      detalle: txt(l.Detalle) ?? "Sin descripción",
      cantidad,
      unidad: txt(l.UnidadMedida) ?? "Unid",
      precioUnitario: enColones(subTotal / cantidad),
      impuesto: enColones(impuesto),
      totalLinea: enColones(num(l.MontoTotalLinea) || subTotal + impuesto),
      cabys: txt(l.CodigoCABYS) ?? txt(l.Codigo?.Codigo ?? l.Codigo),
    };
  });

  const fecha = txt(f.FechaEmision);
  return {
    tipo: "factura",
    factura: {
      tipo: RAICES[raiz],
      clave: txt(f.Clave),
      consecutivo: txt(f.NumeroConsecutivo),
      fecha: fecha ? fecha.slice(0, 10) : null,
      emisor: { nombre: txt(f.Emisor?.Nombre) ?? "Sin nombre", identificacion: txt(f.Emisor?.Identificacion?.Numero), nombreComercial: txt(f.Emisor?.NombreComercial) },
      moneda,
      tipoCambio,
      lineas,
      subtotal: enColones(num(resumen.TotalVentaNeta) || lineas.reduce((s, l) => s + l.precioUnitario * l.cantidad, 0) / tipoCambio),
      impuesto: enColones(num(resumen.TotalImpuesto)),
      total: enColones(num(resumen.TotalComprobante)),
    },
  };
}
