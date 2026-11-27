import { conUsuario } from "@/lib/db";
import { obtenerUsuario } from "@/lib/portal/sesion";
import { XLSX_MIME } from "@/lib/export/auxiliarPani";
import { generarReporteActivos } from "@/lib/export/reporteActivos";
import { generarReporteTabla } from "@/lib/export/reporteTabla";
import { armarReporte, comprasParaReporte, inventarioParaReporte, periodo } from "@/lib/portal/reportes";
import { fecha } from "@/lib/portal/formato";
import { ESTADOS_ACTIVO } from "@/lib/portal/catalogos";
import { conteoActivos, ESTADOS_CONTEO, normalizarConfig, tipoReporte } from "@/lib/reportes/activos";
import { agruparCompras, filtrarCompras, resumenInventario, sumar } from "@/lib/reportes/inventario";

const nombreArchivo = (nombre: string, sufijo: string) => `${nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w-]+/g, "_")}_${sufijo}.xlsx`;

/** Exporta un reporte (activos, compras o inventario). Ruta sin punto y con revisión de sesión; el RLS decide qué se ve. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const usuario = await obtenerUsuario();
  if (!usuario) return new Response("Inicie sesión para exportar el reporte.", { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Reporte no encontrado.", { status: 404 });
  const sp = new URL(req.url).searchParams;

  const resultado = await conUsuario(usuario.id, async (tx) => {
    const r = await tx.selectFrom("reportes").select(["nombre", "tipo", "config"]).where("id", "=", id).executeTakeFirst();
    if (!r) return null;
    const tipo = tipoReporte(r.tipo);
    const c = normalizarConfig(r.config);
    const p = periodo(tipo, { corte: sp.get("corte"), desde: sp.get("desde"), hasta: sp.get("hasta") });
    const rango = `Del ${fecha(p.desde)} al ${fecha(p.hasta)}`;

    if (tipo === "compras") {
      const grupos = agruparCompras(filtrarCompras(await comprasParaReporte(tx, p.desde, p.hasta), c, p.desde, p.hasta), c.agruparCompras);
      const buf = await generarReporteTabla({
        hoja: "Compras", titulo: r.nombre, subtitulo: rango,
        columnas: [{ titulo: "Fecha", ancho: 12, tipo: "fecha" }, { titulo: "Factura", ancho: 18 }, { titulo: "Proveedor", ancho: 28 }, { titulo: "Producto", ancho: 36 },
          { titulo: "Categoría", ancho: 20 }, { titulo: "Cantidad", ancho: 10, tipo: "numero" }, { titulo: "Unidad", ancho: 10 }, { titulo: "Precio con IVA", ancho: 16, tipo: "moneda" },
          { titulo: "Total con IVA", ancho: 16, tipo: "moneda" }, { titulo: "Fondo", ancho: 10 }],
        secciones: grupos.map((g) => ({
          titulo: g.titulo,
          filas: g.items.map((l) => [l.fecha, l.factura, l.proveedor, l.producto ?? l.descripcion, l.categoriaNombre, l.cantidad, l.unidad, l.precioConIva, l.total, l.fuente]),
          subtotal: g.titulo === null ? undefined : [null, null, null, `Subtotal ${g.titulo}`, null, null, null, null, g.total, null],
        })),
        total: [null, null, null, "TOTAL", null, null, null, null, sumar(grupos.map((g) => g.total)), null],
      });
      return { buf, archivo: nombreArchivo(r.nombre, `${p.desde}_${p.hasta}`) };
    }

    if (tipo === "inventario") {
      const inv = await inventarioParaReporte(tx, p.hasta);
      const filas = resumenInventario(inv.productos, inv.movs, c, p.desde, p.hasta);
      const buf = await generarReporteTabla({
        hoja: "Inventario", titulo: r.nombre, subtitulo: rango,
        columnas: [{ titulo: "Producto", ancho: 36 }, { titulo: "Categoría", ancho: 22 }, { titulo: "Unidad", ancho: 10 }, { titulo: "Saldo inicial", ancho: 14, tipo: "numero" },
          { titulo: "Entradas", ancho: 12, tipo: "numero" }, { titulo: "Salidas", ancho: 12, tipo: "numero" }, { titulo: "Ajustes", ancho: 12, tipo: "numero" }, { titulo: "Saldo final", ancho: 14, tipo: "numero" }],
        secciones: [{ titulo: null, filas: filas.map((f) => [f.nombre, f.categoriaNombre, f.unidad, f.inicial, f.entradas, f.salidas, f.ajustes, f.final]) }],
      });
      return { buf, archivo: nombreArchivo(r.nombre, `${p.desde}_${p.hasta}`) };
    }

    const a = await armarReporte(tx, c, p.corte);
    if (c.formato === "conteo") {
      const conteo = conteoActivos(a.filas, p.corte);
      const estados = ESTADOS_CONTEO.map((e) => ESTADOS_ACTIVO[e]);
      const buf = await generarReporteTabla({
        hoja: "Conteo", titulo: r.nombre, subtitulo: `Al ${fecha(p.corte)}${c.buscar ? ` · activos con «${c.buscar}»` : ""}`,
        columnas: [{ titulo: "Aula o ubicación", ancho: 36 }, { titulo: "Total", ancho: 10, tipo: "numero" }, ...estados.map((t) => ({ titulo: t, ancho: 16, tipo: "numero" as const }))],
        secciones: [
          { titulo: "Resumen por aula", filas: conteo.porUbicacion.map((u) => [u.ubicacion, u.total, ...ESTADOS_CONTEO.map((e) => u.porEstado[e] || null)]) },
          { titulo: "Detalle", filas: a.filas.map((x) => [`${x.ubicacion ?? "Sin ubicación"} · ${x.tipoBien}${x.placa ? ` (placa ${x.placa})` : ""}`, 1, ...ESTADOS_CONTEO.map((e) => (x.estado === e ? 1 : null))]) },
        ],
        total: ["TOTAL", conteo.total, ...ESTADOS_CONTEO.map((e) => conteo.porEstado[e] || null)],
      });
      return { buf, archivo: nombreArchivo(r.nombre, p.corte) };
    }
    const buf = await generarReporteActivos(
      a.grupos.map((g) => ({ titulo: g.titulo, items: g.items.map((x) => ({ tipoBien: x.tipoBien, marca: x.marca, modelo: x.modelo, serie: x.serie, placa: x.placa, fechaAdquisicion: x.fechaAdquisicion, costo: x.costo, depreciacion: x.depreciacion })) })),
      { titulo: c.titulo, programa: c.programa, corte: p.corte },
    );
    return { buf, archivo: nombreArchivo(r.nombre, p.corte) };
  });
  if (!resultado) return new Response("Reporte no encontrado o sin permiso.", { status: 404 });
  return new Response(new Uint8Array(resultado.buf), {
    headers: { "Content-Type": XLSX_MIME, "Content-Disposition": `attachment; filename="${resultado.archivo}"`, "Cache-Control": "no-store" },
  });
}
