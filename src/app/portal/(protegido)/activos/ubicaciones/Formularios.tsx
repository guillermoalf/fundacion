"use client";

import { useActionState } from "react";
import { BotonEnviar, Campo, FormularioAccion, MensajeError } from "../../../_ui/Formulario";
import { useAvisoResultado } from "../../../_ui/Avisos";
import { COLORES_UBICACION } from "@/lib/portal/ubicaciones";
import { cambiarColorUbicacion, crearUbicacion } from "../acciones";

/** Botones de colores: tocar uno lo guarda de una vez. */
function Colores({ actual, nombreCampo = "color" }: { actual: string; nombreCampo?: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLORES_UBICACION.map((c) => (
        <button key={c.valor} type="submit" name={nombreCampo} value={c.valor} title={c.nombre} aria-label={c.nombre} aria-pressed={c.valor === actual}
          className={`h-9 w-9 rounded-full ring-offset-2 ${c.valor === actual ? "ring-2 ring-slate-900" : "hover:ring-2 hover:ring-slate-300"}`} style={{ background: c.valor }} />
      ))}
    </div>
  );
}

export function ColorUbicacion({ id, actual }: { id: number; actual: string }) {
  const [estado, accion, pendiente] = useActionState(cambiarColorUbicacion, null);
  useAvisoResultado(estado, "Color guardado.");
  return (
    <FormularioAccion accion={accion} estado={estado} pendiente={pendiente}>
      <input type="hidden" name="id" value={id} />
      <Colores actual={actual} />
      <MensajeError estado={estado} />
    </FormularioAccion>
  );
}

export function NuevaUbicacion() {
  const [estado, accion, pendiente] = useActionState(crearUbicacion, null);
  useAvisoResultado(estado, "Ubicación agregada.");
  return (
    <FormularioAccion accion={accion} estado={estado} pendiente={pendiente} className="flex flex-wrap items-end gap-3">
      <div className="min-w-0 flex-1"><Campo etiqueta="Nueva ubicación" name="nombre" required /></div>
      <BotonEnviar>Agregar</BotonEnviar>
      <MensajeError estado={estado} />
    </FormularioAccion>
  );
}
