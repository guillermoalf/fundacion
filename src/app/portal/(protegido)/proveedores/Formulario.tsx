"use client";

import { useActionState } from "react";
import { AreaTexto, BotonEnviar, Campo, Casilla, MensajeError, Seleccion, FormularioAccion } from "../../_ui/Formulario";
import { useAvisoResultado } from "../../_ui/Avisos";
import { crearProveedor, editarProveedor } from "./acciones";
import { TIPOS_PROVEEDOR } from "./tipos";


type V = { id?: number; nombre?: string; cedula_juridica?: string | null; tipo?: string | null; telefono?: string | null; correo?: string | null; es_habitual?: boolean; activo?: boolean; notas?: string | null };

export default function FormularioProveedor({ v = {} }: { v?: V }) {
  const editando = v.id !== undefined;
  const [estado, accion, accionPendiente] = useActionState(editando ? editarProveedor : crearProveedor, null);
  useAvisoResultado(estado, "Proveedor agregado.");
  return (
    <FormularioAccion accion={accion} estado={estado} pendiente={accionPendiente} className="grid gap-4 sm:grid-cols-2">
      {editando && <input type="hidden" name="id" value={v.id} />}
      <Campo etiqueta="Nombre" name="nombre" defaultValue={v.nombre} required />
      <Campo etiqueta="Cédula jurídica" name="cedula_juridica" defaultValue={v.cedula_juridica ?? ""} />
      <Seleccion etiqueta="Tipo" name="tipo" opciones={TIPOS_PROVEEDOR} vacio="—" defaultValue={v.tipo ?? ""} />
      <Campo etiqueta="Teléfono" name="telefono" type="tel" defaultValue={v.telefono ?? ""} />
      <Campo etiqueta="Correo" name="correo" type="email" defaultValue={v.correo ?? ""} />
      <AreaTexto etiqueta="Notas" name="notas" defaultValue={v.notas ?? ""} />
      <Casilla etiqueta="Proveedor habitual" name="es_habitual" defaultChecked={v.es_habitual ?? true} />
      {editando && <Casilla etiqueta="Activo (aparece al registrar compras)" name="activo" defaultChecked={v.activo ?? true} />}
      <div className="sm:col-span-2"><MensajeError estado={estado} /></div>
      <div className="sm:col-span-2"><BotonEnviar>{editando ? "Guardar cambios" : "Agregar proveedor"}</BotonEnviar></div>
    </FormularioAccion>
  );
}
