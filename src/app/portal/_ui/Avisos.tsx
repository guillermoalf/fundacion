"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type Aviso = { id: number; texto: string; tipo: "exito" | "error" };
const Contexto = createContext<(texto: string, tipo?: Aviso["tipo"]) => void>(() => {});

/** Avisos flotantes (toasts). Se usan con useAviso() o con useAvisoResultado(estado). */
export function ProveedorAvisos({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const siguiente = useRef(1);
  const avisar = useCallback((texto: string, tipo: Aviso["tipo"] = "exito") => {
    const id = siguiente.current++;
    setAvisos((a) => [...a, { id, texto, tipo }]);
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), tipo === "error" ? 8000 : 4000);
  }, []);
  return (
    <Contexto.Provider value={avisar}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6">
        {avisos.map((a) => (
          <div
            key={a.id}
            role={a.tipo === "error" ? "alert" : "status"}
            className={`pointer-events-auto w-full max-w-sm rounded-xl px-4 py-3 text-base font-medium shadow-lg ${a.tipo === "error" ? "bg-red-600 text-white" : "bg-emerald-600 text-white"}`}
          >
            {a.texto}
          </div>
        ))}
      </div>
    </Contexto.Provider>
  );
}

export const useAviso = () => useContext(Contexto);

/** Muestra un aviso cada vez que una Server Action devuelve un resultado nuevo. */
export function useAvisoResultado(estado: { ok: boolean; error?: string } | null, exito: string | ((e: never) => string)) {
  const avisar = useAviso();
  useEffect(() => {
    if (!estado) return;
    if (estado.ok) avisar(typeof exito === "function" ? exito(estado as never) : exito, "exito");
    else if (estado.error) avisar(estado.error, "error");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);
}
