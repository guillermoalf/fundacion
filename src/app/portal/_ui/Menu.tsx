"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { SeccionMenu } from "./navegacion";

function activo(pathname: string, href: string) {
  return href === "/portal" ? pathname === "/portal" : pathname === href || pathname.startsWith(href + "/");
}

function Enlaces({ secciones, pathname, alElegir }: { secciones: SeccionMenu[]; pathname: string; alElegir?: () => void }) {
  return (
    <nav aria-label="Menú del portal" className="space-y-5">
      {secciones.map((s, i) => (
        <div key={s.titulo ?? i}>
          {s.titulo && <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{s.titulo}</p>}
          <ul className="space-y-0.5">
            {s.items.map((it) => {
              const sel = activo(pathname, it.href);
              return (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    onClick={alElegir}
                    aria-current={sel ? "page" : undefined}
                    className={`block rounded-xl px-3 py-2.5 text-base font-medium ${sel ? "bg-sky-100 text-sky-900" : "text-slate-700 hover:bg-slate-100"}`}
                  >
                    {it.etiqueta}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** Menú lateral fijo en computadora; en celular, botón ☰ que abre un panel. */
export default function Menu({ secciones, cabecera, pie }: { secciones: SeccionMenu[]; cabecera: React.ReactNode; pie: React.ReactNode }) {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);
  useEffect(() => setAbierto(false), [pathname]);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 hidden w-72 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="border-b border-slate-200 px-5 py-4">{cabecera}</div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <Enlaces secciones={secciones} pathname={pathname} />
        </div>
        <div className="border-t border-slate-200 px-5 py-4">{pie}</div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        {cabecera}
        <button
          type="button"
          onClick={() => setAbierto(true)}
          aria-label="Abrir menú"
          aria-expanded={abierto}
          className="rounded-xl border border-slate-300 px-3 py-2 text-2xl leading-none text-slate-700"
        >
          ☰
        </button>
      </header>

      {abierto && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <button type="button" aria-label="Cerrar menú" className="absolute inset-0 bg-slate-900/40" onClick={() => setAbierto(false)} />
          <div className="absolute inset-y-0 right-0 flex w-80 max-w-[85%] flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <span className="text-lg font-semibold">Menú</span>
              <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar menú" className="rounded-xl px-3 py-1 text-3xl leading-none text-slate-600">
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-4">
              <Enlaces secciones={secciones} pathname={pathname} alElegir={() => setAbierto(false)} />
            </div>
            <div className="border-t border-slate-200 px-4 py-4">{pie}</div>
          </div>
        </div>
      )}
    </>
  );
}
