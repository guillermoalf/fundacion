"use client";

import { useActionState } from "react";
import { AreaTexto, BotonEnviar, Campo, FormularioAccion, MensajeError } from "../../_ui/Formulario";
import { useAvisoResultado } from "../../_ui/Avisos";
import { guardarCorreccion } from "./acciones";

export type CampoCorreccion = { nombre: string; tipo: string; valor: string; soloLectura: boolean; largo: boolean };

export default function FormularioCorreccion({ tabla, clave, campos }: { tabla: string; clave: string; campos: CampoCorreccion[] }) {
  const [estado, accion, pendiente] = useActionState(guardarCorreccion, null);
  useAvisoResultado(estado, "Corrección guardada y registrada en la bitácora.");
  const original = JSON.stringify(Object.fromEntries(campos.map((c) => [c.nombre, c.valor])));
  return (
    <FormularioAccion accion={accion} estado={estado} pendiente={pendiente} reiniciar={false} className="space-y-5">
      <input type="hidden" name="_tabla" value={tabla} />
      <input type="hidden" name="_clave" value={clave} />
      <input type="hidden" name="_original" value={original} />
      <div className="grid gap-4 sm:grid-cols-2">
        {campos.map((c) =>
          c.largo ? (
            <AreaTexto key={c.nombre} etiqueta={`${c.nombre.replace(/_/g, " ")} (${c.tipo})`} name={c.nombre} id={`c-${c.nombre}`} defaultValue={c.valor} readOnly={c.soloLectura} className="sm:col-span-2" />
          ) : (
            <Campo key={c.nombre} etiqueta={`${c.nombre.replace(/_/g, " ")} (${c.tipo})`} name={c.nombre} id={`c-${c.nombre}`} defaultValue={c.valor} readOnly={c.soloLectura}
              ayuda={c.soloLectura ? "No se corrige (identifica al registro o se calcula solo)." : undefined} />
          ),
        )}
      </div>
      <AreaTexto etiqueta="Motivo de la corrección" name="_motivo" required placeholder="Ej.: se digitó mal el salario neto; la boleta dice ₡…" />
      <p className="text-sm text-slate-500">Deje un campo vacío para dejarlo sin dato. Las listas y los datos JSON se escriben en formato JSON.</p>
      <MensajeError estado={estado} />
      <BotonEnviar variante="peligro">Guardar corrección</BotonEnviar>
    </FormularioAccion>
  );
}
