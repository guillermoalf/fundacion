"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EllipsisVertical } from "lucide-react";
import { useAviso } from "../../_ui/Avisos";
import { estiloBoton, estiloInput } from "../../_ui/estilos";
import { crearCategoriaActivo, crearCategoriaProducto, quitarCategoria, renombrarCategoria } from "./acciones";

export type OpCategoria = { valor: string | number; texto: string; activa?: boolean; detalle?: string };

/** Cierra el menú al tocar fuera de él. */
function useFuera(abierto: boolean, cerrar: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const al = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) cerrar(); };
    document.addEventListener("mousedown", al);
    return () => document.removeEventListener("mousedown", al);
  }, [abierto, cerrar]);
  return ref;
}

function Item({ tipo, op, ocupado, correr }: { tipo: "activo" | "producto"; op: OpCategoria; ocupado: boolean; correr: (f: () => Promise<{ ok: boolean; error?: string }>, ok: string) => void }) {
  const [menu, setMenu] = useState(false);
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(op.texto);
  const ref = useFuera(menu, () => setMenu(false));
  if (editando) {
    return (
      <li className="flex items-center gap-2 py-1">
        <input aria-label="Nombre" className={`${estiloInput} min-w-0 flex-1 py-1.5`} value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />
        <button type="button" disabled={ocupado} className={`${estiloBoton.primario} px-3 py-1.5`} onClick={() => { correr(() => renombrarCategoria(tipo, op.valor, nombre), "Nombre guardado."); setEditando(false); }}>Guardar</button>
        <button type="button" className="px-2 text-slate-500" onClick={() => { setNombre(op.texto); setEditando(false); }}>×</button>
      </li>
    );
  }
  return (
    <li className="flex items-center justify-between gap-2 py-1.5">
      <span className="min-w-0">
        <span className="block truncate text-base">{op.texto}</span>
        {op.detalle && <span className="block text-xs text-slate-500">{op.detalle}</span>}
      </span>
      <div ref={ref} className="relative shrink-0">
        <button type="button" aria-label={`Opciones de ${op.texto}`} onClick={() => setMenu(!menu)} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><EllipsisVertical className="h-5 w-5" /></button>
        {menu && (
          <div className="absolute right-0 top-8 z-30 w-32 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            <button type="button" className="block w-full px-3 py-2 text-left hover:bg-slate-50" onClick={() => { setMenu(false); setEditando(true); }}>Editar</button>
            <button type="button" className="block w-full px-3 py-2 text-left text-red-700 hover:bg-red-50" onClick={() => {
              setMenu(false);
              if (confirm(`¿Quitar «${op.texto}» de la lista? Lo que ya tiene esta categoría la conserva.`)) correr(() => quitarCategoria(tipo, op.valor), "Categoría quitada.");
            }}>Borrar</button>
          </div>
        )}
      </div>
    </li>
  );
}

/**
 * ⋮ junto a «Categorías»: crear categorías (arriba) y editar o quitar cada una. «Borrar» la retira de la lista: nada se borra.
 * Las de activos piden «¿Se deprecia como…?» para copiar la tasa y la vida útil de una fila del Anexo 2.
 */
export default function GestorCategorias({ tipo, ops }: { tipo: "activo" | "producto"; ops: OpCategoria[] }) {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [base, setBase] = useState("");
  const [ocupado, iniciar] = useTransition();
  const router = useRouter();
  const aviso = useAviso();
  const ref = useFuera(abierto, () => setAbierto(false));
  const activas = ops.filter((o) => o.activa !== false);

  const correr = (f: () => Promise<{ ok: boolean; error?: string }>, ok: string, despues?: () => void) => iniciar(async () => {
    const r = await f();
    aviso(r.ok ? ok : r.error ?? "No se pudo guardar.", r.ok ? "exito" : "error");
    if (r.ok) { despues?.(); router.refresh(); }
  });

  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" aria-label="Administrar categorías" aria-expanded={abierto} onClick={() => setAbierto(!abierto)} className="rounded-lg p-1 text-slate-600 hover:bg-slate-100">
        <EllipsisVertical className="h-5 w-5" />
      </button>
      {abierto && (
        <div className="absolute left-0 top-9 z-20 w-[min(22rem,calc(100vw-3rem))] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
          <div className="space-y-2 border-b border-slate-100 pb-3">
            <input aria-label="Nueva categoría" placeholder="Nueva categoría" className={estiloInput} value={nombre} onChange={(e) => setNombre(e.target.value)} />
            {tipo === "activo" && (
              <select aria-label="Se deprecia como" className={estiloInput} value={base} onChange={(e) => setBase(e.target.value)}>
                <option value="">¿Se deprecia como…?</option>
                {ops.map((o) => <option key={o.valor} value={o.valor}>{o.texto} ({o.detalle})</option>)}
              </select>
            )}
            <button type="button" disabled={ocupado || !nombre.trim() || (tipo === "activo" && !base)} className={`${estiloBoton.primario} w-full`}
              onClick={() => correr(() => (tipo === "activo" ? crearCategoriaActivo(nombre, Number(base)) : crearCategoriaProducto(nombre)), "Categoría creada.", () => { setNombre(""); setBase(""); })}>
              Crear categoría
            </button>
          </div>
          <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto pt-1">
            {activas.map((o) => <Item key={o.valor} tipo={tipo} op={o} ocupado={ocupado} correr={correr} />)}
          </ul>
        </div>
      )}
    </div>
  );
}
