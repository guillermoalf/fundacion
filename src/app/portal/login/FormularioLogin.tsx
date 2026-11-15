"use client";

import { useActionState } from "react";
import { iniciarSesion, type EstadoLogin } from "./acciones";

const inicial: EstadoLogin = { error: null, correo: "" };

export default function FormularioLogin({ siguiente }: { siguiente: string }) {
  const [estado, accion, enviando] = useActionState(iniciarSesion, inicial);

  return (
    <form action={accion} className="space-y-5">
      <input type="hidden" name="siguiente" value={siguiente} />
      <div className="space-y-1.5">
        <label htmlFor="correo" className="block text-sm font-medium text-slate-700">
          Correo
        </label>
        <input
          id="correo"
          name="correo"
          type="email"
          autoComplete="email"
          defaultValue={estado.correo}
          key={estado.correo}
          required
          className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="contrasena" className="block text-sm font-medium text-slate-700">
          Contraseña
        </label>
        <input
          id="contrasena"
          name="contrasena"
          type="password"
          autoComplete="current-password"
          required
          className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
        />
      </div>
      {estado.error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {estado.error}
        </p>
      )}
      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-lg bg-sky-600 px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-wait disabled:opacity-60"
      >
        {enviando ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
