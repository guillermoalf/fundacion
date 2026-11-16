"use client";

import { useActionState } from "react";
import { AreaTexto, BotonEnviar, Campo, CampoArchivo, FormularioAccion, MensajeError, Seleccion } from "../../_ui/Formulario";
import { useAvisoResultado } from "../../_ui/Avisos";
import { cerrarConteo, iniciarConteo, subirActa } from "./acciones";

type Opcion = { valor: string | number; texto: string };

export function IniciarConteo({ ubicaciones, personal, hoy }: { ubicaciones: Opcion[]; personal: Opcion[]; hoy: string }) {
  const [estado, accion, pendiente] = useActionState(iniciarConteo, null);
  return (
    <FormularioAccion accion={accion} estado={estado} pendiente={pendiente} reiniciar={false} className="grid gap-4 sm:grid-cols-3 sm:items-end">
      <Seleccion etiqueta="Aula o ubicación" name="ubicacion_id" opciones={ubicaciones} vacio="Elija…" required />
      <Seleccion etiqueta="Responsable del aula" name="responsable_id" opciones={personal} vacio="Elija…" required />
      <Campo etiqueta="Fecha" name="fecha" type="date" defaultValue={hoy} required />
      <div className="sm:col-span-3"><MensajeError estado={estado} /></div>
      <div className="sm:col-span-3"><BotonEnviar>Empezar conteo</BotonEnviar></div>
    </FormularioAccion>
  );
}

export function CerrarConteo({ id }: { id: string }) {
  const [estado, accion, pendiente] = useActionState(cerrarConteo, null);
  useAvisoResultado(estado, "Conteo cerrado. Ya puede imprimir el acta.");
  return (
    <FormularioAccion accion={accion} estado={estado} pendiente={pendiente} className="space-y-3"
      onSubmit={(e) => { if (!confirm("¿Cerrar el conteo? Lo que no se marcó queda como «no está» y ya no se puede cambiar.")) e.preventDefault(); }}>
      <input type="hidden" name="id" value={id} />
      <AreaTexto etiqueta="Observaciones (opcional)" name="observaciones" />
      <MensajeError estado={estado} />
      <BotonEnviar>Cerrar conteo</BotonEnviar>
    </FormularioAccion>
  );
}

export function SubirActa({ id }: { id: string }) {
  const [estado, accion, pendiente] = useActionState(subirActa, null);
  useAvisoResultado(estado, "Acta firmada guardada.");
  return (
    <FormularioAccion accion={accion} estado={estado} pendiente={pendiente} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <CampoArchivo etiqueta="Foto o PDF del acta firmada" name="acta" required />
      <MensajeError estado={estado} />
      <BotonEnviar>Subir acta firmada</BotonEnviar>
    </FormularioAccion>
  );
}
