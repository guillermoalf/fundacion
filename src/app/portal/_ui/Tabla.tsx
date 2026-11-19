"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Columns3, Filter, ArrowUp, ArrowDown, X } from "lucide-react";
import { Falta, Insignia, type Tono } from "./Insignias";
import { estiloInput } from "./estilos";
import Vacio from "./Vacio";
import { guardarPreferenciaTabla, leerPreferenciaTabla, type PreferenciaTabla } from "./preferencias";

/**
 * Contenido de una celda. Todo es serializable (la página del servidor arma las filas ya formateadas):
 *   null → insignia "Falta" (dato faltante, nunca se inventa)
 *   { insignia, tono } → etiqueta de color · { texto, href } → enlace
 *   `detalle` → segunda línea pequeña (p. ej. el desglose del IVA) · `extra` → marca de color al lado (p. ej. ↑ 8 %)
 */
export type Celda =
  | string | number | null
  | { texto: string; href?: string; tono?: Tono; insignia?: boolean; detalle?: string; extra?: { texto: string; tono: Tono } }
  | { vacio: true };

/** `oculta`: no se ve hasta que la persona la agregue en «Columnas». */
export type Columna = { clave: string; titulo: string; alinear?: "derecha"; ocultarEnMovil?: boolean; oculta?: boolean };
export type Fila = {
  id: string | number;
  celdas: Record<string, Celda>;
  /** valores para ordenar y para los filtros por rango (número o fecha "YYYY-MM-DD"); si falta se usa el texto de la celda */
  orden?: Record<string, string | number | null>;
  /** valor de cada filtro para esta fila */
  filtros?: Record<string, string>;
  href?: string;
};
export type Filtro = { clave: string; titulo: string; opciones?: string[] };

const textoCelda = (c: Celda): string => {
  if (c === null) return "";
  if (typeof c === "string" || typeof c === "number") return String(c);
  if ("vacio" in c) return "";
  return c.texto;
};

const COLOR_EXTRA: Record<Tono, string> = { gris: "text-slate-500", verde: "text-emerald-700", ambar: "text-amber-700", rojo: "text-red-700", azul: "text-sky-700" };

function VerCelda({ c, href }: { c: Celda; href?: string }) {
  if (c === null) return <Falta />;
  if (typeof c === "string" || typeof c === "number") return href ? <Link href={href} className="font-medium text-sky-700 hover:underline">{c}</Link> : <>{c}</>;
  if ("vacio" in c) return <span className="text-slate-400">—</span>;
  const enlace = c.href ?? href;
  const principal = c.insignia || (c.tono && !c.extra && !c.detalle)
    ? <Insignia tono={c.tono}>{c.texto}</Insignia>
    : enlace ? <Link href={enlace} className="font-medium text-sky-700 hover:underline">{c.texto}</Link> : <>{c.texto}</>;
  if (!c.extra && !c.detalle) return principal;
  return (
    <span className="inline-block">
      <span className="whitespace-nowrap">
        {principal}
        {c.extra && <span className={`ml-1.5 text-sm font-semibold ${COLOR_EXTRA[c.extra.tono]}`}>{c.extra.texto}</span>}
      </span>
      {c.detalle && <span className="block text-xs text-slate-500">{c.detalle}</span>}
    </span>
  );
}

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const esFecha = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v);

/**
 * Lista con el mismo formato en todo el portal (estilo ServiceNow): buscar, filtrar por varias cosas a la vez
 * (incluidos rangos de números y fechas), ordenar y elegir qué columnas ver y en qué orden. Las columnas y el orden
 * se guardan por usuario (cada quien ve sus listas como las dejó, en cualquier computadora).
 */
