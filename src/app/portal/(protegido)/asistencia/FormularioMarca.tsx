"use client";

import { useActionState } from "react";
import { AreaTexto, BotonEnviar, Campo, CampoArchivo, FormularioAccion, MensajeError, Seleccion } from "../../_ui/Formulario";
import { useAvisoResultado } from "../../_ui/Avisos";
import { marcaManual } from "./acciones";

export default function FormularioMarca({ personal, ahora }: { personal: { valor: string; texto: string }[]; ahora: string }) {
  const [estado, accion, pendiente] = useActionState(marcaManual, null);
  useAvisoResultado(estado, "Marca registrada.");
  return (
    <FormularioAccion accion={accion} estado={estado} pendiente={pendiente} className="grid gap-4 sm:grid-cols-2">
      <Seleccion etiqueta="Persona" name="empleado_id" opciones={personal} vacio="Elija…" required />
      <Seleccion etiqueta="Tipo" name="tipo" opciones={[{ valor: "entrada", texto: "Entrada" }, { valor: "salida", texto: "Salida" }]} required />
      <Campo etiqueta="Fecha y hora (según la hoja)" name="marcado_en" type="datetime-local" defaultValue={ahora} required />
      <CampoArchivo etiqueta="Foto de la hoja firmada" name="documento" ayuda="Sin la foto la marca queda como «manual»." />
      <AreaTexto etiqueta="Motivo" name="motivo_manual" required placeholder="Ej.: no había internet, se usó la hoja en papel" className="sm:col-span-2" />
      <div className="sm:col-span-2"><MensajeError estado={estado} /></div>
      <div className="sm:col-span-2"><BotonEnviar>Registrar marca</BotonEnviar></div>
    </FormularioAccion>
  );
}
