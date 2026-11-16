"use client";

import { useActionState, useState } from "react";
import { AreaTexto, BotonEnviar, Campo, CampoArchivo, FormularioAccion, MensajeError, Seleccion } from "../../_ui/Formulario";
import { useAvisoResultado } from "../../_ui/Avisos";
import { diasHabiles } from "@/lib/calculos/planilla";
import { registrarAusencia } from "./acciones";
import { CON_BOLETA, TIPOS_AUSENCIA, type TipoAusencia } from "./tipos";

export default function FormularioAusencia({ personal, hoy }: { personal: { valor: string; texto: string }[]; hoy: string }) {
  const [estado, accion, pendiente] = useActionState(registrarAusencia, null);
  const [tipo, setTipo] = useState<TipoAusencia>("vacaciones");
  const [desde, setDesde] = useState(hoy);
  const [hasta, setHasta] = useState(hoy);
  const [dias, setDias] = useState<string | null>(null);
  useAvisoResultado(estado, "Ausencia registrada.");
  const sugeridos = desde && hasta ? diasHabiles(desde, hasta) : 0;
  return (
    <FormularioAccion accion={accion} estado={estado} pendiente={pendiente} className="grid gap-4 sm:grid-cols-2">
      <Seleccion etiqueta="Persona" name="empleado_id" opciones={personal} vacio="Elija…" required />
      <Seleccion etiqueta="Tipo" name="tipo" opciones={Object.entries(TIPOS_AUSENCIA).map(([valor, texto]) => ({ valor, texto }))} defaultValue="vacaciones" onChange={(e) => setTipo(e.target.value as TipoAusencia)} required />
      <Campo etiqueta="Desde" name="desde" type="date" value={desde} onChange={(e) => { setDesde(e.target.value); setDias(null); }} required />
      <Campo etiqueta="Hasta" name="hasta" type="date" value={hasta} onChange={(e) => { setHasta(e.target.value); setDias(null); }} required />
      <Campo etiqueta="Días hábiles" name="dias_habiles" inputMode="decimal" value={dias ?? String(sugeridos)} onChange={(e) => setDias(e.target.value)}
        ayuda="Calculado de lunes a viernes. Corríjalo si hubo feriados, medio día o la jornada incluye sábado." required />
      {CON_BOLETA.includes(tipo) && <Campo etiqueta="Número de boleta" name="numero_boleta" required />}
      <CampoArchivo etiqueta={CON_BOLETA.includes(tipo) ? "Foto de la boleta" : "Documento (solicitud firmada, comprobante…)"} name="documento" />
      <AreaTexto etiqueta="Observaciones" name="observaciones" className="sm:col-span-2" />
      <div className="sm:col-span-2"><MensajeError estado={estado} /></div>
      <div className="sm:col-span-2"><BotonEnviar>Registrar ausencia</BotonEnviar></div>
    </FormularioAccion>
  );
}
