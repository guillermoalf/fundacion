"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { BotonEnviar, MensajeError, Seleccion, FormularioAccion } from "../../../_ui/Formulario";
import { CeldaConAyuda } from "../../../_ui/Tabla";
import { estiloBoton, estiloEtiqueta } from "../../../_ui/estilos";
import { colones, fecha } from "@/lib/portal/formato";
import { confirmar, previsualizar } from "./acciones";

/** Dato que no viene en el Excel. */
const SIN = <span className="text-slate-400">—</span>;

export default function Importador({ fuentes }: { fuentes: { valor: string; texto: string }[] }) {
  const [vista, accionVista, accionVistaPendiente] = useActionState(previsualizar, null);
  const [guardado, accionGuardar, accionGuardarPendiente] = useActionState(confirmar, null);
  const [soloPendientes, setSoloPendientes] = useState(false);

  if (guardado?.ok) {
    return (
      <div className="space-y-4 rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-6">
        <p className="text-xl font-semibold text-emerald-900">Listo: se guardaron {guardado.activos} activos.</p>
        {guardado.ubicacionesCreadas.length > 0 && <p className="text-emerald-900">Ubicaciones nuevas: {guardado.ubicacionesCreadas.join(", ")}.</p>}
        <div className="flex flex-wrap gap-2">
          <Link href="/portal/activos" className={estiloBoton.primario}>Ver los activos</Link>
          <Link href="/portal/pendientes" className={estiloBoton.secundario}>Ver qué falta completar</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FormularioAccion accion={accionVista} estado={vista} pendiente={accionVistaPendiente} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="space-y-1.5">
          <label htmlFor="archivo" className={estiloEtiqueta}>Archivo de Excel (.xlsx) <span className="text-red-600">*</span></label>
          <input id="archivo" name="archivo" type="file" accept=".xlsx" required className="block w-full text-base file:mr-3 file:rounded-xl file:border-0 file:bg-sky-50 file:px-4 file:py-2.5 file:font-semibold file:text-sky-700" />
        </div>
        <Seleccion etiqueta="¿Con qué se compraron?" name="fuente" opciones={fuentes} defaultValue="PANI" required />
        <BotonEnviar pendiente="Leyendo…">Ver vista previa</BotonEnviar>
        <div className="sm:col-span-3"><MensajeError estado={vista} /></div>
      </FormularioAccion>

      {vista?.ok && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              ["Activos a registrar", String(vista.resumen.activos)],
              ["Con algo pendiente", String(vista.resumen.conPendientes)],
              ["Costo registrado", colones(vista.resumen.costoRegistrado)],
              ["Valor en libros hoy", colones(vista.resumen.valorLibros)],
            ].map(([t, v]) => (
              <div key={t} className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-500">{t}</p>
                <p className="text-2xl font-bold">{v}</p>
              </div>
            ))}
          </div>
          {vista.resumen.costoSumadoEnArchivo !== vista.resumen.costoRegistrado && (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-amber-900">
              El Excel sumaba {colones(vista.resumen.costoSumadoEnArchivo)}: algunas filas tenían el costo de varias unidades juntas y se dividió entre ellas.
            </p>
          )}
          <label className="flex items-center gap-2 text-base">
            <input type="checkbox" checked={soloPendientes} onChange={(e) => setSoloPendientes(e.target.checked)} className="h-5 w-5" /> Ver solo los que tienen pendientes
          </label>
          <div className="max-h-[32rem] overflow-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-slate-600">
                <tr>{["Fila en el Excel", "Ubicación", "Tipo de bien", "Marca", "Modelo", "Serie", "Placa", "Fecha de adquisición", "Costo", "Depreciación acumulada", "Valor en libros", "Categoría", "Pendientes"].map((t) => <th key={t} className="whitespace-nowrap px-3 py-2 font-semibold">{t}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vista.filas.filter((f) => !soloPendientes || f.pendientes.length).map((f, i) => (
                  <tr key={i} className="align-top">
                    <td className="px-3 py-2 text-slate-500">{f.filaOrigen}</td>
                    <td className="px-3 py-2">{f.ubicacion ?? SIN}</td>
                    <td className="px-3 py-2">{f.tipoBien ?? SIN}</td>
                    <td className="px-3 py-2">{f.marca ?? SIN}</td>
                    <td className="px-3 py-2">{f.modelo ?? SIN}</td>
                    <td className="px-3 py-2">{f.serie ?? SIN}</td>
                    <td className="px-3 py-2">{f.placa ?? SIN}</td>
                    <td className="whitespace-nowrap px-3 py-2">{fecha(f.fechaAdquisicion) ?? SIN}{f.fechaAproximada && " (aprox.)"}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{colones(f.costo) ?? SIN}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{colones(f.depreciacionAcumulada) ?? SIN}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{colones(f.valorLibros) ?? SIN}</td>
                    <td className="px-3 py-2">{f.categoria?.nombre ?? SIN}</td>
                    <td className="whitespace-nowrap px-3 py-2">{f.pendientes.length ? <CeldaConAyuda texto={f.pendientes.length === 1 ? "1 pendiente" : `${f.pendientes.length} pendientes`} tono="ambar" ayuda={f.pendientes} /> : SIN}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <FormularioAccion accion={accionGuardar} estado={guardado} pendiente={accionGuardarPendiente} className="space-y-3">
            <input type="hidden" name="filas" value={JSON.stringify(vista.filas)} />
            <input type="hidden" name="fuente" value={vista.fuente} />
            <input type="hidden" name="archivo" value={vista.archivo} />
            {guardado?.duplicado && <input type="hidden" name="forzar" value="true" />}
            <MensajeError estado={guardado} />
            {guardado?.duplicado && <p className="text-base text-slate-700">Si de verdad es otro archivo con el mismo nombre, presione de nuevo para importarlo igual.</p>}
            <BotonEnviar pendiente="Guardando…">{guardado?.duplicado ? "Importar de todos modos" : `Confirmar y guardar ${vista.resumen.activos} activos`}</BotonEnviar>
            <p className="text-sm text-slate-500">Los datos que faltan no se inventan: quedan vacíos y aparecen en Pendientes para completarlos después.</p>
          </FormularioAccion>
        </div>
      )}
    </div>
  );
}
