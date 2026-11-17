"use client";

import { useActionState } from "react";
import { BotonEnviar, Campo, FormularioAccion, MensajeError, Seleccion } from "../../_ui/Formulario";
import { useAvisoResultado } from "../../_ui/Avisos";
import { estiloInput } from "../../_ui/estilos";
import { agregarParametro, guardarTramos } from "./acciones";

export function NuevoParametro({ claves, hoy }: { claves: { valor: string; texto: string }[]; hoy: string }) {
  const [estado, accion, pendiente] = useActionState(agregarParametro, null);
  useAvisoResultado(estado, "Parámetro guardado.");
  return (
    <FormularioAccion accion={accion} estado={estado} pendiente={pendiente} className="grid gap-4 sm:grid-cols-2">
      <Seleccion etiqueta="Parámetro" name="clave" opciones={claves} vacio="Elija…" required />
      <Campo etiqueta="Valor nuevo" name="valor" inputMode="decimal" required />
      <Campo etiqueta="Rige desde" name="vigente_desde" type="date" defaultValue={hoy} required />
      <Campo etiqueta="Respaldo legal" name="fuente_legal" placeholder="Ej.: CCSS, acuerdo de Junta Directiva 2027" />
      <div className="sm:col-span-2"><MensajeError estado={estado} /></div>
      <div className="sm:col-span-2"><BotonEnviar>Guardar</BotonEnviar></div>
    </FormularioAccion>
  );
}

export function NuevosTramos({ anio }: { anio: number }) {
  const [estado, accion, pendiente] = useActionState(guardarTramos, null);
  useAvisoResultado(estado, "Tramos guardados.");
  return (
    <FormularioAccion accion={accion} estado={estado} pendiente={pendiente} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Rigen desde" name="vigente_desde" type="date" defaultValue={`${anio}-01-01`} required />
        <Campo etiqueta="Decreto de Hacienda" name="fuente_legal" required placeholder="Ej.: Decreto Ejecutivo 4XXXX-H" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-base">
          <thead className="text-sm text-slate-600"><tr><th className="text-left">Desde (₡)</th><th className="text-left">Hasta (₡)</th><th className="text-left">Tasa (%)</th></tr></thead>
          <tbody>
            {Array.from({ length: 6 }, (_, i) => (
              <tr key={i}>
                <td className="py-1 pr-2"><input name={`desde_${i}`} inputMode="decimal" aria-label={`Tramo ${i + 1} desde`} className={estiloInput} defaultValue={i === 0 ? "0" : ""} /></td>
                <td className="py-1 pr-2"><input name={`hasta_${i}`} inputMode="decimal" aria-label={`Tramo ${i + 1} hasta`} className={estiloInput} placeholder={i > 0 ? "vacío = en adelante" : ""} /></td>
                <td className="py-1"><input name={`tasa_${i}`} inputMode="decimal" aria-label={`Tramo ${i + 1} tasa`} className={estiloInput} defaultValue={i === 0 ? "0" : ""} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-slate-500">Montos mensuales. Cada tramo termina donde empieza el siguiente; el último queda sin «hasta». Si ya existe un juego con esa misma fecha, se corrige.</p>
      <MensajeError estado={estado} />
      <BotonEnviar>Guardar tramos</BotonEnviar>
    </FormularioAccion>
  );
}
