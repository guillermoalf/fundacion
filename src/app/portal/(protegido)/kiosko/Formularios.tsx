"use client";

import { useActionState } from "react";
import { BotonEnviar, Campo, FormularioAccion, MensajeError } from "../../_ui/Formulario";
import { useAvisoResultado } from "../../_ui/Avisos";
import { estiloBoton } from "../../_ui/estilos";
import { cambiarTablet, registrarTablet } from "./acciones";

export function RegistrarTablet() {
  const [estado, accion, pendiente] = useActionState(registrarTablet, null);
  useAvisoResultado(estado, "Tablet registrada. Ya puede abrir /marcar en ella.");
  return (
    <FormularioAccion accion={accion} estado={estado} pendiente={pendiente} className="space-y-4">
      <Campo etiqueta="Nombre de esta tablet" name="nombre" required placeholder="Ej.: Tablet de la entrada" />
      <MensajeError estado={estado} />
      <BotonEnviar>Registrar esta tablet</BotonEnviar>
      {estado?.ok && <a href="/marcar" className={`${estiloBoton.primario} ml-2`}>Abrir el kiosko →</a>}
    </FormularioAccion>
  );
}

export function BotonTablet({ id, activo }: { id: string; activo: boolean }) {
  const [estado, accion, pendiente] = useActionState(cambiarTablet, null);
  useAvisoResultado(estado, activo ? "Tablet desactivada: ya no puede marcar." : "Tablet activada.");
  return (
    <FormularioAccion key={String(activo)} accion={accion} estado={estado} pendiente={pendiente}
      onSubmit={(e) => { if (activo && !confirm("¿Desactivar esta tablet? Ya no se podrá marcar en ella.")) e.preventDefault(); }}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="activo" value={String(!activo)} />
      <BotonEnviar variante={activo ? "peligro" : "secundario"}>{activo ? "Desactivar" : "Activar"}</BotonEnviar>
    </FormularioAccion>
  );
}
