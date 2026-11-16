"use client";

import { useActionState, useMemo, useState } from "react";
import { AreaTexto, BotonEnviar, Campo, CampoArchivo, MensajeError, Seleccion } from "../../../_ui/Formulario";
import { estiloBoton, estiloEtiqueta, estiloInput } from "../../../_ui/estilos";
import { colones } from "@/lib/portal/formato";
import { registrarCompra, type LineaCompra } from "../acciones";

type Opcion = { valor: number | string; texto: string };
type Producto = { id: number; nombre: string; unidad: string };

const nueva = (): LineaCompra => ({ tipo: "consumible", descripcion: "", cantidad: "1", unidad: "unidad", precio: "" });
const aNumero = (s: string) => {
  const t = s.trim();
  const n = Number(/,\d{1,3}$/.test(t) ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

function Linea({ l, i, cambiar, quitar, productos, ubicaciones, categorias }: {
  l: LineaCompra; i: number; cambiar: (c: Partial<LineaCompra>) => void; quitar?: () => void;
  productos: Producto[]; ubicaciones: Opcion[]; categorias: Opcion[];
}) {
  const id = (k: string) => `l${i}-${k}`;
  const campo = (k: keyof LineaCompra, etiqueta: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="space-y-1.5" htmlFor={id(k)}>
      <span className={estiloEtiqueta}>{etiqueta}</span>
      <input id={id(k)} className={estiloInput} value={(l[k] as string) ?? ""} onChange={(e) => cambiar({ [k]: e.target.value })} {...extra} />
    </label>
  );
  const sel = (k: keyof LineaCompra, etiqueta: string, ops: Opcion[], vacio: string) => (
    <label className="space-y-1.5" htmlFor={id(k)}>
      <span className={estiloEtiqueta}>{etiqueta}</span>
      <select id={id(k)} className={estiloInput} value={(l[k] as string) ?? ""} onChange={(e) => cambiar({ [k]: e.target.value })}>
        <option value="">{vacio}</option>
        {ops.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
      </select>
    </label>
  );
  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">Línea {i + 1}</p>
        {quitar && <button type="button" onClick={quitar} className="text-base font-medium text-red-700 hover:underline">Quitar</button>}
      </div>
      <div role="radiogroup" aria-label="Tipo de línea" className="flex flex-wrap gap-2">
        {([["consumible", "Consumible (inventario)"], ["activo", "Activo (mueble, equipo)"], ["servicio", "Servicio (solo gasto)"]] as const).map(([v, t]) => (
          <button key={v} type="button" role="radio" aria-checked={l.tipo === v} onClick={() => cambiar({ tipo: v })}
            className={`rounded-xl border px-3 py-2 text-base font-medium ${l.tipo === v ? "border-sky-500 bg-sky-100 text-sky-900" : "border-slate-300 bg-white"}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        {l.tipo === "consumible" ? (
          <label className="space-y-1.5 sm:col-span-2" htmlFor={id("producto")}>
            <span className={estiloEtiqueta}>Producto</span>
            <select id={id("producto")} className={estiloInput} value={l.producto_id ?? ""}
              onChange={(e) => { const p = productos.find((x) => String(x.id) === e.target.value); cambiar({ producto_id: e.target.value, descripcion: p?.nombre ?? "", unidad: p?.unidad ?? "unidad" }); }}>
              <option value="">Elija…</option>
              {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre} ({p.unidad})</option>)}
            </select>
          </label>
        ) : (
          <div className="sm:col-span-2">{campo("descripcion", l.tipo === "activo" ? "Qué es (tipo de bien)" : "Descripción")}</div>
        )}
        {campo("cantidad", "Cantidad", { inputMode: "decimal" })}
        {campo("unidad", "Unidad")}
        {campo("precio", "Precio unitario (₡)", { inputMode: "decimal" })}
        <div className="flex items-end pb-3 text-base text-slate-600">Total: <strong className="ml-1">{colones(aNumero(l.cantidad) * aNumero(l.precio))}</strong></div>
        {l.tipo === "consumible" && campo("vencimiento", "Vence (si aplica)", { type: "date" })}
        {l.tipo === "activo" && (
          <>
            {sel("ubicacion_id", "¿Dónde va a estar?", ubicaciones, "Elija…")}
            {sel("categoria_id", "Fila del Anexo 2", categorias, "Sin definir")}
            <div className="sm:col-span-2">{campo("placas", "Placas (separadas por coma)", { placeholder: "Ej.: 120, 121, 122" })}</div>
            <p className="text-sm text-slate-500 sm:col-span-4">Se crea un activo por cada unidad. Si todavía no tienen placa, déjelo vacío: quedan en Pendientes.</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function FormularioCompra({ proveedores, fuentes, productos, ubicaciones, categorias, hoy }: {
  proveedores: Opcion[]; fuentes: Opcion[]; productos: Producto[]; ubicaciones: Opcion[]; categorias: Opcion[]; hoy: string;
}) {
  const [estado, accion] = useActionState(registrarCompra, null);
  const [lineas, setLineas] = useState<LineaCompra[]>([nueva()]);
  const [iva, setIva] = useState("0");
  const subtotal = useMemo(() => lineas.reduce((s, l) => s + Math.round(aNumero(l.cantidad) * aNumero(l.precio) * 100) / 100, 0), [lineas]);

  return (
    <form action={accion} className="space-y-6">
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-lg font-semibold">Factura</legend>
        <Seleccion etiqueta="Proveedor" name="proveedor_id" opciones={proveedores} vacio="Elija…" required />
        <Seleccion etiqueta="Pagado con fondos de" name="fuente_id" opciones={fuentes} vacio="Elija…" required />
        <Campo etiqueta="Número de factura" name="numero_factura" required />
        <Campo etiqueta="Fecha de la factura" name="fecha" type="date" defaultValue={hoy} required />
        <CampoArchivo etiqueta="Foto o PDF de la factura" name="factura" ayuda="En el celular puede tomarle la foto directamente." />
        <AreaTexto etiqueta="Observaciones" name="observaciones" />
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 text-lg font-semibold">Qué se compró</legend>
        {lineas.map((l, i) => (
          <Linea key={i} l={l} i={i} productos={productos} ubicaciones={ubicaciones} categorias={categorias}
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
        <p className="text-xl">Total: <strong>{colones(subtotal + aNumero(iva))}</strong></p>
      </div>
      <input type="hidden" name="lineas" value={JSON.stringify(lineas)} />
      <MensajeError estado={estado} />
      <BotonEnviar pendiente="Guardando la compra…">Registrar compra</BotonEnviar>
    </form>
  );
}
