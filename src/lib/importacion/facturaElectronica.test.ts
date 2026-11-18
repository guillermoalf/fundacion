import { describe, expect, it } from "vitest";
import { leerFacturaElectronica } from "./facturaElectronica";

const FACTURA = `<?xml version="1.0" encoding="utf-8"?>
<FacturaElectronica xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/facturaElectronica">
  <Clave>50618112600310112345600100001010000000123100000001</Clave>
  <NumeroConsecutivo>00100001010000000123</NumeroConsecutivo>
  <FechaEmision>2026-11-18T09:15:00-06:00</FechaEmision>
  <Emisor><Nombre>PRICESMART DE COSTA RICA S.A.</Nombre><Identificacion><Tipo>02</Tipo><Numero>3101123456</Numero></Identificacion></Emisor>
  <DetalleServicio>
    <LineaDetalle><NumeroLinea>1</NumeroLinea><CodigoCABYS>4521000000100</CodigoCABYS><Cantidad>1.000</Cantidad><UnidadMedida>Unid</UnidadMedida>
      <Detalle>TELEVISOR 55 PULGADAS</Detalle><PrecioUnitario>300000.00000</PrecioUnitario><MontoTotal>300000.00000</MontoTotal>
      <Descuento><MontoDescuento>10000.00000</MontoDescuento></Descuento><SubTotal>290000.00000</SubTotal>
      <Impuesto><Codigo>01</Codigo><Tarifa>13.00</Tarifa><Monto>37700.00000</Monto></Impuesto><MontoTotalLinea>327700.00000</MontoTotalLinea></LineaDetalle>
    <LineaDetalle><NumeroLinea>2</NumeroLinea><Cantidad>6.000</Cantidad><UnidadMedida>kg</UnidadMedida><Detalle>ARROZ 99% GRANO ENTERO</Detalle>
      <PrecioUnitario>1250.00000</PrecioUnitario><MontoTotal>7500.00000</MontoTotal><SubTotal>7500.00000</SubTotal>
      <Impuesto><Codigo>01</Codigo><Tarifa>1.00</Tarifa><Monto>75.00000</Monto></Impuesto><MontoTotalLinea>7575.00000</MontoTotalLinea></LineaDetalle>
  </DetalleServicio>
  <ResumenFactura><CodigoTipoMoneda><CodigoMoneda>CRC</CodigoMoneda><TipoCambio>1</TipoCambio></CodigoTipoMoneda>
    <TotalVentaNeta>297500.00000</TotalVentaNeta><TotalImpuesto>37775.00000</TotalImpuesto><TotalComprobante>335275.00000</TotalComprobante></ResumenFactura>
</FacturaElectronica>`;

describe("factura electrónica (XML de Hacienda)", () => {
  it("lee emisor, número, fecha, líneas y totales", () => {
    const r = leerFacturaElectronica(FACTURA);
    expect(r.tipo).toBe("factura");
    if (r.tipo !== "factura") return;
    const f = r.factura;
    expect(f.emisor).toMatchObject({ nombre: "PRICESMART DE COSTA RICA S.A.", identificacion: "3101123456" });
    expect(f.consecutivo).toBe("00100001010000000123");
    expect(f.fecha).toBe("2026-11-18");
    expect(f.lineas).toHaveLength(2);
    expect(f.lineas[0]).toMatchObject({ detalle: "TELEVISOR 55 PULGADAS", cantidad: 1, precioUnitario: 290000, impuesto: 37700, cabys: "4521000000100" });
    expect(f.lineas[1]).toMatchObject({ cantidad: 6, unidad: "kg", precioUnitario: 1250 });
    expect([f.subtotal, f.impuesto, f.total]).toEqual([297500, 37775, 335275]);
  });
  it("convierte a colones si la factura viene en dólares", () => {
    const usd = FACTURA.replace("<CodigoMoneda>CRC</CodigoMoneda><TipoCambio>1</TipoCambio>", "<CodigoMoneda>USD</CodigoMoneda><TipoCambio>500</TipoCambio>");
    const r = leerFacturaElectronica(usd);
    if (r.tipo !== "factura") throw new Error("no leyó");
    expect(r.factura.lineas[1].precioUnitario).toBe(625000);
    expect(r.factura.total).toBe(167637500);
  });
  it("reconoce el mensaje de Hacienda y lo que no es factura", () => {
    expect(leerFacturaElectronica("<MensajeHacienda><Clave>1</Clave></MensajeHacienda>").tipo).toBe("mensaje_hacienda");
    expect(leerFacturaElectronica("<otra/>").tipo).toBe("desconocido");
    expect(leerFacturaElectronica("no es xml <<").tipo).toBe("desconocido");
  });
});
