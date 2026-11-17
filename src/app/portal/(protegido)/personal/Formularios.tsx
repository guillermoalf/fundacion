"use client";

import { useActionState } from "react";
import { BotonEnviar, Campo, CampoArchivo, Casilla, FormularioAccion, MensajeError, Seleccion } from "../../_ui/Formulario";
import { useAvisoResultado } from "../../_ui/Avisos";
import { asignarPin, cambiarSalario, crearEmpleado, editarEmpleado, guardarHorario } from "./acciones";

type Opcion = { valor: number | string; texto: string };
type V = {
  id?: string; cedula?: string; nombre?: string; puesto?: string; ubicacion_id?: number | null; fuente_id?: number | null; fecha_ingreso?: string;
  fecha_salida?: string | null; horas_jornada_diaria?: string; activo?: boolean;
};

export function FormularioEmpleado({ v = {}, ubicaciones, fuentes, conSalario = false }: { v?: V; ubicaciones: Opcion[]; fuentes: Opcion[]; conSalario?: boolean }) {
  const editando = !!v.id;
  const [estado, accion, pendiente] = useActionState(editando ? editarEmpleado : crearEmpleado, null);
  return (
    <FormularioAccion accion={accion} estado={estado} pendiente={pendiente} reiniciar={false} className="grid gap-4 sm:grid-cols-2">
      {editando && <input type="hidden" name="id" value={v.id} />}
      <Campo etiqueta="Nombre completo" name="nombre" defaultValue={v.nombre} required />
      <Campo etiqueta="Cédula" name="cedula" defaultValue={v.cedula} required />
      <Campo etiqueta="Puesto" name="puesto" defaultValue={v.puesto} required placeholder="Docente, asistente, cocinera…" />
      <Seleccion etiqueta="Aula a cargo" name="ubicacion_id" opciones={ubicaciones} vacio="Ninguna" defaultValue={v.ubicacion_id ?? ""} />
      <Seleccion etiqueta="Su salario lo paga" name="fuente_id" opciones={fuentes} vacio="Sin definir" defaultValue={v.fuente_id ?? ""} />
      {!editando && conSalario && <Campo etiqueta="Salario mensual (₡)" name="salario_mensual" inputMode="decimal" ayuda="Lo ven solo dirección, contabilidad y auditoría." />}
      <Campo etiqueta="Fecha de ingreso" name="fecha_ingreso" type="date" defaultValue={v.fecha_ingreso} required />
      <Campo etiqueta="Horas de la jornada diaria" name="horas_jornada_diaria" inputMode="decimal" defaultValue={v.horas_jornada_diaria ?? "8"} />
      <CampoArchivo etiqueta={editando ? "Cambiar foto" : "Foto (para el kiosko)"} name="foto" aceptar="image/*" />
      {editando && <Campo etiqueta="Fecha de salida" name="fecha_salida" type="date" defaultValue={v.fecha_salida ?? ""} ayuda="Solo si ya no trabaja en la fundación." />}
      {editando && <Casilla etiqueta="Trabaja actualmente" name="activo" defaultChecked={v.activo ?? true} />}
      <div className="sm:col-span-2"><MensajeError estado={estado} /></div>
      <div className="sm:col-span-2"><BotonEnviar>{editando ? "Guardar cambios" : "Agregar persona"}</BotonEnviar></div>
    </FormularioAccion>
  );
}

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export function FormularioHorario({ id, actual, hoy }: { id: string; actual: Record<number, { entrada: string; salida: string }>; hoy: string }) {
  const [estado, accion, pendiente] = useActionState(guardarHorario, null);
  useAvisoResultado(estado, "Horario guardado.");
  return (
    <FormularioAccion accion={accion} estado={estado} pendiente={pendiente} reiniciar={false} className="space-y-4">
      <input type="hidden" name="id" value={id} />
      <div className="space-y-2">
        {DIAS.map((d, i) => (
          <div key={d} className="grid grid-cols-[6rem_1fr_1fr] items-center gap-2">
            <span className="font-medium">{d}</span>
            <input aria-label={`${d} entrada`} name={`entrada_${i + 1}`} type="time" defaultValue={actual[i + 1]?.entrada ?? ""} className="rounded-xl border border-slate-300 px-3 py-2 text-base" />
            <input aria-label={`${d} salida`} name={`salida_${i + 1}`} type="time" defaultValue={actual[i + 1]?.salida ?? ""} className="rounded-xl border border-slate-300 px-3 py-2 text-base" />
          </div>
        ))}
      </div>
      <Campo etiqueta="Rige desde" name="vigente_desde" type="date" defaultValue={hoy} ayuda="El horario anterior queda guardado hasta el día antes (las tardías pasadas no cambian)." />
      <MensajeError estado={estado} />
      <BotonEnviar>Guardar horario</BotonEnviar>
    </FormularioAccion>
  );
}

export function FormularioPin({ id, tiene }: { id: string; tiene: boolean }) {
  const [estado, accion, pendiente] = useActionState(asignarPin, null);
  useAvisoResultado(estado, "PIN guardado. Ya puede marcar en el kiosko.");
  return (
    <FormularioAccion accion={accion} estado={estado} pendiente={pendiente} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <p className="text-slate-600">{tiene ? "Ya tiene PIN. Si lo olvidó, asígnele uno nuevo." : "Todavía no tiene PIN: no puede marcar en el kiosko."}</p>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="PIN (4 números)" name="pin" type="password" inputMode="numeric" pattern="\d{4}" maxLength={4} autoComplete="off" required />
        <Campo etiqueta="Repita el PIN" name="pin2" type="password" inputMode="numeric" pattern="\d{4}" maxLength={4} autoComplete="off" required />
      </div>
      <MensajeError estado={estado} />
      <BotonEnviar variante="secundario">{tiene ? "Cambiar PIN" : "Asignar PIN"}</BotonEnviar>
    </FormularioAccion>
  );
}

export function FormularioSalario({ id, hoy }: { id: string; hoy: string }) {
  const [estado, accion, pendiente] = useActionState(cambiarSalario, null);
  useAvisoResultado(estado, "Salario guardado.");
  return (
    <FormularioAccion accion={accion} estado={estado} pendiente={pendiente} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="id" value={id} />
      <Campo etiqueta="Salario mensual (₡)" name="salario_mensual" inputMode="decimal" required />
      <Campo etiqueta="Rige desde" name="vigente_desde" type="date" defaultValue={hoy} required />
      <Campo etiqueta="Motivo" name="motivo" placeholder="Ej.: aumento de ley, cambio de jornada" className="sm:col-span-2" />
      <div className="sm:col-span-2"><MensajeError estado={estado} /></div>
      <div className="sm:col-span-2"><BotonEnviar variante="secundario">Guardar salario</BotonEnviar></div>
    </FormularioAccion>
  );
}
