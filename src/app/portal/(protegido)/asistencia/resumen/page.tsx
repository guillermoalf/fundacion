import type { Metadata } from "next";
import { obtenerSesion } from "@/lib/portal/sesion";
import { resumenAsistenciaMes } from "@/lib/portal/asistencia";
import { cantidad, fecha, hoyCR, mesLargo } from "@/lib/portal/formato";
import Encabezado from "../../../_ui/Encabezado";
import Vacio from "../../../_ui/Vacio";
import { Insignia } from "../../../_ui/Insignias";
import { estiloBoton, estiloEtiqueta, estiloInput, estiloTarjeta } from "../../../_ui/estilos";

export const metadata: Metadata = { title: "Tardías y horas" };

export default async function ResumenAsistenciaPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const sp = await searchParams;
  const mes = /^\d{4}-\d{2}$/.test(sp.mes ?? "") ? sp.mes! : hoyCR().slice(0, 7);
  const { consultar } = await obtenerSesion();
  const { tolerancia, filas } = await consultar((tx) => resumenAsistenciaMes(tx, mes));
  return (
    <>
      <Encabezado
        migas={[{ etiqueta: "Asistencia", href: "/portal/asistencia" }, { etiqueta: "Tardías y horas" }]}
        titulo={`Tardías y horas de ${mesLargo(mes)}`}
        descripcion={tolerancia === null ? "Falta el parámetro de tolerancia de tardías: no se pueden calcular." : `Se cuenta tardía cuando la primera entrada del día pasa más de ${tolerancia} minutos de la hora del horario.`}
      />
      <form className="mb-6 flex flex-wrap items-end gap-3">
        <label className="space-y-1.5"><span className={estiloEtiqueta}>Mes</span><input type="month" name="mes" defaultValue={mes} className={estiloInput} /></label>
        <button type="submit" className={estiloBoton.secundario}>Ver</button>
      </form>
      {filas.length === 0 ? <Vacio titulo="No hay personal activo." /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filas.map((f) => (
            <section key={f.empleadoId} className={estiloTarjeta}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">{f.nombre}</h2>
                <Insignia tono={f.tardias.length ? "ambar" : "verde"}>{f.tardias.length} {f.tardias.length === 1 ? "tardía" : "tardías"}</Insignia>
              </div>
              <p className="mt-1 text-slate-600">{cantidad(f.horas)} horas en {f.diasConMarca} días con marcas{f.minutosTarde ? ` · ${f.minutosTarde} min tarde en total` : ""}</p>
              {f.tardias.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-base">
                  {f.tardias.map((t) => <li key={t.fecha}>{fecha(t.fecha)}: llegó {t.horaMarcada} (entrada {t.horaEsperada}) · {t.minutosTarde} min</li>)}
                </ul>
              )}
              {f.diasInconsistentes.length > 0 && (
                <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Marcas sin pareja (entrada sin salida o al revés) el {f.diasInconsistentes.map(fecha).join(", ")}: esas horas pueden estar incompletas. Revise la hoja en papel.
                </p>
              )}
            </section>
          ))}
        </div>
      )}
    </>
  );
}
