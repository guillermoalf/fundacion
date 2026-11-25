import type { Metadata } from "next";
import Link from "next/link";
import { obtenerSesion } from "@/lib/portal/sesion";
import { notificaciones } from "@/lib/portal/notificaciones";
import Encabezado from "../../_ui/Encabezado";
import Vacio from "../../_ui/Vacio";

export const metadata: Metadata = { title: "Notificaciones" };

export default async function NotificacionesPage() {
  const { consultar, veNotasNinos, esAdmin, esPersonal } = await obtenerSesion();
  const avisos = await consultar((tx) => notificaciones(tx, { veNotasNinos, esAdmin, esPersonal }));
  return (
    <>
      <Encabezado migas={[{ etiqueta: "Notificaciones" }]} titulo="Notificaciones" />
      {avisos.length === 0 ? <Vacio titulo="No hay avisos.">Todo está al día.</Vacio> : (
        <ul className="space-y-3">
          {[...avisos].sort((a, b) => (a.tono === b.tono ? 0 : a.tono === "rojo" ? -1 : 1)).map((a) => (
            <li key={a.clave}>
              <Link href={a.href} className={`flex items-center justify-between gap-4 rounded-2xl border bg-white px-5 py-4 shadow-sm transition hover:border-sky-300 ${a.tono === "rojo" ? "border-l-4 border-l-red-500" : "border-l-4 border-l-amber-400"}`}>
                <span>
                  <span className="block text-lg font-semibold">{a.titulo}</span>
                  <span className="block text-slate-600">{a.detalle}</span>
                </span>
                <span className={`shrink-0 rounded-full px-3 py-1 text-lg font-bold ${a.tono === "rojo" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-900"}`}>{a.cantidad}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
