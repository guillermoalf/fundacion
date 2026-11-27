"use client";

import { useActionState, useState } from "react";
import { AreaTexto, BotonEnviar, Campo, FormularioAccion, MensajeError } from "../../_ui/Formulario";
import { estiloEtiqueta, estiloInput } from "../../_ui/estilos";
import { colones } from "@/lib/portal/formato";
import { CONFIG_INICIAL, TIPOS_REPORTE, type ConfigReporte, type TipoReporte } from "@/lib/reportes/activos";
import GestorCategorias, { type OpCategoria } from "./GestorCategorias";
import { guardarReporte } from "./acciones";

type Op = { valor: string | number; texto: string };

function Marcas({ titulo, ayuda, ops, sel, cambiar, extra }: { titulo: string; ayuda: string; ops: OpCategoria[]; sel: (string | number)[]; cambiar: (v: (string | number)[]) => void; extra?: React.ReactNode }) {
  // Las categorías quitadas solo se ven si el reporte ya las tenía marcadas.
  const visibles = ops.filter((o) => o.activa !== false || sel.includes(o.valor));
  return (
    <fieldset className="space-y-1.5">
      <legend className={`${estiloEtiqueta} flex items-center gap-1`}>{titulo}{extra}</legend>
      <p className="text-sm text-slate-500">{ayuda}</p>
      <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">
        {visibles.map((o) => (
          <label key={o.valor} className="flex items-center gap-2 text-base">
            <input type="checkbox" className="h-4 w-4" checked={sel.includes(o.valor)}
              onChange={(e) => cambiar(e.target.checked ? [...sel, o.valor] : sel.filter((x) => x !== o.valor))} />
            {o.texto}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function FormularioReporte({ v, fuentes, ubicaciones, categorias, categoriasProducto, proveedores, estados, umbral }: {
  v?: { id: string; nombre: string; descripcion: string | null; tipo: TipoReporte; config: ConfigReporte };
  fuentes: Op[]; ubicaciones: Op[]; categorias: OpCategoria[]; categoriasProducto: OpCategoria[]; proveedores: Op[]; estados: Op[]; umbral: number | null;
}) {
  const [estado, accion, pendiente] = useActionState(guardarReporte, null);
  const [c, setC] = useState<ConfigReporte>(v?.config ?? CONFIG_INICIAL);
  const [tipo, setTipo] = useState<TipoReporte>(v?.tipo ?? "activos");
  const poner = (p: Partial<ConfigReporte>) => setC((x) => ({ ...x, ...p }));
  const radio = (name: string, valor: string, actual: string, texto: string, al: () => void) => (
    <label className="flex items-center gap-2 text-base"><input type="radio" name={name} className="h-4 w-4" checked={actual === valor} onChange={al} /> {texto}</label>
  );
  return (
    <FormularioAccion accion={accion} estado={estado} pendiente={pendiente} reiniciar={false} className="space-y-6"
      borrador={v ? undefined : { nombre: "reporte", titulo: "Reporte", volverA: "/portal/reportes", alRestaurar: (d) => { try { setC({ ...CONFIG_INICIAL, ...JSON.parse(d.config ?? "{}") }); if (d.tipo) setTipo(d.tipo as TipoReporte); } catch { /* borrador viejo */ } } }}>
      {v && <input type="hidden" name="id" value={v.id} />}
      <input type="hidden" name="config" value={JSON.stringify(c)} />
      <input type="hidden" name="tipo" value={tipo} />
      <fieldset className="space-y-2">
        <legend className={estiloEtiqueta}>¿De qué es el reporte?</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(TIPOS_REPORTE) as TipoReporte[]).map((t) => (
            <label key={t} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-base font-medium ${tipo === t ? "border-sky-500 bg-sky-50 text-sky-900" : "border-slate-200"}`}>
              <input type="radio" name="rep-tipo" className="h-4 w-4" checked={tipo === t} onChange={() => setTipo(t)} /> {TIPOS_REPORTE[t]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Nombre del reporte" name="nombre" id="rep-nombre" defaultValue={v?.nombre} required />
        <AreaTexto etiqueta="Para qué es (opcional)" name="descripcion" id="rep-desc" rows={1} defaultValue={v?.descripcion ?? ""} />
        <Campo etiqueta={tipo === "activos" ? "Solo los activos que se llamen… (opcional)" : "Solo los productos que se llamen… (opcional)"} name="rep-buscar" id="rep-buscar"
          value={c.buscar} onChange={(e) => poner({ buscar: e.target.value })} ayuda={tipo === "activos" ? "Ej.: silla, mesa. Vacío = todos." : "Ej.: leche. Vacío = todos."} />
      </div>

      {tipo === "compras" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Marcas titulo="Fondos" ayuda="Sin marcar = todos." ops={fuentes} sel={c.fuentes} cambiar={(x) => poner({ fuentes: x as string[] })} />
          <Marcas titulo="Proveedores" ayuda="Sin marcar = todos." ops={proveedores} sel={c.proveedores} cambiar={(x) => poner({ proveedores: x as number[] })} />
          <Marcas titulo="Categorías" ayuda="Sin marcar = todas." ops={categoriasProducto} sel={c.categoriasProducto} cambiar={(x) => poner({ categoriasProducto: x as string[] })}
            extra={<GestorCategorias tipo="producto" ops={categoriasProducto} />} />
          <fieldset className="space-y-2">
            <legend className={estiloEtiqueta}>Cómo se divide el Excel</legend>
            {radio("agruparCompras", "proveedor", c.agruparCompras, "Por proveedor", () => poner({ agruparCompras: "proveedor" }))}
            {radio("agruparCompras", "categoria", c.agruparCompras, "Por categoría", () => poner({ agruparCompras: "categoria" }))}
            {radio("agruparCompras", "ninguno", c.agruparCompras, "Sin dividir", () => poner({ agruparCompras: "ninguno" }))}
          </fieldset>
        </div>
      )}

      {tipo === "inventario" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Marcas titulo="Categorías" ayuda="Sin marcar = todas." ops={categoriasProducto} sel={c.categoriasProducto} cambiar={(x) => poner({ categoriasProducto: x as string[] })}
            extra={<GestorCategorias tipo="producto" ops={categoriasProducto} />} />
        </div>
      )}

      {tipo === "activos" && (<>
      <fieldset className="space-y-2">
        <legend className={estiloEtiqueta}>Formato</legend>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {radio("formato", "auxiliar", c.formato, "Auxiliar de activos fijos (lista con costos)", () => poner({ formato: "auxiliar" }))}
          {radio("formato", "conteo", c.formato, "Conteo: cuántos hay, en qué aulas y en qué estado", () => poner({ formato: "conteo" }))}
        </div>
      </fieldset>
      {c.formato === "auxiliar" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Título en el Excel" name="rep-titulo" id="rep-titulo" value={c.titulo} onChange={(e) => poner({ titulo: e.target.value })} />
          <Campo etiqueta="Programa" name="rep-programa" id="rep-programa" value={c.programa} onChange={(e) => poner({ programa: e.target.value })} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Marcas titulo="Fondos" ayuda="Sin marcar ninguno = todos los fondos." ops={fuentes} sel={c.fuentes} cambiar={(x) => poner({ fuentes: x as string[] })} />
        <fieldset className="space-y-2">
          <legend className={estiloEtiqueta}>Monto mínimo</legend>
          {radio("monto", "ninguno", c.montoMinimo.tipo, "Sin monto mínimo (todo)", () => poner({ montoMinimo: { tipo: "ninguno" } }))}
          {radio("monto", "umbral", c.montoMinimo.tipo, `25 % del salario base (hoy ${umbral === null ? "falta el parámetro" : colones(umbral)}, se actualiza solo)`, () => poner({ montoMinimo: { tipo: "umbral" } }))}
          <div className="flex flex-wrap items-center gap-2">
            {radio("monto", "monto", c.montoMinimo.tipo, "Otro monto: ₡", () => poner({ montoMinimo: { tipo: "monto", valor: c.montoMinimo.tipo === "monto" ? c.montoMinimo.valor : 0 } }))}
            <input aria-label="Monto mínimo" inputMode="decimal" className={`${estiloInput} w-40`} disabled={c.montoMinimo.tipo !== "monto"}
              value={c.montoMinimo.tipo === "monto" && c.montoMinimo.valor ? c.montoMinimo.valor : ""}
              onChange={(e) => poner({ montoMinimo: { tipo: "monto", valor: Number(e.target.value.replace(/[^\d.]/g, "")) || 0 } })} />
          </div>
          {c.montoMinimo.tipo !== "ninguno" && (
            <div className="space-y-1 rounded-xl bg-slate-50 p-3">
              <p className="text-sm font-medium text-slate-700">Se compara con:</p>
              {radio("base", "unidad", c.montoBase, "El costo de cada unidad (como pide el PANI)", () => poner({ montoBase: "unidad" }))}
              {radio("base", "linea", c.montoBase, "El total de la línea de la compra (todas las unidades juntas)", () => poner({ montoBase: "linea" }))}
            </div>
          )}
        </fieldset>
      </div>

      {c.formato === "auxiliar" && <fieldset className="space-y-2">
        <legend className={estiloEtiqueta}>Cómo se divide el Excel</legend>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {radio("agrupar", "ubicacion", c.agrupar, "Por aula o ubicación (para revisar aula por aula)", () => poner({ agrupar: "ubicacion" }))}
          {radio("agrupar", "categoria", c.agrupar, "Por categoría", () => poner({ agrupar: "categoria" }))}
          {radio("agrupar", "ninguno", c.agrupar, "Sin dividir", () => poner({ agrupar: "ninguno" }))}
        </div>
      </fieldset>}

      <details className="rounded-2xl border border-slate-200 p-4" open={!!(c.ubicaciones.length || c.categorias.length || c.adquiridoDesde || c.adquiridoHasta || c.estados.length || c.incluirBajas)}>
        <summary className="cursor-pointer font-semibold text-sky-700">Más filtros (aulas, categorías, fechas, estados)</summary>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <Marcas titulo="Aulas o ubicaciones" ayuda="Sin marcar = todas." ops={ubicaciones} sel={c.ubicaciones} cambiar={(x) => poner({ ubicaciones: x as number[] })} />
          <Marcas titulo="Categorías" ayuda="Sin marcar = todas." ops={categorias} sel={c.categorias} cambiar={(x) => poner({ categorias: x as number[] })}
            extra={<GestorCategorias tipo="activo" ops={categorias} />} />
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Comprados desde" name="rep-desde" id="rep-desde" type="date" value={c.adquiridoDesde ?? ""} onChange={(e) => poner({ adquiridoDesde: e.target.value || null })} />
            <Campo etiqueta="Comprados hasta" name="rep-hasta" id="rep-hasta" type="date" value={c.adquiridoHasta ?? ""} onChange={(e) => poner({ adquiridoHasta: e.target.value || null })} />
          </div>
          <div className="space-y-3">
            <Marcas titulo="Estados" ayuda="Sin marcar = todos los que no están dados de baja." ops={estados} sel={c.estados} cambiar={(x) => poner({ estados: x as string[] })} />
            <label className="flex items-center gap-2 text-base"><input type="checkbox" className="h-4 w-4" checked={c.incluirBajas} onChange={(e) => poner({ incluirBajas: e.target.checked })} /> Incluir los dados de baja</label>
          </div>
        </div>
      </details>
      </>)}

      <MensajeError estado={estado} />
      <BotonEnviar>{v ? "Guardar cambios" : "Crear reporte"}</BotonEnviar>
    </FormularioAccion>
  );
}
