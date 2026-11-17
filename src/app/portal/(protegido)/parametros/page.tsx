import type { Metadata } from "next";
import { obtenerSesion } from "@/lib/portal/sesion";
import { cantidad, colones, fecha, hoyCR } from "@/lib/portal/formato";
import Encabezado from "../../_ui/Encabezado";
import { Insignia } from "../../_ui/Insignias";
import { estiloTarjeta } from "../../_ui/estilos";
import { NuevoParametro, NuevosTramos } from "./Formularios";

export const metadata: Metadata = { title: "Parámetros legales" };

const NOMBRES: Record<string, string> = {
  ccss_patronal_pct: "CCSS patronal (%)", ccss_obrero_pct: "CCSS obrera (%)", aguinaldo_divisor: "Divisor del aguinaldo",
  vacaciones_dias_habiles_anuales: "Días de vacaciones por año", incapacidad_ccss_patrono_pct_dias_1_3: "Incapacidad CCSS: % que paga el patrono (días 1–3)",
  licencia_maternidad_patrono_pct: "Licencia de maternidad: % que paga el patrono", tardia_tolerancia_min: "Tolerancia de tardía (minutos)",
};

export default async function ParametrosPage() {
  const { consultar, esAdmin, perfil } = await obtenerSesion();
  const hoy = hoyCR();
  const { parametros, tramos } = await consultar(async (tx) => ({
    parametros: await tx.selectFrom("parametros").selectAll().orderBy("clave").orderBy("vigente_desde", "desc").execute(),
    tramos: await tx.selectFrom("tramos_renta").selectAll().orderBy("vigente_desde", "desc").orderBy("desde").execute(),
  }));
  const juegos = [...new Set(tramos.map((t) => t.vigente_desde))];
  const vigente = juegos.find((j) => j <= hoy);
  const anioSiguiente = Number(hoy.slice(0, 4)) + 1;
  const editaParametros = perfil?.rol === "admin" || perfil?.rol === "contabilidad";

  return (
    <>
      <Encabezado migas={[{ etiqueta: "Parámetros legales" }]} titulo="Parámetros legales" descripcion="Tasas y valores de ley que usa la planilla. Cada cambio rige desde una fecha: los cálculos de meses anteriores no cambian." />
      <div className="space-y-8">
        <section className={`${estiloTarjeta} space-y-4`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-semibold">Impuesto sobre la renta al salario</h2>
            {vigente ? <Insignia tono="verde">Vigentes desde {fecha(vigente)}</Insignia> : <Insignia tono="rojo">Falta cargar tramos</Insignia>}
          </div>
          {!vigente && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-red-800">Falta cargar los tramos vigentes: mientras tanto la planilla deja la renta en ₡0 y hay que digitarla a mano.</p>}
          {juegos.map((j) => (
            <div key={j}>
              <p className="mb-1 font-semibold">Desde {fecha(j)} · {tramos.find((t) => t.vigente_desde === j)?.fuente_legal}</p>
              <ul className="space-y-0.5 text-base tabular-nums">
                {tramos.filter((t) => t.vigente_desde === j).map((t) => (
                  <li key={t.desde}>{t.hasta === null ? `Más de ${colones(t.desde)}` : `De ${colones(t.desde)} a ${colones(t.hasta)}`}: <strong>{cantidad(t.tasa)} %</strong></li>
                ))}
              </ul>
            </div>
          ))}
          {esAdmin && (
            <details className="rounded-xl border border-slate-200 p-4">
              <summary className="cursor-pointer font-medium text-sky-700">Cargar los tramos de otro año</summary>
              <div className="mt-4"><NuevosTramos anio={anioSiguiente} /></div>
            </details>
          )}
        </section>

        <section className={`${estiloTarjeta} space-y-4`}>
          <h2 className="text-xl font-semibold">Otros parámetros</h2>
          <ul className="divide-y divide-slate-100">
            {parametros.map((p) => {
              const actual = parametros.find((x) => x.clave === p.clave && x.vigente_desde <= hoy) === p;
              return (
                <li key={`${p.clave}-${p.vigente_desde}`} className={`flex flex-wrap justify-between gap-2 py-2 ${actual ? "" : "text-slate-500"}`}>
                  <span>{NOMBRES[p.clave] ?? p.clave} {actual && <Insignia tono="verde">vigente</Insignia>}{p.vigente_desde > hoy && <Insignia tono="azul">futuro</Insignia>}</span>
                  <span className="tabular-nums"><strong>{cantidad(p.valor)}</strong> desde {fecha(p.vigente_desde)}{p.fuente_legal ? ` · ${p.fuente_legal}` : ""}</span>
                </li>
              );
            })}
          </ul>
          {editaParametros && (
            <details className="rounded-xl border border-slate-200 p-4">
              <summary className="cursor-pointer font-medium text-sky-700">Agregar un valor nuevo (por ejemplo, las tasas de la CCSS del próximo año)</summary>
              <div className="mt-4"><NuevoParametro hoy={hoy} claves={[...new Set(parametros.map((p) => p.clave))].map((c) => ({ valor: c, texto: NOMBRES[c] ?? c }))} /></div>
            </details>
          )}
        </section>
      </div>
    </>
  );
}
