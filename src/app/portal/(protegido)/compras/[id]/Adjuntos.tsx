"use client";

import { useActionState } from "react";
import { BotonEnviar, CampoArchivos, MensajeError, FormularioAccion } from "../../../_ui/Formulario";
import { useAvisoResultado } from "../../../_ui/Avisos";
import { estiloInput } from "../../../_ui/estilos";
import { adjuntarFactura, ligarActivo } from "../acciones";

export function AdjuntarFactura({ id }: { id: string }) {
  const [estado, accion, accionPendiente] = useActionState(adjuntarFactura, null);
  useAvisoResultado(estado, "Archivos agregados a la factura.");
  return (
    <FormularioAccion accion={accion} estado={estado} pendiente={accionPendiente} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <CampoArchivos etiqueta="PDF, XML o foto de la factura" name="archivos" />
      <MensajeError estado={estado} />
      <BotonEnviar variante="secundario">Adjuntar</BotonEnviar>
    </FormularioAccion>
  );
}

export function LigarActivo({ compraId, lineaId, opciones }: { compraId: string; lineaId: string; opciones: { valor: string; texto: string }[] }) {
  const [estado, accion, accionPendiente] = useActionState(ligarActivo, null);
  useAvisoResultado(estado, "Activo ligado a esta factura.");
  if (opciones.length === 0) return null;
  return (
    <FormularioAccion accion={accion} estado={estado} pendiente={accionPendiente} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="compra_id" value={compraId} />
      <input type="hidden" name="linea_id" value={lineaId} />
      <label className="min-w-[16rem] flex-1 space-y-1.5">
        <span className="block text-sm font-medium text-slate-700">Ligar un activo ya registrado (sin factura)</span>
        <select name="activo_id" required className={estiloInput} defaultValue="">
          <option value="">Elija…</option>
          {opciones.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
        </select>
      </label>
      <BotonEnviar variante="secundario">Ligar</BotonEnviar>
      <div className="w-full"><MensajeError estado={estado} /></div>
    </FormularioAccion>
  );
}
