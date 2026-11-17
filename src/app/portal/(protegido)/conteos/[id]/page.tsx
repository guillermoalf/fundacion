import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerSesion } from "@/lib/portal/sesion";
import { fecha } from "@/lib/portal/formato";
import Encabezado from "../../../_ui/Encabezado";
import { Insignia } from "../../../_ui/Insignias";
import { estiloBoton, estiloTarjeta } from "../../../_ui/estilos";
import { CerrarConteo, SubirActa } from "../Formularios";
import Contador from "./Contador";
import { cargarConteo } from "../datos";

export const metadata: Metadata = { title: "Conteo" };

export default async function ConteoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { consultar, puedeEscribir } = await obtenerSesion();
  const d = await cargarConteo(consultar, id);
  if (!d) notFound();
  const { c, activos } = d;
  const encontrados = activos.filter((a) => a.encontrado === true).length;
  const faltantes = activos.filter((a) => a.encontrado === false);
  return (
    <>
      <Encabezado
        migas={[{ etiqueta: "Conteo físico", href: "/portal/conteos" }, { etiqueta: `${c.ubicacion} · ${fecha(c.fecha)}` }]}
        titulo={`Conteo: ${c.ubicacion}`}
        descripcion={<>{fecha(c.fecha)} · responsable {c.responsable} · {c.cerrado ? <Insignia tono="verde">Cerrado</Insignia> : <Insignia tono="ambar">En curso</Insignia>}</>}
        acciones={c.cerrado && <Link href={`/portal/conteos/${c.id}/acta`} className={estiloBoton.secundario}>Imprimir acta</Link>}
      />
      {!c.cerrado && puedeEscribir ? (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Contador conteoId={c.id} items={activos.map((a) => ({ id: a.id, placa: a.placa, tipo_bien: a.tipo_bien, encontrado: a.encontrado, nota: a.nota }))} />
          <section className={`${estiloTarjeta} h-fit`}>
            <h2 className="mb-2 text-xl font-semibold">Terminar</h2>
            <p className="mb-3 text-slate-600">{encontrados} de {activos.length} marcados como encontrados.</p>
            <CerrarConteo id={c.id} />
          </section>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className={estiloTarjeta}>
            <h2 className="mb-2 text-xl font-semibold">Resultado</h2>
            <p className="text-lg">{encontrados} encontrados · <strong className={faltantes.length ? "text-red-700" : ""}>{faltantes.length} faltantes</strong></p>
            {faltantes.length > 0 && (
              <ul className="mt-3 space-y-1">
                {faltantes.map((a) => <li key={a.id}><Link className={estiloBoton.enlace} href={`/portal/activos/${a.id}`}>{a.placa ? `Placa ${a.placa}` : "Sin placa"} · {a.tipo_bien}</Link></li>)}
              </ul>
            )}
            {faltantes.length > 0 && <p className="mt-3 text-sm text-slate-600">Si un activo no aparece, márquelo como «Extraviado» en su ficha (o dé de baja con el motivo).</p>}
            {c.observaciones && <p className="mt-3 whitespace-pre-line text-slate-700">{c.observaciones}</p>}
          </section>
          <section className={estiloTarjeta}>
            <h2 className="mb-2 text-xl font-semibold">Acta firmada</h2>
            {c.acta_firmada_url ? (
              <a href={c.acta_firmada_url} target="_blank" className={estiloBoton.secundario}>Ver el acta firmada</a>
            ) : puedeEscribir ? (
              <>
                <p className="mb-3 text-slate-600">Imprima el acta, que la responsable la firme y suba aquí la foto.</p>
                <SubirActa id={c.id} />
              </>
            ) : <p className="text-slate-600">Todavía no se ha subido.</p>}
          </section>
        </div>
      )}
    </>
  );
}
