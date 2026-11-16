"use client";

import { useActionState } from "react";
import { BotonEnviar, Campo, FormularioAccion, MensajeError } from "../../_ui/Formulario";
import { useAvisoResultado } from "../../_ui/Avisos";
import { ajustarLinea, cambiarEstadoPlanilla, generarAguinaldo, generarMensual } from "./acciones";

export function GenerarMensual({ mes }: { mes: string }) {
  const [estado, accion, pendiente] = useActionState(generarMensual, null);
  return (
    <FormularioAccion accion={accion} estado={estado} pendiente={pendiente} reiniciar={false} className="flex flex-wrap items-end gap-3">
      <Campo etiqueta="Mes" name="mes" type="month" defaultValue={mes} required />
      <BotonEnviar pendiente="Calculando…">Generar planilla del mes</BotonEnviar>
      <div className="w-full"><MensajeError estado={estado} /></div>
    </FormularioAccion>
  );
}

export function GenerarAguinaldo({ anio }: { anio: number }) {
  const [estado, accion, pendiente] = useActionState(generarAguinaldo, null);
  return (
    <FormularioAccion accion={accion} estado={estado} pendiente={pendiente} reiniciar={false} className="flex flex-wrap items-end gap-3">
      <Campo etiqueta="Año" name="anio" type="number" defaultValue={anio} required />
      <BotonEnviar variante="secundario" pendiente="Calculando…">Generar aguinaldo</BotonEnviar>
      <div className="w-full"><MensajeError estado={estado} /></div>
    </FormularioAccion>
  );
}

export function AjusteLinea({ planillaId, empleadoId, v }: { planillaId: string; empleadoId: string; v: Record<string, string> }) {
  const [estado, accion, pendiente] = useActionState(ajustarLinea, null);
  useAvisoResultado(estado, "Línea recalculada.");
  return (
    <FormularioAccion accion={accion} estado={estado} pendiente={pendiente} reiniciar={false} className="grid grid-cols-2 gap-3 sm:grid-cols-5 sm:items-end">
      <input type="hidden" name="planilla_id" value={planillaId} />
      <input type="hidden" name="empleado_id" value={empleadoId} />
      <Campo etiqueta="Horas extra (₡)" name="monto_horas_extra" id={`he-${empleadoId}`} inputMode="decimal" defaultValue={v.monto_horas_extra} />
      <Campo etiqueta="Rebajo tardías (₡)" name="rebajo_tardias" id={`rt-${empleadoId}`} inputMode="decimal" defaultValue={v.rebajo_tardias} />
      <Campo etiqueta="Renta (₡)" name="impuesto_renta" id={`ir-${empleadoId}`} inputMode="decimal" defaultValue={v.impuesto_renta} />
      <Campo etiqueta="Otras deducciones (₡)" name="otras_deducciones" id={`od-${empleadoId}`} inputMode="decimal" defaultValue={v.otras_deducciones} />
      <BotonEnviar variante="secundario" pendiente="…">Recalcular</BotonEnviar>
      <div className="col-span-2 sm:col-span-5"><MensajeError estado={estado} /></div>
    </FormularioAccion>
  );
}

const TEXTOS = {
  aprobada: ["Aprobar planilla", "¿Aprobar la planilla? Después ya no se pueden cambiar los montos.", "primario"],
  pagada: ["Marcar como pagada", "¿Confirmar que la planilla ya se pagó?", "primario"],
  anulada: ["Anular", "¿Anular esta planilla? Queda registrada como anulada (no se borra).", "peligro"],
} as const;

export function BotonEstado({ id, estado: nuevo }: { id: string; estado: keyof typeof TEXTOS }) {
  const [estado, accion, pendiente] = useActionState(cambiarEstadoPlanilla, null);
  useAvisoResultado(estado, "Listo.");
  const [texto, confirmar, variante] = TEXTOS[nuevo];
  return (
    <FormularioAccion accion={accion} estado={estado} pendiente={pendiente} onSubmit={(e) => { if (!confirm(confirmar)) e.preventDefault(); }}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="estado" value={nuevo} />
      <BotonEnviar variante={variante}>{texto}</BotonEnviar>
      <MensajeError estado={estado} />
    </FormularioAccion>
  );
}
