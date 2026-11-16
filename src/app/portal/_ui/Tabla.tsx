"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { Falta, Insignia, type Tono } from "./Insignias";
import { estiloInput } from "./estilos";
import Vacio from "./Vacio";

/**
 * Contenido de una celda. Todo es serializable (la página del servidor arma las filas ya formateadas):
 *   null → insignia "Falta" (dato faltante, nunca se inventa)
 *   { insignia, tono } → etiqueta de color · { texto, href } → enlace
 */
export type Celda = string | number | null | { texto: string; href?: string; tono?: Tono; insignia?: boolean } | { vacio: true };

export type Columna = { clave: string; titulo: string; alinear?: "derecha"; ocultarEnMovil?: boolean };
export type Fila = {
  id: string | number;
  celdas: Record<string, Celda>;
  /** valores para ordenar (número o texto); si falta se ordena por el texto de la celda */
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

function VerCelda({ c, href }: { c: Celda; href?: string }) {
  if (c === null) return <Falta />;
  if (typeof c === "string" || typeof c === "number") return href ? <Link href={href} className="font-medium text-sky-700 hover:underline">{c}</Link> : <>{c}</>;
  if ("vacio" in c) return <span className="text-slate-400">—</span>;
  if (c.insignia || c.tono) return <Insignia tono={c.tono}>{c.texto}</Insignia>;
  if (c.href) return <Link href={c.href} className="font-medium text-sky-700 hover:underline">{c.texto}</Link>;
  return <>{c.texto}</>;
}

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function Tabla({
  columnas, filas, filtros = [], porPagina = 25, buscador = true, vacio, enlaceEn,
}: {
  columnas: Columna[];
  filas: Fila[];
  filtros?: Filtro[];
  porPagina?: number;
  buscador?: boolean;
  vacio?: ReactNode;
  /** columna donde va el enlace de la fila (por defecto la primera) */
  enlaceEn?: string;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [valoresFiltro, setValoresFiltro] = useState<Record<string, string>>({});
  const [pagina, setPagina] = useState(1);
  const [orden, setOrden] = useState<{ clave: string; asc: boolean } | null>(null);
  const colEnlace = enlaceEn ?? columnas[0]?.clave;

  const opcionesFiltro = useMemo(
    () =>
      Object.fromEntries(
        filtros.map((f) => [f.clave, f.opciones ?? [...new Set(filas.map((x) => x.filtros?.[f.clave]).filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b, "es"))]),
      ),
    [filtros, filas],
  );

  const visibles = useMemo(() => {
    const q = sinTildes(busqueda.trim());
    let r = filas.filter(
      (f) =>
        (!q || sinTildes(Object.values(f.celdas).map(textoCelda).join(" ")).includes(q)) &&
        Object.entries(valoresFiltro).every(([k, v]) => !v || f.filtros?.[k] === v),
    );
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
  }, [filas, busqueda, valoresFiltro, orden]);

  const paginas = Math.max(1, Math.ceil(visibles.length / porPagina));
  const actual = Math.min(pagina, paginas);
  const enPagina = visibles.slice((actual - 1) * porPagina, actual * porPagina);
  const hayFiltros = busqueda !== "" || Object.values(valoresFiltro).some(Boolean);

  if (filas.length === 0) return <>{vacio ?? <Vacio titulo="Todavía no hay nada aquí." />}</>;

  return (
    <div className="space-y-4">
      {(buscador || filtros.length > 0) && (
        <div className="flex flex-wrap gap-3">
          {buscador && (
            <input
              type="search"
              placeholder="Buscar…"
              aria-label="Buscar"
              value={busqueda}
              onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
              className={`${estiloInput} max-w-xs`}
            />
          )}
          {filtros.map((f) => (
            <select
              key={f.clave}
              aria-label={f.titulo}
              value={valoresFiltro[f.clave] ?? ""}
              onChange={(e) => { setValoresFiltro((v) => ({ ...v, [f.clave]: e.target.value })); setPagina(1); }}
              className={`${estiloInput} w-auto max-w-[16rem]`}
            >
              <option value="">{f.titulo}: todos</option>
              {opcionesFiltro[f.clave].map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ))}
          {hayFiltros && (
            <button type="button" className="text-base font-medium text-sky-700 hover:underline" onClick={() => { setBusqueda(""); setValoresFiltro({}); setPagina(1); }}>
              Quitar filtros
            </button>
          )}
        </div>
      )}

      <p className="text-sm text-slate-500">{visibles.length === filas.length ? `${filas.length} en total` : `${visibles.length} de ${filas.length}`}</p>

      {visibles.length === 0 ? (
        <Vacio titulo="Nada coincide con la búsqueda.">Pruebe con otra palabra o quite los filtros.</Vacio>
      ) : (
        <>
          {/* Computadora: tabla */}
          <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
            <table className="w-full text-left text-base">
              <thead className="border-b border-slate-200 bg-slate-50 text-sm text-slate-600">
                <tr>
                  {columnas.map((c) => (
                    <th key={c.clave} scope="col" className={`px-4 py-3 font-semibold ${c.alinear === "derecha" ? "text-right" : ""}`}>
                      <button
                        type="button"
                        className="hover:text-slate-900"
                        onClick={() => setOrden((o) => ({ clave: c.clave, asc: o?.clave === c.clave ? !o.asc : true }))}
                      >
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
                    {columnas.map((c) => (
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
                  {columnas.filter((c) => !c.ocultarEnMovil).map((c, i) => (
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
