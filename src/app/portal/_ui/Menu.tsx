"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Baby, Bell, ChevronDown, CircleUserRound, House, Package, ReceiptText, ShieldCheck, ChartColumn, Users, type LucideIcon } from "lucide-react";
import type { IconoMenu, SeccionMenu } from "./navegacion";

const ICONOS: Record<IconoMenu, LucideIcon> = {
  inicio: House, notificaciones: Bell, ninos: Baby, activos: Package, compras: ReceiptText, personal: Users, reportes: ChartColumn, administracion: ShieldCheck, cuenta: CircleUserRound,
};

/** Paleta del kínder: azul noche de fondo, crema para la burbuja. */
const FONDO = "#14284b";
const CREMA = "#fff6d6";

function coincide(pathname: string, href: string) {
  return href === "/portal" ? pathname === "/portal" : pathname === href || pathname.startsWith(href + "/");
}

/** Solo el enlace más específico (p. ej. «Asistencia de niños» y no también «Niños y niñas»). */
function enlaceActivo(secciones: SeccionMenu[], pathname: string) {
  return secciones.flatMap((s) => s.items).filter((it) => coincide(pathname, it.href)).sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

/**
 * Lista de secciones. En computadora (`compacto`) solo se ven los íconos hasta pasar el mouse: la barra se agranda
 * y aparecen los nombres y las pantallas de cada sección. Una burbuja crema se desliza («líquida») hasta la sección
 * bajo el mouse, o la actual.
 */
function Enlaces({ secciones, pathname, compacto, alElegir, insignias = {} }: { secciones: SeccionMenu[]; pathname: string; compacto: boolean; alElegir?: () => void; insignias?: Record<string, number> }) {
  const elegido = enlaceActivo(secciones, pathname);
  const actual = secciones.find((s) => s.items.some((i) => i.href === elegido))?.titulo;
  const [abiertas, setAbiertas] = useState<Set<string>>(() => new Set(actual ? [actual] : []));
  const [encima, setEncima] = useState<string | null>(null);
  const filas = useRef(new Map<string, HTMLElement>());
  const caja = useRef<HTMLDivElement>(null);
  const [burbuja, setBurbuja] = useState<{ top: number; visible: boolean }>({ top: 0, visible: false });

  useEffect(() => {
    if (actual) setAbiertas((a) => (a.has(actual) ? a : new Set(a).add(actual)));
  }, [actual]);

  const mover = useCallback(() => {
    const destino = encima ?? actual;
    const el = destino ? filas.current.get(destino) : undefined;
    if (!el || !caja.current) return setBurbuja((b) => ({ ...b, visible: false }));
    setBurbuja({ top: el.getBoundingClientRect().top - caja.current.getBoundingClientRect().top, visible: true });
  }, [encima, actual]);

  // Se recalcula al cambiar de sección, al abrir o cerrar una y cuando la barra termina de agrandarse.
  useLayoutEffect(mover, [mover, abiertas]);
  useEffect(() => {
    const c = caja.current;
    if (!c) return;
    const ro = new ResizeObserver(mover);
    ro.observe(c);
    return () => ro.disconnect();
  }, [mover]);

  const alternar = (t: string) => setAbiertas((a) => {
    const n = new Set(a);
    if (n.has(t)) n.delete(t);
    else n.add(t);
    return n;
  });

  // En compacto, lo que no es ícono aparece solo con la barra agrandada (mouse encima o foco con el teclado).
  const texto = compacto ? "opacity-0 transition-opacity duration-200 group-hover/menu:opacity-100 group-focus-within/menu:opacity-100" : "";
  const sub = compacto ? "hidden group-hover/menu:grid group-focus-within/menu:grid" : "grid";

  return (
    <nav aria-label="Menú del portal" onMouseLeave={() => setEncima(null)}>
      <div ref={caja} className="relative space-y-1">
        <span
          aria-hidden
          className="pointer-events-none absolute left-1 h-12 w-12 rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.35)] transition-[top,opacity,transform] duration-500 ease-[cubic-bezier(0.68,-0.4,0.27,1.4)]"
          style={{ top: burbuja.top, opacity: burbuja.visible ? 1 : 0, background: CREMA }}
        />
        {secciones.map((s) => {
          const Icono = ICONOS[s.icono];
          const directa = s.items.length === 1;
          const abierta = abiertas.has(s.titulo);
          const resaltada = (encima ?? actual) === s.titulo;
          const esActual = actual === s.titulo;
          const n = s.items.reduce((t, i) => t + (insignias[i.href] ?? 0), 0);
          const cabeza = (
            <>
              <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center">
                <Icono aria-hidden className={`h-6 w-6 transition-transform duration-300 ${resaltada ? "-translate-y-0.5 scale-110" : ""}`} style={{ color: resaltada ? FONDO : s.color }} strokeWidth={2.2} />
                {n > 0 && <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white" aria-label={`${n} avisos`}>{n}</span>}
              </span>
              <span className={`flex-1 truncate text-left text-base font-semibold ${esActual ? "text-white" : "text-slate-200"} ${texto}`}>{directa ? s.items[0].etiqueta : s.titulo}</span>
              {!directa && <ChevronDown aria-hidden className={`mr-3 h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300 ${abierta ? "rotate-180" : ""} ${texto}`} />}
            </>
          );
          const clase = "flex w-full items-center gap-2 rounded-full pl-1 outline-none focus-visible:ring-2 focus-visible:ring-white/70 hover:bg-white/5";
          return (
            <div key={s.titulo} onMouseEnter={() => setEncima(s.titulo)}>
              <div ref={(el) => { if (el) filas.current.set(s.titulo, el); else filas.current.delete(s.titulo); }}>
                {directa ? (
                  <Link href={s.items[0].href} onClick={alElegir} aria-current={s.items[0].href === elegido ? "page" : undefined} aria-label={s.items[0].etiqueta} className={clase}>{cabeza}</Link>
                ) : (
                  <button type="button" onClick={() => alternar(s.titulo)} aria-expanded={abierta} aria-label={s.titulo} className={clase}>{cabeza}</button>
                )}
              </div>
              {!directa && (
                <div className={`transition-[grid-template-rows] duration-300 ease-out ${abierta ? "grid-rows-[1fr]" : "grid-rows-[0fr]"} ${sub}`}>
                  <ul className="overflow-hidden">
                    {s.items.map((it) => {
                      const sel = it.href === elegido;
                      return (
                        <li key={it.href}>
                          <Link
                            href={it.href}
                            onClick={alElegir}
                            aria-current={sel ? "page" : undefined}
                            tabIndex={abierta ? undefined : -1}
                            className={`relative my-0.5 ml-14 mr-2 block rounded-xl px-3 py-2 text-[0.95rem] ${sel ? "bg-white/10 font-semibold text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"}`}
                          >
                            {sel && <span aria-hidden className="absolute -left-2 top-2 bottom-2 w-1 rounded-full" style={{ background: s.color }} />}
                            {it.etiqueta}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * Menú lateral. Computadora: barra de íconos que se agranda con el mouse. Celular: botón ☰ que abre el mismo menú
 * ya con los nombres.
 */
export default function Menu({ secciones, cabecera, pie, inicial, insignias }: { secciones: SeccionMenu[]; cabecera: ReactNode; pie: ReactNode; inicial: string; insignias?: Record<string, number> }) {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);
  useEffect(() => setAbierto(false), [pathname]);

  return (
    <>
      <aside
        className="group/menu fixed inset-y-0 left-0 z-40 hidden w-20 flex-col overflow-hidden text-white shadow-xl transition-[width] duration-300 ease-out hover:w-72 focus-within:w-72 lg:flex"
        style={{ background: FONDO }}
      >
        <div className="px-3 py-4">
          <div className="h-12 w-14 overflow-hidden rounded-2xl bg-white px-1.5 py-1 transition-[width] duration-300 group-hover/menu:w-[15.5rem] group-focus-within/menu:w-[15.5rem]">
            {/* Cerrada: solo el arcoíris (el ícono del navegador). Abierta: el logo completo. */}
            <img src="/logo192.png" alt="" aria-hidden className="h-10 w-10 object-contain group-hover/menu:hidden group-focus-within/menu:hidden" />
            <div className="hidden group-hover/menu:block group-focus-within/menu:block">{cabecera}</div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2">
          <Enlaces secciones={secciones} pathname={pathname} compacto insignias={insignias} />
        </div>
        <div className="border-t border-white/10 px-3 py-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold group-hover/menu:hidden group-focus-within/menu:hidden" style={{ background: CREMA, color: FONDO }} title="Su usuario">
            {inicial}
          </div>
          <div className="hidden w-[15.5rem] group-hover/menu:block group-focus-within/menu:block">{pie}</div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div className="h-10">{cabecera}</div>
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
          <button type="button" aria-label="Cerrar menú" className="absolute inset-0 bg-slate-900/50" onClick={() => setAbierto(false)} />
          <div className="absolute inset-y-0 right-0 flex w-80 max-w-[85%] flex-col text-white shadow-xl" style={{ background: FONDO }}>
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <span className="text-lg font-semibold">Menú</span>
              <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar menú" className="rounded-xl px-3 py-1 text-3xl leading-none text-slate-300">
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-4">
              <Enlaces secciones={secciones} pathname={pathname} compacto={false} alElegir={() => setAbierto(false)} insignias={insignias} />
            </div>
            <div className="border-t border-white/10 px-4 py-4">{pie}</div>
          </div>
        </div>
      )}
    </>
  );
}
