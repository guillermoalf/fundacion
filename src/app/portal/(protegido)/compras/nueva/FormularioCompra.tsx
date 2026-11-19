"use client";

import { useActionState, useMemo, useState } from "react";
import { AreaTexto, BotonEnviar, Campo, CampoArchivos, FormularioAccion, MensajeError, Seleccion, type ArchivoSubido } from "../../../_ui/Formulario";
import { estiloBoton, estiloEtiqueta, estiloInput } from "../../../_ui/estilos";
import { colones } from "@/lib/portal/formato";
import { leerFacturaXml, registrarCompra, type LineaCompra } from "../acciones";
import { sugerirCategoriaProducto } from "../../inventario/datos";

type Opcion = { valor: number | string; texto: string };
type Producto = { id: number; nombre: string; unidad: string };
type Linea = LineaCompra & { nuevo_nombre?: string; nuevo_unidad?: string };


const nueva = (): Linea => ({ tipo: "consumible", descripcion: "", cantidad: "1", unidad: "unidad", precio: "" });
const aNumero = (s: string) => {
  const t = (s ?? "").trim();
  const n = Number(/,\d{1,3}$/.test(t) ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

function LineaFormulario({ l, i, cambiar, quitar, productos, ubicaciones, categorias, categoriasProducto, umbral }: {
  l: Linea; i: number; cambiar: (c: Partial<Linea>) => void; quitar?: () => void;
  productos: Producto[]; ubicaciones: Opcion[]; categorias: Opcion[]; categoriasProducto: Opcion[]; umbral: number | null;
}) {
  const id = (k: string) => `l${i}-${k}`;
  const campo = (k: keyof Linea, etiqueta: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="space-y-1.5" htmlFor={id(k)}>
      <span className={estiloEtiqueta}>{etiqueta}</span>
      <input id={id(k)} className={estiloInput} value={(l[k] as string) ?? ""} onChange={(e) => cambiar({ [k]: e.target.value })} {...extra} />
    </label>
  );
  const sel = (k: keyof Linea, etiqueta: string, ops: Opcion[], vacio: string) => (
    <label className="space-y-1.5" htmlFor={id(k)}>
      <span className={estiloEtiqueta}>{etiqueta}</span>
      <select id={id(k)} className={estiloInput} value={(l[k] as string) ?? ""} onChange={(e) => cambiar({ [k]: e.target.value })}>
        <option value="">{vacio}</option>
        {ops.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
      </select>
    </label>
  );
  const precio = aNumero(l.precio);
  const bajaCuantia = l.tipo === "activo" && umbral !== null && l.precio !== "" && precio <= umbral;
  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">Línea {i + 1}{l.descripcion ? `: ${l.descripcion}` : ""}</p>
        {quitar && <button type="button" onClick={quitar} className="text-base font-medium text-red-700 hover:underline">Quitar</button>}
      </div>
      <div role="radiogroup" aria-label="Tipo de línea" className="flex flex-wrap gap-2">
        {([["consumible", "Inventario (comida, limpieza, útiles, baja cuantía)"], ["activo", "Activo (equipo, mueble)"], ["servicio", "Servicio (solo gasto)"]] as const).map(([v, t]) => (
          <button key={v} type="button" role="radio" aria-checked={l.tipo === v} onClick={() => cambiar({ tipo: v })}
            className={`rounded-xl border px-3 py-2 text-base font-medium ${l.tipo === v ? "border-sky-500 bg-sky-100 text-sky-900" : "border-slate-300 bg-white"}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="sm:col-span-2">{campo("descripcion", l.tipo === "activo" ? "Qué es (tipo de bien)" : "Descripción")}</div>
        {campo("cantidad", "Cantidad", { inputMode: "decimal" })}
        {campo("unidad", "Unidad")}
        {campo("precio", "Precio por unidad sin IVA (₡)", { inputMode: "decimal" })}
        <div className="flex items-end pb-3 text-base text-slate-600 sm:col-span-3">
          Total de la línea: <strong className="ml-1">{colones(aNumero(l.cantidad) * precio)}</strong>
        </div>

        {l.tipo === "consumible" && (
          <>
            <label className="space-y-1.5 sm:col-span-2" htmlFor={id("producto")}>
              <span className={estiloEtiqueta}>Producto del inventario</span>
              <select id={id("producto")} className={estiloInput} value={l.producto_id ?? ""}
                onChange={(e) => {
                  const p = productos.find((x) => String(x.id) === e.target.value);
                  cambiar({ producto_id: e.target.value, ...(p ? { unidad: p.unidad } : {}), ...(e.target.value === "nuevo" ? {
                    nuevo_nombre: l.nuevo_nombre ?? l.descripcion, nuevo_unidad: l.nuevo_unidad ?? l.unidad,
                    nuevo_categoria: l.nuevo_categoria || sugerirCategoriaProducto(`${l.nuevo_nombre ?? ""} ${l.descripcion}`, categoriasProducto.map((c) => String(c.valor))) || "",
                  } : {}) });
                }}>
                <option value="">Elija…</option>
                <option value="nuevo">+ Producto nuevo</option>
                {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre} ({p.unidad})</option>)}
              </select>
            </label>
            {campo("vencimiento", "Vence (si aplica)", { type: "date" })}
            {l.producto_id === "nuevo" && (
              <div className="grid gap-3 rounded-xl bg-white p-3 sm:col-span-4 sm:grid-cols-3">
                {campo("nuevo_nombre", "Nombre del producto nuevo")}
                {campo("nuevo_unidad", "Unidad (kg, litro, paquete…)")}
                <div className={l.nuevo_categoria ? "" : "rounded-xl ring-2 ring-amber-400 ring-offset-2"}>
                  {sel("nuevo_categoria", "Categoría en el inventario", categoriasProducto, "Elija una…")}
                </div>
                {!l.nuevo_categoria && (
                  <p className="text-sm font-medium text-amber-800 sm:col-span-3">
                    Falta elegir la categoría (arriba a la derecha): dice en cuál control de inventario sale este producto, por ejemplo «Material didáctico».
                  </p>
                )}
              </div>
            )}
          </>
        )}
        {l.tipo === "activo" && (
          <>
            {sel("ubicacion_id", "¿Dónde va a estar?", ubicaciones, "Todavía no se sabe")}
            {sel("categoria_id", "Fila del Anexo 2", categorias, "Sin definir")}
            <div className="sm:col-span-2">{campo("placas", "Placas (separadas por coma)", { placeholder: "Ej.: 120, 121, 122" })}</div>
            {bajaCuantia ? (
              <div className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-900 sm:col-span-4">
                <p>Cada unidad cuesta {colones(precio)} y no supera {colones(umbral)} (25 % de un salario base): para el PANI es de <strong>baja cuantía</strong> y va al inventario, no a activos.</p>
                <div className="flex flex-wrap gap-3">
                  <button type="button" className={estiloBoton.secundario} onClick={() => cambiar({ tipo: "consumible" })}>Pasarla a Inventario</button>
                  <label className="flex items-center gap-2"><input type="checkbox" className="h-5 w-5" checked={!!l.es_activo_igual} onChange={(e) => cambiar({ es_activo_igual: e.target.checked })} /> Es activo igual (excepción)</label>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500 sm:col-span-4">Se crea una ficha por unidad, con esta factura y sus archivos. Las placas que falten quedan en Pendientes.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function FormularioCompra({ proveedores, fuentes, productos, ubicaciones, categorias, categoriasProducto, hoy, umbral }: {
  proveedores: Opcion[]; fuentes: Opcion[]; productos: Producto[]; ubicaciones: Opcion[]; categorias: Opcion[]; categoriasProducto: Opcion[]; hoy: string; umbral: number | null;
}) {
  const [estado, accion, pendiente] = useActionState(registrarCompra, null);
  const [lineas, setLineas] = useState<Linea[]>([nueva()]);
  const [proveedorId, setProveedorId] = useState("");
  const [proveedorNuevo, setProveedorNuevo] = useState<{ nombre: string; cedula: string | null } | null>(null);
  const [numero, setNumero] = useState("");
  const [fecha, setFecha] = useState(hoy);
  const [iva, setIva] = useState("0");
  const [totalFactura, setTotalFactura] = useState<number | null>(null);
  const [avisoXml, setAvisoXml] = useState<string | null>(null);
  const subtotal = useMemo(() => lineas.reduce((s, l) => s + Math.round(aNumero(l.cantidad) * aNumero(l.precio) * 100) / 100, 0), [lineas]);

  async function alSubir(a: ArchivoSubido) {
    if (!a.tipo.includes("xml")) return;
    const r = await leerFacturaXml(a.id);
    if (!r?.ok) { setAvisoXml(r?.error ?? "No se pudo leer el XML."); return; }
    if (!r.esFactura || !r.factura) return; // el XML de respuesta de Hacienda: se guarda, pero no trae datos
    const f = r.factura;
    if (r.proveedorId) { setProveedorId(String(r.proveedorId)); setProveedorNuevo(null); }
    else { setProveedorId(""); setProveedorNuevo({ nombre: f.emisor.nombreComercial ?? f.emisor.nombre, cedula: f.emisor.identificacion }); }
    setNumero(f.consecutivo ?? "");
    if (f.fecha) setFecha(f.fecha);
    setIva(String(f.impuesto));
    setTotalFactura(f.total);
    const u = r.umbral ?? umbral;
    setLineas(f.lineas.map((l, i) => {
      const prod = r.productos?.find((p) => p.linea === i)?.productoId;
      const esActivo = u !== null && l.precioUnitario > u;
      return {
        tipo: esActivo ? "activo" : "consumible", descripcion: l.detalle, cantidad: String(l.cantidad), unidad: l.unidad, precio: String(l.precioUnitario),
        ...(esActivo ? {} : prod ? { producto_id: String(prod) } : { producto_id: "nuevo", nuevo_nombre: l.detalle, nuevo_unidad: l.unidad, nuevo_categoria: sugerirCategoriaProducto(l.detalle, categoriasProducto.map((c) => String(c.valor))) ?? "" }),
      };
    }));
    setAvisoXml(`Se leyó la factura ${f.consecutivo ?? ""} de ${f.emisor.nombre}${f.moneda !== "CRC" ? ` (en ${f.moneda}, convertida a colones con el tipo de cambio ${f.tipoCambio})` : ""}: revise cada línea y márquela como inventario, activo o servicio.`);
  }

  return (
    <FormularioAccion accion={accion} estado={estado} pendiente={pendiente} reiniciar={false} className="space-y-6"
      borrador={{ nombre: "compra", titulo: "Compra", volverA: "/portal/compras", alRestaurar: (d) => {
        try { const ls = JSON.parse(d.lineas ?? ""); if (Array.isArray(ls) && ls.length) setLineas(ls); } catch { /* borrador viejo */ }
        if (d.proveedor_nuevo) setProveedorNuevo({ nombre: d.proveedor_nuevo, cedula: d.proveedor_cedula || null });
        else setProveedorId(d.proveedor_id ?? "");
        setNumero(d.numero_factura ?? "");
        if (d.fecha) setFecha(d.fecha);
        setIva(d.iva ?? "0");
        if (d.total_factura) setTotalFactura(Number(d.total_factura));
        if (d.aviso_xml) setAvisoXml(d.aviso_xml);
      } }}>
      <fieldset className="space-y-3 rounded-2xl border-2 border-dashed border-sky-300 bg-sky-50 p-4">
        <legend className="px-1 text-lg font-semibold">Archivos de la factura</legend>
        <CampoArchivos etiqueta="PDF y los 2 XML de la factura electrónica (o una foto)" name="archivos" alSubir={alSubir}
          ayuda="Si sube el XML de la factura, el proveedor, el número, la fecha y las líneas se llenan solos." />
        {avisoXml && <p role="status" className="rounded-xl bg-white px-3 py-2 text-base text-sky-900">{avisoXml}</p>}
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-lg font-semibold">Factura</legend>
        {proveedorNuevo ? (
          <div className="space-y-1.5">
            <span className={estiloEtiqueta}>Proveedor</span>
            <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-base">Nuevo: <strong>{proveedorNuevo.nombre}</strong>{proveedorNuevo.cedula ? ` (${proveedorNuevo.cedula})` : ""}. Se agrega a Proveedores al guardar.</p>
            <input type="hidden" name="proveedor_nuevo" value={proveedorNuevo.nombre} />
            <input type="hidden" name="proveedor_cedula" value={proveedorNuevo.cedula ?? ""} />
            <button type="button" className="text-sm text-sky-700 underline" onClick={() => setProveedorNuevo(null)}>Elegir uno de la lista</button>
          </div>
        ) : (
          <Seleccion etiqueta="Proveedor" name="proveedor_id" opciones={proveedores} vacio="Elija…" required value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} />
        )}
        <Seleccion etiqueta="Pagado con fondos de" name="fuente_id" opciones={fuentes} vacio="Elija…" required />
        <Campo etiqueta="Número de factura" name="numero_factura" required value={numero} onChange={(e) => setNumero(e.target.value)} />
        <Campo etiqueta="Fecha de la factura" name="fecha" type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} />
        <AreaTexto etiqueta="Observaciones" name="observaciones" className="sm:col-span-2" />
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 text-lg font-semibold">Qué se compró</legend>
        <p className="text-slate-600">Una factura puede mezclar cosas (comida y una computadora, por ejemplo): marque cada línea como lo que es. Todo queda ligado a esta misma factura.</p>
        {lineas.map((l, i) => (
          <LineaFormulario key={i} l={l} i={i} productos={productos} ubicaciones={ubicaciones} categorias={categorias} categoriasProducto={categoriasProducto} umbral={umbral}
            cambiar={(c) => setLineas((ls) => ls.map((x, j) => (j === i ? { ...x, ...c } : x)))}
            quitar={lineas.length > 1 ? () => setLineas((ls) => ls.filter((_, j) => j !== i)) : undefined} />
        ))}
        <button type="button" onClick={() => setLineas((ls) => [...ls, nueva()])} className={estiloBoton.secundario}>+ Agregar otra línea</button>
      </fieldset>

      <div className="grid gap-3 rounded-2xl bg-white p-4 sm:grid-cols-3 sm:items-end">
        <p className="text-base">Subtotal: <strong>{colones(subtotal)}</strong></p>
        <label className="space-y-1.5" htmlFor="iva">
          <span className={estiloEtiqueta}>IVA (₡)</span>
          <input id="iva" name="iva" inputMode="decimal" value={iva} onChange={(e) => setIva(e.target.value)} className={estiloInput} />
        </label>
        <div>
          <p className="text-xl">Total: <strong>{colones(subtotal + aNumero(iva))}</strong></p>
          {totalFactura !== null && Math.abs(totalFactura - (subtotal + aNumero(iva))) > 1 && (
            <p className="text-sm text-amber-800">La factura dice {colones(totalFactura)}: revise si falta o sobra alguna línea.</p>
          )}
        </div>
      </div>
      <input type="hidden" name="lineas" value={JSON.stringify(lineas)} />
      {/* Solo para el borrador: lo que dijo la factura electrónica. */}
      <input type="hidden" name="total_factura" value={totalFactura ?? ""} />
      <input type="hidden" name="aviso_xml" value={avisoXml ?? ""} />
      <MensajeError estado={estado} />
      <BotonEnviar pendiente="Guardando la compra…">Registrar compra</BotonEnviar>
    </FormularioAccion>
  );
}
