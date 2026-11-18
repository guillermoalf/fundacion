"use client";

import { useMemo, useState } from "react";
import { estiloBoton, estiloInput } from "../../../../_ui/estilos";
import { cantidad } from "@/lib/portal/formato";

type Item = { id: number; nombre: string; unidad: string; saldo: number; minimo: number };

/** Pedido al proveedor: lo que está bajo el mínimo con la cantidad sugerida; se corrige, se copia para WhatsApp o se imprime. */
export default function Pedido({ proveedor, fecha, items }: { proveedor: string; fecha: string; items: Item[] }) {
  const sugerido = (i: Item) => Math.max(0, Math.ceil((i.minimo - i.saldo) * 100) / 100);
  const [pedir, setPedir] = useState<Record<number, string>>(() => Object.fromEntries(items.map((i) => [i.id, sugerido(i) ? String(sugerido(i)) : ""])));
  const [copiado, setCopiado] = useState(false);
  const lineas = useMemo(() => items.filter((i) => Number(pedir[i.id]) > 0).map((i) => `• ${pedir[i.id]} ${i.unidad} de ${i.nombre}`), [items, pedir]);
  const texto = `Pedido de la Fundación Creciendo Feliz (${fecha})\n${proveedor}\n\n${lineas.join("\n")}\n\nGracias.`;

  return (
    <div className="space-y-5">
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white print:border-0">
        <table className="w-full text-base">
          <thead className="bg-slate-50 text-sm text-slate-600 print:bg-white">
            <tr><th className="px-4 py-3 text-left">Producto</th><th className="px-3 py-3 text-right print:hidden">Hay</th><th className="px-3 py-3 text-right print:hidden">Mínimo</th><th className="px-3 py-3 text-right">Pedir</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((i) => (
              <tr key={i.id} className={Number(pedir[i.id]) > 0 ? "" : "print:hidden"}>
                <td className="px-4 py-2 font-medium">{i.nombre}</td>
                <td className={`px-3 py-2 text-right tabular-nums print:hidden ${i.saldo < i.minimo ? "text-amber-800" : ""}`}>{cantidad(i.saldo)} {i.unidad}</td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-500 print:hidden">{i.minimo ? `${cantidad(i.minimo)} ${i.unidad}` : "—"}</td>
                <td className="px-3 py-2 text-right">
                  <span className="hidden print:inline">{pedir[i.id]} {i.unidad}</span>
                  <input aria-label={`Pedir ${i.nombre}`} inputMode="decimal" value={pedir[i.id]} onChange={(e) => setPedir((p) => ({ ...p, [i.id]: e.target.value }))}
                    className={`${estiloInput} ml-auto w-28 text-right print:hidden`} placeholder="0" />
                  <span className="ml-2 text-sm text-slate-500 print:hidden">{i.unidad}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2 print:hidden">
        <button type="button" className={estiloBoton.primario} disabled={!lineas.length}
          onClick={async () => { await navigator.clipboard.writeText(texto); setCopiado(true); setTimeout(() => setCopiado(false), 3000); }}>
          {copiado ? "¡Copiado! Péguelo en WhatsApp" : "Copiar para WhatsApp"}
        </button>
        <button type="button" className={estiloBoton.secundario} onClick={() => window.print()} disabled={!lineas.length}>Imprimir</button>
      </div>
      <p className="text-sm text-slate-500 print:hidden">La cantidad sugerida es lo que falta para llegar al mínimo de cada producto. Cámbiela si hace falta. Cuando llegue el pedido, registre la factura en Compras para que entre al inventario.</p>
    </div>
  );
}
