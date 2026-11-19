"use client";

import { useActionState, useState } from "react";
import { BotonEnviar, Campo, CampoArchivo, Casilla, FormularioAccion, MensajeError, Seleccion } from "../../_ui/Formulario";
import { useAvisoResultado } from "../../_ui/Avisos";
import { asignarPin, cambiarSalario, crearEmpleado, editarEmpleado, guardarAportes, guardarDatosVacaciones, guardarHorario } from "./acciones";
import { colones } from "@/lib/portal/formato";

type Opcion = { valor: number | string; texto: string };
type V = {
  id?: string; cedula?: string; nombre?: string; puesto?: string; ubicacion_id?: number | null; fuente_id?: number | null; fecha_ingreso?: string;
  fecha_salida?: string | null; horas_jornada_diaria?: string; activo?: boolean;
};

export function FormularioEmpleado({ v = {}, ubicaciones, fuentes, conSalario = false }: { v?: V; ubicaciones: Opcion[]; fuentes: Opcion[]; conSalario?: boolean }) {
  const editando = !!v.id;
  const [estado, accion, pendiente] = useActionState(editando ? editarEmpleado : crearEmpleado, null);
  return (
    <FormularioAccion accion={accion} estado={estado} pendiente={pendiente} reiniciar={false} className="grid gap-4 sm:grid-cols-2" borrador={editando ? undefined : { nombre: "empleado", titulo: "Registro de persona", volverA: "/portal/personal" }}>
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
  const [horas, setHoras] = useState(() => DIAS.map((_, i) => ({ entrada: actual[i + 1]?.entrada ?? "", salida: actual[i + 1]?.salida ?? "" })));
  const lun = horas[0];
  const [mismo, setMismo] = useState(() => horas.slice(0, 5).every((h) => h.entrada === lun.entrada && h.salida === lun.salida) && horas.slice(5).every((h) => !h.entrada));
  const poner = (i: number, campo: "entrada" | "salida", v: string) =>
    setHoras((hs) => hs.map((h, j) => (mismo ? (j < 5 && i < 5 ? { ...h, [campo]: v } : h) : j === i ? { ...h, [campo]: v } : h)));
  const fila = (d: string, i: number, soloLectura = false) => (
    <div key={d} className="grid grid-cols-[6.5rem_1fr_1fr] items-center gap-2">
      <span className="font-medium">{d}</span>
      {(["entrada", "salida"] as const).map((c) => (
        <input key={c} aria-label={`${d} ${c}`} name={`${c}_${i + 1}`} type="time" value={horas[i][c]} readOnly={soloLectura}
          onChange={(e) => poner(i, c, e.target.value)} className={`rounded-xl border border-slate-300 px-3 py-2 text-base ${soloLectura ? "bg-slate-50 text-slate-500" : ""}`} />
      ))}
    </div>
  );
  return (
    <FormularioAccion accion={accion} estado={estado} pendiente={pendiente} reiniciar={false} className="space-y-4">
      <input type="hidden" name="id" value={id} />
      <label className="flex items-center gap-2 text-base font-medium">
        <input type="checkbox" className="h-5 w-5" checked={mismo}
          onChange={(e) => { setMismo(e.target.checked); if (e.target.checked) setHoras((hs) => hs.map((h, j) => (j < 5 ? { ...hs[0] } : h))); }} />
        Mismo horario de lunes a viernes
      </label>
      <div className="space-y-2">
        {mismo ? (
          <>
            {fila("Lunes a viernes", 0)}
            {/* Los otros días van ocultos con la misma hora para que se guarden. */}
            {[1, 2, 3, 4].map((i) => (["entrada", "salida"] as const).map((c) => <input key={`${c}${i}`} type="hidden" name={`${c}_${i + 1}`} value={horas[i][c]} />))}
            <details className="pt-1">
              <summary className="cursor-pointer text-sm text-slate-600">Sábado y domingo (normalmente no se trabaja)</summary>
              <div className="mt-2 space-y-2">{fila("Sábado", 5)}{fila("Domingo", 6)}</div>
            </details>
          </>
        ) : DIAS.map((d, i) => fila(d, i))}
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

type FilaAporte = { fuente_id: string; monto: string; resto: boolean };
const aNum = (t: string) => {
  const x = t.replace(/[₡\s]/g, "");
  const n = Number(/,\d{1,2}$/.test(x) ? x.replace(/\./g, "").replace(",", ".") : x.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

/** Qué fondo paga cuánto del salario (montos fijos y, si hace falta, uno que paga «el resto»). */
export function FormularioAportes({ id, hoy, salario, fuentes, actual }: {
  id: string; hoy: string; salario: number | null; fuentes: Opcion[]; actual: FilaAporte[];
}) {
  const [estado, accion, pendiente] = useActionState(guardarAportes, null);
  useAvisoResultado(estado, "Reparto del salario guardado.");
  const [filas, setFilas] = useState<FilaAporte[]>(actual.length ? actual : [{ fuente_id: "", monto: "", resto: true }]);
  const fijo = filas.filter((f) => !f.resto).reduce((s, f) => s + aNum(f.monto), 0);
  const resto = salario === null ? null : salario - fijo;
  const hayResto = filas.some((f) => f.resto);
  const cambiar = (i: number, c: Partial<FilaAporte>) =>
    setFilas((fs) => fs.map((f, j) => (j === i ? { ...f, ...c } : c.resto ? { ...f, resto: false } : f)));
  return (
    <FormularioAccion accion={accion} estado={estado} pendiente={pendiente} reiniciar={false} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="aportes" value={JSON.stringify(filas)} />
      {filas.map((f, i) => (
        <div key={i} className="grid grid-cols-[1fr_9rem] items-end gap-2 rounded-xl border border-slate-200 p-3">
          <Seleccion etiqueta="Fondo" name={`ap-fuente-${i}`} id={`ap-fuente-${i}`} opciones={fuentes} vacio="Elija…" value={f.fuente_id} onChange={(e) => cambiar(i, { fuente_id: e.target.value })} />
          {f.resto ? (
            <div className="space-y-1.5"><span className="block text-sm font-medium text-slate-700">Paga</span>
              <p className="rounded-xl bg-slate-50 px-3 py-2.5 tabular-nums">{resto === null ? "el resto" : colones(Math.max(0, resto))}</p></div>
          ) : (
            <Campo etiqueta="Monto (₡)" name={`ap-monto-${i}`} id={`ap-monto-${i}`} inputMode="decimal" value={f.monto} onChange={(e) => cambiar(i, { monto: e.target.value })} />
          )}
          <div className="col-span-2 flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4" checked={f.resto} onChange={(e) => cambiar(i, { resto: e.target.checked })} /> Paga el resto del salario</label>
            {filas.length > 1 && <button type="button" onClick={() => setFilas((fs) => fs.filter((_, j) => j !== i))} className="text-sm text-red-700 underline">Quitar</button>}
          </div>
        </div>
      ))}
      <button type="button" onClick={() => setFilas((fs) => [...fs, { fuente_id: "", monto: "", resto: false }])} className="text-base font-medium text-sky-700 underline">+ Agregar otro fondo</button>
      {salario !== null && (
        <p className={`text-sm ${resto !== null && (resto < 0 || (!hayResto && Math.abs(resto) > 0.5)) ? "font-medium text-amber-800" : "text-slate-600"}`}>
          Salario vigente {colones(salario)} · montos fijos {colones(fijo)}
          {resto !== null && resto < 0 && " · los montos pasan el salario"}
          {resto !== null && !hayResto && resto > 0.5 && ` · faltan ${colones(resto)}: marque un fondo como «el resto»`}
        </p>
      )}
      <Campo etiqueta="Rige desde" name="vigente_desde" id="ap-vigente" type="date" defaultValue={hoy} required ayuda="El reparto anterior queda en el historial; las planillas ya hechas no cambian." />
      <MensajeError estado={estado} />
      <BotonEnviar variante="secundario">Guardar reparto</BotonEnviar>
    </FormularioAccion>
  );
}

export function FormularioDatosVacaciones({ id, v, usuarios, conUsuario }: {
  id: string; v: { vacaciones_saldo_inicial: string | null; vacaciones_saldo_al: string | null; perfil_id: string | null }; usuarios: Opcion[]; conUsuario: boolean;
}) {
  const [estado, accion, pendiente] = useActionState(guardarDatosVacaciones, null);
  useAvisoResultado(estado, "Guardado.");
  return (
    <FormularioAccion accion={accion} estado={estado} pendiente={pendiente} reiniciar={false} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="id" value={id} />
      <Campo etiqueta="Días que traía" name="vacaciones_saldo_inicial" id="vac-inicial" inputMode="decimal" defaultValue={v.vacaciones_saldo_inicial ?? ""} ayuda="Su saldo antes de usar el portal." />
      <Campo etiqueta="A la fecha" name="vacaciones_saldo_al" id="vac-al" type="date" defaultValue={v.vacaciones_saldo_al ?? ""} ayuda="Desde ahí se suman los días que va ganando." />
      {conUsuario ? (
        <Seleccion etiqueta="Su usuario del portal" name="perfil_id" id="vac-perfil" opciones={usuarios} vacio="No tiene usuario" defaultValue={v.perfil_id ?? ""} className="sm:col-span-2"
          ayuda="Así ve sus días y solicita vacaciones desde «Vacaciones»." />
      ) : <input type="hidden" name="perfil_id" value={v.perfil_id ?? ""} />}
      <div className="sm:col-span-2"><MensajeError estado={estado} /></div>
      <div className="sm:col-span-2"><BotonEnviar variante="secundario">Guardar</BotonEnviar></div>
    </FormularioAccion>
  );
}
