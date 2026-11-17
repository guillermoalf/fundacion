"use client";

import { useActionState } from "react";
import { BotonEnviar, Campo, MensajeError, FormularioAccion } from "../../_ui/Formulario";
import { useAvisoResultado } from "../../_ui/Avisos";
import { estiloBoton } from "../../_ui/estilos";
import { cambiarActiva, crearCategoria, editarCategoria } from "./acciones";

type V = { id?: number; nombre?: string; tasa_anual?: string; anios_vida?: number; referencia?: string; palabras_clave?: string[] };

export function FormularioCategoria({ v = {}, enUso = 0 }: { v?: V; enUso?: number }) {
  const editando = v.id !== undefined;
  const [estado, accion, accionPendiente] = useActionState(editando ? editarCategoria : crearCategoria, null);
  useAvisoResultado(estado, "Fila agregada a la tabla.");
  const bloqueada = editando && enUso > 0;
  return (
    <FormularioAccion accion={accion} estado={estado} pendiente={accionPendiente} className="grid gap-4 sm:grid-cols-2">
      {editando && <input type="hidden" name="id" value={v.id} />}
      <Campo etiqueta="Nombre de la fila" name="nombre" defaultValue={v.nombre} required className="sm:col-span-2" placeholder="Ej.: Instrumentos musicales" />
      <Campo etiqueta="Tasa anual (%)" name="tasa_anual" inputMode="decimal" defaultValue={v.tasa_anual} required readOnly={bloqueada} />
      <Campo etiqueta="Años de vida útil" name="anios_vida" inputMode="numeric" defaultValue={v.anios_vida} required readOnly={bloqueada} />
      {bloqueada && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-amber-900 sm:col-span-2">
          La tasa y los años no se pueden cambiar porque {enUso} {enUso === 1 ? "activo usa" : "activos usan"} esta fila (cambiaría reportes ya entregados).
          Para otra tasa, cree una fila nueva y reasigne los activos.
        </p>
      )}
      <Campo etiqueta="Referencia" name="referencia" defaultValue={v.referencia ?? "Anexo 2 RLISR"} className="sm:col-span-2" />
      <Campo
        etiqueta="Palabras clave"
        name="palabras_clave"
        defaultValue={v.palabras_clave?.join(", ")}
        className="sm:col-span-2"
        ayuda="Separadas por comas. Al importar un Excel, si el nombre del bien tiene una de estas palabras se sugiere esta fila."
      />
      <div className="sm:col-span-2"><MensajeError estado={estado} /></div>
      <div className="sm:col-span-2"><BotonEnviar>{editando ? "Guardar cambios" : "Agregar fila"}</BotonEnviar></div>
    </FormularioAccion>
  );
}

export function BotonActiva({ id, activa }: { id: number; activa: boolean }) {
  const [estado, accion, accionPendiente] = useActionState(cambiarActiva, null);
  useAvisoResultado(estado, activa ? "Fila retirada: ya no se ofrece para activos nuevos." : "Fila disponible otra vez.");
  return (
    <FormularioAccion accion={accion} estado={estado} pendiente={accionPendiente} key={String(activa)} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="activa" value={String(!activa)} />
      <MensajeError estado={estado} />
      <button type="submit" className={estiloBoton.secundario}>{activa ? "Retirar esta fila" : "Volver a usar esta fila"}</button>
    </FormularioAccion>
  );
}