export default function Tabla({
  columnas, filas, filtros = [], porPagina = 25, buscador = true, vacio, enlaceEn, id,
}: {
  columnas: Columna[];
  filas: Fila[];
  filtros?: Filtro[];
  porPagina?: number;
  buscador?: boolean;
  vacio?: ReactNode;
  /** columna donde va el enlace de la fila (por defecto la primera visible) */
  enlaceEn?: string;
  /** identifica la lista para guardar las preferencias (por defecto, la dirección de la página) */
  id?: string;
}) {
  const pathname = usePathname();
  const idTabla = id ?? pathname;
  const porDefecto = useMemo(() => columnas.filter((c) => !c.oculta).map((c) => c.clave), [columnas]);
  const [visibles, setVisibles] = useState<string[]>(porDefecto);
  const [busqueda, setBusqueda] = useState("");
  const [valoresFiltro, setValoresFiltro] = useState<Record<string, string[]>>({});
  const [rangos, setRangos] = useState<Record<string, { desde: string; hasta: string }>>({});
  const [pagina, setPagina] = useState(1);
  const [orden, setOrden] = useState<{ clave: string; asc: boolean } | null>(null);
  const [panel, setPanel] = useState<"filtros" | "columnas" | null>(null);
  const cargado = useRef(false);

  // Preferencias del usuario (columnas y orden).
  useEffect(() => {
    let vivo = true;
    leerPreferenciaTabla(idTabla).then((p) => {
      if (!vivo) return;
      if (p?.columnas?.length) {
        const existentes = p.columnas.filter((c) => columnas.some((x) => x.clave === c));
        if (existentes.length) setVisibles(existentes);
      }
      if (p?.orden && columnas.some((x) => x.clave === p.orden!.clave)) setOrden(p.orden);
      cargado.current = true;
    });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idTabla]);

  const guardar = useRef<ReturnType<typeof setTimeout> | null>(null);
  function persistir(p: PreferenciaTabla) {
    cargado.current = true;
    if (guardar.current) clearTimeout(guardar.current);
    guardar.current = setTimeout(() => void guardarPreferenciaTabla(idTabla, p), 600);
  }
  const cambiarVisibles = (v: string[]) => { setVisibles(v); persistir({ columnas: v, orden }); };
  const cambiarOrden = (o: { clave: string; asc: boolean } | null) => { setOrden(o); persistir({ columnas: visibles, orden: o }); };

  const columnasVisibles = visibles.map((k) => columnas.find((c) => c.clave === k)).filter((c): c is Columna => !!c);
  const colEnlace = enlaceEn && visibles.includes(enlaceEn) ? enlaceEn : columnasVisibles[0]?.clave;

  const opcionesFiltro = useMemo(
    () => Object.fromEntries(filtros.map((f) => [f.clave, f.opciones ?? [...new Set(filas.map((x) => x.filtros?.[f.clave]).filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b, "es"))])),
    [filtros, filas],
  );

  // Columnas que admiten rango: todos sus valores de `orden` son números, o todos son fechas.
  const tiposRango = useMemo(() => {
    const r: Record<string, "numero" | "fecha"> = {};
    for (const c of columnas) {
      const vals = filas.map((f) => f.orden?.[c.clave]).filter((v) => v !== null && v !== undefined && v !== "");
      if (vals.length < 2) continue;
      if (vals.every((v) => typeof v === "number")) r[c.clave] = "numero";
      else if (vals.every(esFecha)) r[c.clave] = "fecha";
    }
    return r;
  }, [columnas, filas]);

  const resultado = useMemo(() => {
    const q = sinTildes(busqueda.trim());
    let r = filas.filter((f) => {
      if (q && !sinTildes(Object.values(f.celdas).map(textoCelda).join(" ")).includes(q)) return false;
      for (const [k, vs] of Object.entries(valoresFiltro)) if (vs.length && !vs.includes(f.filtros?.[k] ?? "")) return false;
      for (const [k, { desde, hasta }] of Object.entries(rangos)) {
        if (!desde && !hasta) continue;
        const v = f.orden?.[k];
        if (v === null || v === undefined || v === "") return false;
        if (tiposRango[k] === "numero") {
          if (desde !== "" && (v as number) < Number(desde)) return false;
          if (hasta !== "" && (v as number) > Number(hasta)) return false;
        } else {
          const d = String(v).slice(0, 10);
          if (desde && d < desde) return false;
          if (hasta && d > hasta) return false;
        }
      }
      return true;
    });
    if (orden) {
      const valor = (f: Fila) => f.orden?.[orden.clave] ?? textoCelda(f.celdas[orden.clave] ?? null);
      r = [...r].sort((a, b) => {
        const va = valor(a), vb = valor(b);
        if (va === vb) return 0;
        if (va === null || va === "") return 1;
        if (vb === null || vb === "") return -1;
        const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "es", { numeric: true });
        return orden.asc ? cmp : -cmp;
      });
    }
    return r;
  }, [filas, busqueda, valoresFiltro, rangos, orden, tiposRango]);

  const paginas = Math.max(1, Math.ceil(resultado.length / porPagina));
  const actual = Math.min(pagina, paginas);
  const enPagina = resultado.slice((actual - 1) * porPagina, actual * porPagina);

  const chips: { texto: string; quitar: () => void }[] = [
    ...Object.entries(valoresFiltro).flatMap(([k, vs]) => vs.map((v) => ({
      texto: `${filtros.find((f) => f.clave === k)?.titulo ?? k}: ${v}`,
      quitar: () => setValoresFiltro((x) => ({ ...x, [k]: (x[k] ?? []).filter((y) => y !== v) })),
    }))),
    ...Object.entries(rangos).filter(([, r]) => r.desde || r.hasta).map(([k, r]) => ({
      texto: `${columnas.find((c) => c.clave === k)?.titulo ?? k}: ${r.desde ? `desde ${r.desde}` : ""}${r.desde && r.hasta ? " " : ""}${r.hasta ? `hasta ${r.hasta}` : ""}`,
      quitar: () => setRangos((x) => ({ ...x, [k]: { desde: "", hasta: "" } })),
    })),
  ];
  const hayFiltros = busqueda !== "" || chips.length > 0;
  const quitarTodo = () => { setBusqueda(""); setValoresFiltro({}); setRangos({}); setPagina(1); };

  if (filas.length === 0) return <>{vacio ?? <Vacio titulo="Todavía no hay nada aquí." />}</>;

  const botonBarra = (activo: boolean) =>
    `inline-flex items-center gap-2 rounded-xl border px-3 py-2.5 text-base font-medium ${activo ? "border-sky-500 bg-sky-50 text-sky-900" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`;
  const hayPanelFiltros = filtros.length > 0 || Object.keys(tiposRango).length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {buscador && (
          <input type="search" placeholder="Buscar…" aria-label="Buscar" value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }} className={`${estiloInput} max-w-xs`} />
        )}
        {hayPanelFiltros && (
          <button type="button" className={botonBarra(panel === "filtros")} aria-expanded={panel === "filtros"} onClick={() => setPanel((p) => (p === "filtros" ? null : "filtros"))}>
            <Filter aria-hidden className="h-4 w-4" /> Filtros{chips.length ? ` (${chips.length})` : ""}
          </button>
        )}
        <button type="button" className={botonBarra(panel === "columnas")} aria-expanded={panel === "columnas"} onClick={() => setPanel((p) => (p === "columnas" ? null : "columnas"))}>
          <Columns3 aria-hidden className="h-4 w-4" /> Columnas
        </button>
      </div>

      {panel === "filtros" && (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtros.map((f) => (
              <fieldset key={f.clave} className="space-y-1.5">
                <legend className="mb-1 text-sm font-semibold text-slate-700">{f.titulo}</legend>
                <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
                  {opcionesFiltro[f.clave].map((o) => {
                    const sel = valoresFiltro[f.clave]?.includes(o) ?? false;
                    return (
                      <label key={o} className="flex items-center gap-2 text-base">
                        <input type="checkbox" className="h-4 w-4" checked={sel}
                          onChange={() => { setValoresFiltro((x) => ({ ...x, [f.clave]: sel ? (x[f.clave] ?? []).filter((y) => y !== o) : [...(x[f.clave] ?? []), o] })); setPagina(1); }} />
                        {o}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}
            {Object.entries(tiposRango).map(([k, tipo]) => {
              const c = columnas.find((x) => x.clave === k)!;
              const v = rangos[k] ?? { desde: "", hasta: "" };
              const poner = (campo: "desde" | "hasta", valor: string) => { setRangos((x) => ({ ...x, [k]: { ...v, [campo]: valor } })); setPagina(1); };
              return (
                <fieldset key={k} className="space-y-1.5">
                  <legend className="mb-1 text-sm font-semibold text-slate-700">{c.titulo}</legend>
                  <div className="grid grid-cols-2 gap-2">
                    <input aria-label={`${c.titulo} desde`} placeholder="Desde" type={tipo === "fecha" ? "date" : "number"} inputMode="decimal" value={v.desde} onChange={(e) => poner("desde", e.target.value)} className={estiloInput} />
                    <input aria-label={`${c.titulo} hasta`} placeholder="Hasta" type={tipo === "fecha" ? "date" : "number"} inputMode="decimal" value={v.hasta} onChange={(e) => poner("hasta", e.target.value)} className={estiloInput} />
                  </div>
                </fieldset>
              );
            })}
          </div>
          <div className="flex justify-end gap-2">
            {chips.length > 0 && <button type="button" onClick={quitarTodo} className="rounded-xl px-3 py-2 font-medium text-slate-600 hover:bg-slate-100">Quitar filtros</button>}
            <button type="button" onClick={() => setPanel(null)} className="rounded-xl bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-700">Listo</button>
          </div>
        </div>
      )}

      {panel === "columnas" && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">Marque las columnas que quiere ver y ordénelas con las flechas. Se guarda para su usuario.</p>
          <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {[...columnasVisibles, ...columnas.filter((c) => !visibles.includes(c.clave))].map((c) => {
              const i = visibles.indexOf(c.clave);
              const mover = (d: number) => {
                const n = [...visibles];
                [n[i], n[i + d]] = [n[i + d], n[i]];
                cambiarVisibles(n);
              };
              return (
                <li key={c.clave} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-1.5">
                  <label className="flex items-center gap-2 text-base">
                    <input type="checkbox" className="h-4 w-4" checked={i >= 0} disabled={i >= 0 && visibles.length === 1}
                      onChange={() => cambiarVisibles(i >= 0 ? visibles.filter((x) => x !== c.clave) : [...visibles, c.clave])} />
                    {c.titulo}
                  </label>
                  {i >= 0 && (
                    <span className="flex gap-1">
                      <button type="button" aria-label={`Subir ${c.titulo}`} disabled={i === 0} onClick={() => mover(-1)} className="rounded-lg p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                      <button type="button" aria-label={`Bajar ${c.titulo}`} disabled={i === visibles.length - 1} onClick={() => mover(1)} className="rounded-lg p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { cambiarVisibles(porDefecto); cambiarOrden(null); }} className="rounded-xl px-3 py-2 font-medium text-slate-600 hover:bg-slate-100">Restablecer</button>
            <button type="button" onClick={() => setPanel(null)} className="rounded-xl bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-700">Listo</button>
          </div>
        </div>
      )}

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((ch) => (
            <span key={ch.texto} className="inline-flex items-center gap-1 rounded-full bg-sky-100 py-1 pl-3 pr-1 text-sm text-sky-900">
              {ch.texto}
              <button type="button" aria-label={`Quitar ${ch.texto}`} onClick={() => { ch.quitar(); setPagina(1); }} className="rounded-full p-0.5 hover:bg-sky-200"><X className="h-3.5 w-3.5" /></button>
            </span>
          ))}
        </div>
      )}

      <p className="text-sm text-slate-500" aria-live="polite">
        {hayFiltros ? `${resultado.length} de ${filas.length}` : `${filas.length} en total`}
        {hayFiltros && <button type="button" onClick={quitarTodo} className="ml-2 font-medium text-sky-700 hover:underline">Quitar filtros</button>}
      </p>

      {resultado.length === 0 ? (
        <Vacio titulo="Nada coincide con la búsqueda o los filtros." />
      ) : (
        <>
          {/* Computadora: tabla */}
          <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
            <table className="w-full text-left text-base">
              <thead className="border-b border-slate-200 bg-slate-50 text-sm text-slate-600">
                <tr>
                  {columnasVisibles.map((c) => (
                    <th key={c.clave} scope="col" className={`px-4 py-3 font-semibold ${c.alinear === "derecha" ? "text-right" : ""}`}>
                      <button type="button" className="hover:text-slate-900"
                        onClick={() => cambiarOrden({ clave: c.clave, asc: orden?.clave === c.clave ? !orden.asc : true })}>
                        {c.titulo}
                        {orden?.clave === c.clave && <span aria-hidden="true"> {orden.asc ? "▲" : "▼"}</span>}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {enPagina.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50">
                    {columnasVisibles.map((c) => (
                      <td key={c.clave} className={`px-4 py-3 align-top ${c.alinear === "derecha" ? "text-right tabular-nums" : ""}`}>
                        <VerCelda c={f.celdas[c.clave] ?? { vacio: true }} href={c.clave === colEnlace ? f.href : undefined} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Celular: tarjetas */}
          <ul className="space-y-3 md:hidden">
            {enPagina.map((f) => (
              <li key={f.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <dl className="space-y-1.5">
                  {columnasVisibles.filter((c) => !c.ocultarEnMovil).map((c, i) => (
                    <div key={c.clave} className={i === 0 ? "text-lg font-semibold" : "flex justify-between gap-3 text-base"}>
                      {i > 0 && <dt className="text-slate-500">{c.titulo}</dt>}
                      <dd className={i > 0 ? "text-right" : ""}>
                        <VerCelda c={f.celdas[c.clave] ?? { vacio: true }} href={c.clave === colEnlace ? f.href : undefined} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ul>

          {paginas > 1 && (
            <div className="flex items-center justify-between gap-3">
              <button type="button" disabled={actual === 1} onClick={() => setPagina(actual - 1)} className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-medium disabled:opacity-40">
                ← Anterior
              </button>
              <span className="text-slate-600">Página {actual} de {paginas}</span>
              <button type="button" disabled={actual === paginas} onClick={() => setPagina(actual + 1)} className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-medium disabled:opacity-40">
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
