"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { AreaTexto, BotonEnviar, Campo, FormularioAccion, MensajeError, Seleccion } from "../../_ui/Formulario";
import { useAviso, useAvisoResultado } from "../../_ui/Avisos";
import { estiloBoton } from "../../_ui/estilos";
import { diasHabiles } from "@/lib/calculos/planilla";
import { anularSolicitud, resolverSolicitud, solicitarVacaciones } from "./acciones";

export function FormularioSolicitud({ hoy, personas, disponibles }: { hoy: string; personas?: { valor: string; texto: string }[]; disponibles?: number | null }) {
  const [estado, accion, pendiente] = useActionState(solicitarVacaciones, null);
  useAvisoResultado(estado, "Solicitud enviada. La dirección la revisará.");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  useEffect(() => { if (estado?.ok) { setDesde(""); setHasta(""); } }, [estado]);
  const dias = desde && hasta && hasta >= desde ? diasHabiles(desde, hasta) : null;
  return (
    <FormularioAccion accion={accion} estado={estado} pendiente={pendiente} className="grid gap-4 sm:grid-cols-2">
      {personas && <Seleccion etiqueta="Persona" name="empleado_id" opciones={personas} vacio="Elija…" required className="sm:col-span-2" />}
      <Campo etiqueta="Primer día" name="desde" type="date" min={personas ? undefined : hoy} required value={desde} onChange={(e) => setDesde(e.target.value)} />
      <Campo etiqueta="Último día" name="hasta" type="date" min={desde || hoy} required value={hasta} onChange={(e) => setHasta(e.target.value)} />
      {dias !== null && (
        <p className={`sm:col-span-2 ${disponibles !== null && disponibles !== undefined && dias > disponibles ? "text-amber-800" : "text-slate-700"}`}>
          Son <strong>{dias} días hábiles</strong> (sin sábados ni domingos).
          {disponibles !== null && disponibles !== undefined && dias > disponibles && ` Tiene ${disponibles} disponibles: la dirección decide si se los adelanta.`}
        </p>
      )}
      <AreaTexto etiqueta="Nota (opcional)" name="nota" rows={2} className="sm:col-span-2" />
      <div className="sm:col-span-2"><MensajeError estado={estado} /></div>
      <div className="sm:col-span-2"><BotonEnviar>Enviar solicitud</BotonEnviar></div>
    </FormularioAccion>
  );
}

export function BotonesResolver({ id, nombre, dias, disponibles }: { id: string; nombre: string; dias: number; disponibles: number | null }) {
  const [pend, iniciar] = useTransition();
  const aviso = useAviso();
  const [rechazando, setRechazando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const excede = disponibles !== null && dias > disponibles;
  const resolver = (aprobar: boolean) => {
    if (aprobar && excede && !confirm(`${nombre} pide ${dias} días y tiene ${disponibles} disponibles. ¿Aprobarlas igual (quedarían adelantadas)?`)) return;
    iniciar(async () => {
      const r = await resolverSolicitud(id, aprobar, aprobar ? null : motivo);
      if (r.ok) aviso(aprobar ? "Vacaciones aprobadas: ya se descontaron los días." : "Solicitud rechazada.");
      else aviso(r.error, "error");
    });
  };
  if (rechazando) {
    return (
      <div className="flex flex-wrap items-end gap-2">
        <input aria-label="Motivo del rechazo" placeholder="Motivo (lo verá la persona)" value={motivo} onChange={(e) => setMotivo(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-base" />
        <button type="button" disabled={pend} onClick={() => resolver(false)} className={estiloBoton.peligro}>Rechazar</button>
        <button type="button" onClick={() => setRechazando(false)} className="px-2 text-slate-600 underline">Cancelar</button>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={pend} onClick={() => resolver(true)} className={estiloBoton.primario}>{pend ? "Guardando…" : "Aprobar"}</button>
      <button type="button" disabled={pend} onClick={() => setRechazando(true)} className={estiloBoton.secundario}>Rechazar…</button>
    </div>
  );
}

export function BotonAnular({ id }: { id: string }) {
  const [pend, iniciar] = useTransition();
  const aviso = useAviso();
  return (
    <button type="button" disabled={pend} className="text-sm font-medium text-red-700 underline"
      onClick={() => { if (!confirm("¿Anular esta solicitud?")) return; iniciar(async () => { const r = await anularSolicitud(id); aviso(r.ok ? "Solicitud anulada." : r.error, r.ok ? "exito" : "error"); }); }}>
      Anular
    </button>
  );
}
