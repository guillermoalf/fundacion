"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cambiarContrasena, type EstadoContrasena } from "./acciones";

const inicial: EstadoContrasena = { error: null };
const estiloInput =
  "block w-full rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-11 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30";

/** Campo de contraseña con un botón (ojo) para mostrar u ocultar lo que se escribe. */
function CampoContrasena({ id, etiqueta, autoComplete, minLength }: { id: string; etiqueta: string; autoComplete: string; minLength?: number }) {
  const [visible, setVisible] = useState(false);
  const Icono = visible ? EyeOff : Eye;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {etiqueta}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          minLength={minLength}
          required
          className={estiloInput}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-slate-500 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/30"
        >
          <Icono className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default function FormularioContrasena() {
  const [estado, accion, enviando] = useActionState(cambiarContrasena, inicial);

  return (
    <form action={accion} className="space-y-4">
      <CampoContrasena id="actual" etiqueta="Contraseña actual" autoComplete="current-password" />
      <CampoContrasena id="nueva" etiqueta="Contraseña nueva" autoComplete="new-password" minLength={10} />
      <CampoContrasena id="confirmacion" etiqueta="Repita la contraseña" autoComplete="new-password" minLength={10} />
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
