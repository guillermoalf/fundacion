import type { Metadata } from "next";
import { obtenerSesion } from "@/lib/portal/sesion";
import { fechaHora } from "@/lib/portal/formato";
import Encabezado from "../../_ui/Encabezado";
import SinPermiso from "../../_ui/SinPermiso";
import { Insignia } from "../../_ui/Insignias";
import { estiloTarjeta } from "../../_ui/estilos";
import { BotonTablet, RegistrarTablet } from "./Formularios";

export const metadata: Metadata = { title: "Kiosko de asistencia" };

export default async function KioskoPage() {
  const { consultar, esAdmin } = await obtenerSesion();
  if (!esAdmin) return <SinPermiso que="el registro de tablets del kiosko" />;
  const tablets = await consultar((tx) => tx.selectFrom("dispositivos_kiosko").select(["id", "nombre", "activo", "ultimo_uso", "creado_en"]).orderBy("creado_en", "desc").execute());
  return (
    <>
      <Encabezado
        migas={[{ etiqueta: "Kiosko de asistencia" }]}
        titulo="Kiosko de asistencia"
        descripcion="La tablet de la entrada abre /marcar: cada persona toca su foto, digita su PIN y elige Entrada o Salida. Solo funcionan las tablets registradas aquí."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className={`${estiloTarjeta} space-y-3`}>
          <h2 className="text-xl font-semibold">Registrar una tablet</h2>
          <ol className="list-decimal space-y-1 pl-5 text-slate-700">
            <li>Abra el portal <strong>en la tablet</strong> e ingrese con su usuario.</li>
            <li>Venga a esta pantalla y registre la tablet.</li>
            <li>Abra <strong>/marcar</strong> y cierre su sesión del portal (el kiosko sigue funcionando).</li>
          </ol>
          <RegistrarTablet />
        </section>
        <section className={`${estiloTarjeta} space-y-3`}>
          <h2 className="text-xl font-semibold">Tablets registradas</h2>
          {tablets.length === 0 ? <p className="text-slate-600">Ninguna todavía.</p> : (
            <ul className="divide-y divide-slate-100">
              {tablets.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-semibold">{t.nombre} <Insignia tono={t.activo ? "verde" : "gris"}>{t.activo ? "Activa" : "Inactiva"}</Insignia></p>
                    <p className="text-sm text-slate-500">Último uso: {fechaHora(t.ultimo_uso) ?? "nunca"}</p>
                  </div>
                  <BotonTablet id={t.id} activo={t.activo} />
                </li>
              ))}
            </ul>
          )}
          <p className="text-sm text-slate-500">Si una tablet se pierde o se la roban, desactívela: deja de poder marcar al instante.</p>
        </section>
      </div>
    </>
  );
}
