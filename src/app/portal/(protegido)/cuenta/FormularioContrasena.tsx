"use client";

import { useActionState } from "react";
import { cambiarContrasena, type EstadoContrasena } from "./acciones";

const inicial: EstadoContrasena = { error: null };
const estiloInput =
  "block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30";

export default function FormularioContrasena() {
  const [estado, accion, enviando] = useActionState(cambiarContrasena, inicial);

  return (
    <form action={accion} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="actual" className="block text-sm font-medium text-slate-700">
          Contraseña actual
        </label>
        <input id="actual" name="actual" type="password" autoComplete="current-password" required className={estiloInput} />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="nueva" className="block text-sm font-medium text-slate-700">
          Contraseña nueva
        </label>
        <input id="nueva" name="nueva" type="password" autoComplete="new-password" minLength={10} required className={estiloInput} />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="confirmacion" className="block text-sm font-medium text-slate-700">
          Repita la contraseña
        </label>
        <input id="confirmacion" name="confirmacion" type="password" autoComplete="new-password" minLength={10} required className={estiloInput} />
      </div>
      {estado.error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {estado.error}
        </p>
      )}
      <button
        type="submit"
        disabled={enviando}
        className="rounded-lg bg-sky-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-sky-700 disabled:cursor-wait disabled:opacity-60"
      >
        {enviando ? "Guardando…" : "Cambiar contraseña"}
      </button>
    </form>
  );
}
