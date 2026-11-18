"use client";

import { useActionState, useState } from "react";
import { AreaTexto, BotonEnviar, Campo, CampoArchivo, MensajeError, Seleccion, FormularioAccion } from "../../../_ui/Formulario";
import { useAvisoResultado } from "../../../_ui/Avisos";
import { estiloBoton } from "../../../_ui/estilos";
import { darDeBaja, trasladarActivo } from "../acciones";

export function Traslado({ id, ubicaciones, hoy, primera = false }: { id: string; ubicaciones: { valor: number; texto: string }[]; hoy: string; primera?: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const [estado, accion, accionPendiente] = useActionState(trasladarActivo, null);
  useAvisoResultado(estado, "Traslado registrado.");
  if (!abierto) return <button type="button" className={primera ? estiloBoton.primario : estiloBoton.secundario} onClick={() => setAbierto(true)}>{primera ? "Asignar ubicación" : "Trasladar a otra ubicación"}</button>;
  return (
    <FormularioAccion accion={accion} estado={estado} pendiente={accionPendiente} className="space-y-4" key={estado?.ok ? "ok" : "f"}>
      <input type="hidden" name="id" value={id} />
      <Seleccion etiqueta="¿A dónde va?" name="destino" opciones={ubicaciones} vacio="Elija…" required />
      <Campo etiqueta="Fecha" name="fecha" type="date" defaultValue={hoy} required />
      <AreaTexto etiqueta="Motivo" name="motivo" required defaultValue={primera ? "Primera ubicación del activo" : undefined} placeholder="Ej.: se cambió de aula por remodelación" />
      <CampoArchivo etiqueta="Documento (opcional)" name="documento" />
      <MensajeError estado={estado} />
      <div className="flex gap-2">
        <BotonEnviar>{primera ? "Guardar ubicación" : "Registrar traslado"}</BotonEnviar>
        <button type="button" className={estiloBoton.secundario} onClick={() => setAbierto(false)}>Cancelar</button>
      </div>
    </FormularioAccion>
  );
}

export function Baja({ id, hoy }: { id: string; hoy: string }) {
  const [abierto, setAbierto] = useState(false);
  const [estado, accion, accionPendiente] = useActionState(darDeBaja, null);
  useAvisoResultado(estado, "El activo quedó dado de baja.");
  if (!abierto) return <button type="button" className={estiloBoton.peligro} onClick={() => setAbierto(true)}>Dar de baja</button>;
  return (
    <FormularioAccion
      accion={accion} estado={estado} pendiente={accionPendiente}
      onSubmit={(e) => { if (!confirm("¿Dar de baja este activo? No se puede deshacer: queda en el historial con el motivo.")) e.preventDefault(); }}
      className="space-y-4 rounded-xl border border-red-200 bg-red-50 p-4"
    >
      <input type="hidden" name="id" value={id} />
      <p className="text-base text-red-900">El activo no se borra: deja de contarse en los reportes desde esta fecha y queda en el historial.</p>
      <Campo etiqueta="Fecha de la baja" name="fecha" type="date" defaultValue={hoy} required />
      <AreaTexto etiqueta="Motivo" name="motivo" required placeholder="Ej.: se dañó sin reparación posible; acta n.º…" />
      <CampoArchivo etiqueta="Acta o respaldo (opcional)" name="documento" />
      <MensajeError estado={estado} />
      <div className="flex gap-2">
        <BotonEnviar variante="peligro">Confirmar la baja</BotonEnviar>
        <button type="button" className={estiloBoton.secundario} onClick={() => setAbierto(false)}>Cancelar</button>
      </div>
    </FormularioAccion>
  );
}
