/**
 * "CONTROL MENSUAL DE INVENTARIO Y CONSUMO DE PRODUCTOS DE LIMPIEZA" (.docx), con la disposición de la plantilla
 * de la fundación: título, organización, periodo, fecha del pedido, proveedor, factura, encargada de limpieza,
 * tabla Producto | Saldo anterior | Cantidad recibida | Saldo final | Cantidad consumida, y al pie
 * «Autorizado por» y «Número de factura». Letra Century Gothic, A4 vertical, márgenes de 1,27 cm.
 */
import { AlignmentType, BorderStyle, Document, ImageRun, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import type { MovimientoInv, ProductoInv } from "./controlInventario";

/** Productos que trae la plantilla, en su orden; los demás de limpieza con movimiento van después. */
export const PRODUCTOS_PLANTILLA_LIMPIEZA = ["Crystal", "Germicida", "Jabón de manos", "Atomizador", "Toalla de manos", "Papel higiénico"];

export type FilaLimpieza = { producto: string; saldoAnterior: number; recibida: number; saldoFinal: number; consumida: number };

const r3 = (n: number) => Math.round(n * 1000) / 1000;
const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function filasLimpieza(productos: ProductoInv[], movs: MovimientoInv[], desde: string, hasta: string): FilaLimpieza[] {
  const filas = productos.map((p) => {
    const suyos = movs.filter((m) => m.producto_id === p.id);
    const saldoAnterior = r3(suyos.filter((m) => m.fecha < desde).reduce((s, m) => s + (m.tipo === "entrada" || m.tipo === "ajuste" ? m.cantidad : -m.cantidad), 0));
    const enPeriodo = suyos.filter((m) => m.fecha >= desde && m.fecha <= hasta);
    const recibida = r3(enPeriodo.filter((m) => m.tipo === "entrada" || m.tipo === "ajuste").reduce((s, m) => s + m.cantidad, 0));
    const consumida = r3(enPeriodo.filter((m) => m.tipo === "salida" || m.tipo === "merma").reduce((s, m) => s + m.cantidad, 0));
    return { producto: p.nombre, saldoAnterior, recibida, consumida, saldoFinal: r3(saldoAnterior + recibida - consumida) };
  });
  const orden = (n: string) => {
    const i = PRODUCTOS_PLANTILLA_LIMPIEZA.findIndex((x) => sinTildes(x) === sinTildes(n));
    return i === -1 ? 100 : i;
  };
  return filas
    .filter((f) => orden(f.producto) < 100 || f.saldoAnterior || f.recibida || f.consumida)
    .sort((a, b) => orden(a.producto) - orden(b.producto) || a.producto.localeCompare(b.producto, "es"));
}

const fechaCR = (f: string) => `${f.slice(8, 10)} / ${f.slice(5, 7)} / ${f.slice(0, 4)}`;
const num = (n: number) => n.toLocaleString("es-CR", { maximumFractionDigits: 3 });
const FUENTE = "Century Gothic";
const t = (text: string, extra: { bold?: boolean; size?: number } = {}) => new TextRun({ text, font: FUENTE, size: extra.size ?? 22, bold: extra.bold });
/** "Etiqueta:" en negrita y el valor normal, como en la plantilla. */
const campo = (etiqueta: string, valor: string, antes = 80) => p([t(`${etiqueta}: `, { bold: true }), t(valor)], { antes });
const p = (runs: TextRun[] | string, opts: { centro?: boolean; antes?: number } = {}) =>
  new Paragraph({ children: typeof runs === "string" ? [t(runs)] : runs, alignment: opts.centro ? AlignmentType.CENTER : AlignmentType.LEFT, spacing: { before: opts.antes ?? 80, after: 80 } });
const linea = "____________________________";

export async function generarControlLimpieza(opts: {
  desde: string;
  hasta: string;
  pedidos: { fecha: string; proveedor: string; factura: string }[];
  filas: FilaLimpieza[];
  logo?: Buffer;
  organizacion?: string;
}): Promise<Buffer> {
  const borde = { style: BorderStyle.SINGLE, size: 6, color: "000000" };
  const celda = (texto: string, negrita = false, izquierda = false) =>
    new TableCell({ children: [new Paragraph({ children: [t(texto, { bold: negrita })], alignment: izquierda ? AlignmentType.LEFT : AlignmentType.CENTER })], borders: { top: borde, bottom: borde, left: borde, right: borde } });
  const encabezados = ["Producto", "Saldo anterior", "Cantidad recibida", "Saldo final", "Cantidad consumida"];
  const tabla = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ tableHeader: true, children: encabezados.map((h) => celda(h, true)) }),
      ...opts.filas.map((f) => new TableRow({ children: [celda(f.producto, false, true), celda(num(f.saldoAnterior)), celda(num(f.recibida)), celda(num(f.saldoFinal)), celda(num(f.consumida))] })),
    ],
  });
  const ped = opts.pedidos;
  const facturas = ped.map((x) => x.factura).join(", ");
  const doc = new Document({
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
      children: [
        p([t("CONTROL MENSUAL DE INVENTARIO Y CONSUMO DE PRODUCTOS DE LIMPIEZA")], { centro: true }),
        p([t(opts.organizacion ?? "Fundación Creciendo Feliz")], { centro: true }),
        ...(opts.logo ? [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new ImageRun({ type: "png", data: opts.logo, transformation: { width: 68, height: 60 } })] })] : []),
        campo("Periodo", `del ${fechaCR(opts.desde)} al ${fechaCR(opts.hasta)}`, 160),
        campo("Fecha de recepción del pedido", ped.length ? ped.map((x) => fechaCR(x.fecha)).join(", ") : "_____ / _____ / ______"),
        campo("Proveedor", ped.length ? [...new Set(ped.map((x) => x.proveedor))].join(", ") : "________________________"),
        campo("Factura N.°", facturas || "________________________"),
        campo("Encargada de limpieza", linea),
        tabla,
        p(`Autorizado por: ${linea}________`, { antes: 480 }),
        p(`Número de factura:  ${facturas || linea}`),
      ],
    }],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}
