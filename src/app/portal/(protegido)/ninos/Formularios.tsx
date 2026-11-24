"use client";

import { useActionState, useEffect, useState } from "react";
import { AreaTexto, BotonEnviar, Campo, CampoArchivo, Casilla, FormularioAccion, MensajeError, Seleccion } from "../../_ui/Formulario";
import { useAvisoResultado } from "../../_ui/Avisos";
import { agregarNota, crearNino, editarNino, guardarResponsable, registrarEstudio, reingresarNino, retirarNino } from "./acciones";
import { PROVINCIAS } from "./datos";
import { sumarAnios } from "@/lib/calculos/ninos";

type Opcion = { valor: number | string; texto: string };
type VN = {
  id?: string; nombre?: string; apellidos?: string; identificacion?: string | null; fecha_nacimiento?: string | null; sexo?: string | null;
  provincia?: string | null; canton?: string | null; distrito?: string | null; direccion?: string | null; aula_id?: number | null; fuente_id?: number | null;
  fecha_ingreso?: string; alergias?: string | null; condicion_medica?: string | null; medicamentos?: string | null;
};

function CamposResponsable({ p = "", v = {} }: { p?: string; v?: VR }) {
  const n = (k: string) => `${p}${k}`;
  return (
    <>
      <Campo etiqueta="Nombre completo" name={n("nombre")} id={n("resp-nombre")} defaultValue={v.nombre} required={!p} />
      <Campo etiqueta="Parentesco" name={n("parentesco")} id={n("resp-parentesco")} defaultValue={v.parentesco} placeholder="Madre, padre, abuela, tío…" required={!p} />
      <Campo etiqueta="Cédula" name={n("identificacion")} id={n("resp-identificacion")} defaultValue={v.identificacion ?? ""} />
      <Campo etiqueta="Teléfono" name={n("telefono")} id={n("resp-telefono")} type="tel" defaultValue={v.telefono ?? ""} ayuda="Si tiene WhatsApp, anote ese número aquí." />
      <Campo etiqueta="Otro teléfono" name={n("otro_telefono")} id={n("resp-otro_telefono")} type="tel" defaultValue={v.otro_telefono ?? ""} />
      <Campo etiqueta="Correo" name={n("correo")} id={n("resp-correo")} type="email" defaultValue={v.correo ?? ""} />
      <Campo etiqueta="Otra forma de contacto" name={n("otro_contacto")} id={n("resp-otro_contacto")} defaultValue={v.otro_contacto ?? ""} placeholder="Teléfono del trabajo, vecina, Facebook…" className="sm:col-span-2" />
    </>
  );
}

export function FormularioNino({ v = {}, aulas, fuentes, hoy }: { v?: VN; aulas: Opcion[]; fuentes: Opcion[]; hoy: string }) {
  const editando = !!v.id;
  const [estado, accion, pendiente] = useActionState(editando ? editarNino : crearNino, null);
  useAvisoResultado(editando ? estado : null, "Datos guardados.");
  return (
    <FormularioAccion accion={accion} estado={estado} pendiente={pendiente} reiniciar={false} className="space-y-6" borrador={editando ? undefined : { nombre: "nino", titulo: "Registro de niño o niña", volverA: "/portal/ninos" }}>
      {editando && <input type="hidden" name="id" value={v.id} />}
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-lg font-semibold">Datos del niño o niña</legend>
        <Campo etiqueta="Nombre" name="nombre" defaultValue={v.nombre} required />
        <Campo etiqueta="Apellidos" name="apellidos" defaultValue={v.apellidos} required />
        <Campo etiqueta="Fecha de nacimiento" name="fecha_nacimiento" type="date" max={hoy} defaultValue={v.fecha_nacimiento ?? ""} ayuda="Con ella se calcula la edad." />
        <Campo etiqueta="Cédula o identificación" name="identificacion" defaultValue={v.identificacion ?? ""} />
        <Seleccion etiqueta="Sexo" name="sexo" opciones={[{ valor: "F", texto: "Niña" }, { valor: "M", texto: "Niño" }]} vacio="Sin indicar" defaultValue={v.sexo ?? ""} />
        <Seleccion etiqueta="Aula o grupo" name="aula_id" opciones={aulas} vacio="Sin asignar" defaultValue={v.aula_id ?? ""} />
        <Seleccion etiqueta="Lo subsidia" name="fuente_id" opciones={fuentes} vacio="Sin definir" defaultValue={v.fuente_id ?? ""} ayuda="Para el reporte de asistencia de cada entidad." />
        <Campo etiqueta="Fecha de ingreso a la fundación" name="fecha_ingreso" type="date" defaultValue={v.fecha_ingreso ?? hoy} required />
      </fieldset>
      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-2 text-lg font-semibold">Dónde vive</legend>
        <Seleccion etiqueta="Provincia" name="provincia" opciones={PROVINCIAS.map((p) => ({ valor: p, texto: p }))} vacio="—" defaultValue={v.provincia ?? ""} />
        <Campo etiqueta="Cantón" name="canton" defaultValue={v.canton ?? ""} />
        <Campo etiqueta="Distrito" name="distrito" defaultValue={v.distrito ?? ""} />
        <AreaTexto etiqueta="Otras señas" name="direccion" rows={2} defaultValue={v.direccion ?? ""} className="sm:col-span-3" />
      </fieldset>
      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-2 text-lg font-semibold">Salud</legend>
        <AreaTexto etiqueta="Alergias" name="alergias" rows={2} defaultValue={v.alergias ?? ""} placeholder="Ninguna conocida" />
        <AreaTexto etiqueta="Condición médica" name="condicion_medica" rows={2} defaultValue={v.condicion_medica ?? ""} />
        <AreaTexto etiqueta="Medicamentos" name="medicamentos" rows={2} defaultValue={v.medicamentos ?? ""} />
      </fieldset>
      {!editando && (
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-1 text-lg font-semibold">Responsable legal</legend>
          <p className="text-sm text-slate-500 sm:col-span-2">Después, en la ficha, puede agregar responsables de respaldo.</p>
          <CamposResponsable p="r_" />
        </fieldset>
      )}
      <MensajeError estado={estado} />
      <BotonEnviar>{editando ? "Guardar cambios" : "Registrar"}</BotonEnviar>
    </FormularioAccion>
  );
}

type VR = {
  id?: number; nombre?: string; parentesco?: string; identificacion?: string | null; telefono?: string | null; otro_telefono?: string | null;
  correo?: string | null; otro_contacto?: string | null; es_legal?: boolean; puede_recoger?: boolean; orden?: number; activo?: boolean; notas?: string | null;
};

export function FormularioResponsable({ ninoId, v = {}, siguiente = 2 }: { ninoId: string; v?: VR; siguiente?: number }) {
  const [estado, accion, pendiente] = useActionState(guardarResponsable, null);
  useAvisoResultado(estado, v.id ? "Responsable actualizado." : "Responsable agregado.");
  const p = v.id ? `r${v.id}-` : "nuevo-";
  return (
    <FormularioAccion accion={accion} estado={estado} pendiente={pendiente} reiniciar={!v.id} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="nino_id" value={ninoId} />
      {v.id && <input type="hidden" name="id" value={v.id} />}
      <CamposResponsableConId p={p} v={v} />
      <Seleccion etiqueta="Orden para llamar" name="orden" id={`${p}orden`} opciones={[1, 2, 3, 4].map((n) => ({ valor: n, texto: n === 1 ? "1 · Principal" : `${n} · Respaldo` }))} defaultValue={v.orden ?? siguiente} />
      <AreaTexto etiqueta="Notas" name="notas" id={`${p}notas`} rows={1} defaultValue={v.notas ?? ""} />
      <Casilla etiqueta="Es responsable legal" name="es_legal" id={`${p}es_legal`} defaultChecked={v.es_legal ?? false} />
      <Casilla etiqueta="Puede recoger al niño" name="puede_recoger" id={`${p}puede_recoger`} defaultChecked={v.puede_recoger ?? true} />
      {v.id && <Casilla etiqueta="Sigue siendo contacto" name="activo" id={`${p}activo`} defaultChecked={v.activo ?? true} />}
      <div className="sm:col-span-2"><MensajeError estado={estado} /></div>
      <div className="sm:col-span-2"><BotonEnviar variante={v.id ? "secundario" : "primario"}>{v.id ? "Guardar" : "Agregar responsable"}</BotonEnviar></div>
    </FormularioAccion>
  );
}

/** Mismos campos con ids únicos (varios formularios de responsables en la misma página). */
function CamposResponsableConId({ p, v }: { p: string; v: VR }) {
  return (
    <>
      <Campo etiqueta="Nombre completo" name="nombre" id={`${p}nombre`} defaultValue={v.nombre} required />
      <Campo etiqueta="Parentesco" name="parentesco" id={`${p}parentesco`} defaultValue={v.parentesco} placeholder="Madre, padre, abuela, tío…" required />
      <Campo etiqueta="Cédula" name="identificacion" id={`${p}identificacion`} defaultValue={v.identificacion ?? ""} />
      <Campo etiqueta="Teléfono" name="telefono" id={`${p}telefono`} type="tel" defaultValue={v.telefono ?? ""} ayuda="Si tiene WhatsApp, anote ese número aquí." />
      <Campo etiqueta="Otro teléfono" name="otro_telefono" id={`${p}otro_telefono`} type="tel" defaultValue={v.otro_telefono ?? ""} />
      <Campo etiqueta="Correo" name="correo" id={`${p}correo`} type="email" defaultValue={v.correo ?? ""} />
      <Campo etiqueta="Otra forma de contacto" name="otro_contacto" id={`${p}otro_contacto`} defaultValue={v.otro_contacto ?? ""} placeholder="Teléfono del trabajo, vecina, Facebook…" className="sm:col-span-2" />
    </>
  );
}

export function FormularioNota({ ninoId, hoy }: { ninoId: string; hoy: string }) {
  const [estado, accion, pendiente] = useActionState(agregarNota, null);
  useAvisoResultado(estado, "Nota guardada.");
  return (
    <FormularioAccion accion={accion} estado={estado} pendiente={pendiente} className="space-y-3">
      <input type="hidden" name="nino_id" value={ninoId} />
      <AreaTexto etiqueta="¿Qué pasó?" name="texto" rows={3} required ayuda="Las notas no se borran ni se cambian: si algo cambió, agregue otra." />
      <Campo etiqueta="Fecha" name="fecha" type="date" max={hoy} defaultValue={hoy} />
      <MensajeError estado={estado} />
      <BotonEnviar variante="secundario">Agregar nota</BotonEnviar>
    </FormularioAccion>
  );
}

export function FormularioRetiro({ ninoId, hoy }: { ninoId: string; hoy: string }) {
  const [estado, accion, pendiente] = useActionState(retirarNino, null);
  useAvisoResultado(estado, "Quedó registrado el retiro.");
  return (
    <FormularioAccion accion={accion} estado={estado} pendiente={pendiente} reiniciar={false} className="space-y-3">
      <input type="hidden" name="id" value={ninoId} />
      <p className="text-slate-600">Si ya no viene a la fundación. No se borra nada: su historial y asistencia quedan guardados.</p>
      <Campo etiqueta="Último día" name="fecha_retiro" id="fecha_retiro" type="date" defaultValue={hoy} required />
      <Campo etiqueta="Motivo" name="motivo_retiro" id="motivo_retiro" required placeholder="Se mudó, entró a la escuela…" />
      <MensajeError estado={estado} />
      <BotonEnviar variante="secundario">Registrar retiro</BotonEnviar>
    </FormularioAccion>
  );
}

export function FormularioReingreso({ ninoId }: { ninoId: string }) {
  const [estado, accion, pendiente] = useActionState(reingresarNino, null);
  useAvisoResultado(estado, "Volvió a quedar activo.");
  return (
    <FormularioAccion accion={accion} estado={estado} pendiente={pendiente} className="space-y-3">
      <input type="hidden" name="id" value={ninoId} />
      <MensajeError estado={estado} />
      <BotonEnviar variante="secundario">Volvió a la fundación</BotonEnviar>
    </FormularioAccion>
  );
}

export function FormularioEstudio({ ninoId, hoy, renovacion, vigenciaAnios }: { ninoId: string; hoy: string; renovacion: boolean; vigenciaAnios: number | null }) {
  const [estado, accion, pendiente] = useActionState(registrarEstudio, null);
  useAvisoResultado(estado, "Estudio registrado.");
  const [elaborado, setElaborado] = useState("");
  const [vence, setVence] = useState("");
  const [tocado, setTocado] = useState(false);
  useEffect(() => { if (estado?.ok) { setElaborado(""); setVence(""); setTocado(false); } }, [estado]);
  return (
    <FormularioAccion accion={accion} estado={estado} pendiente={pendiente} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="nino_id" value={ninoId} />
      <Campo etiqueta="Fecha en que se elaboró" name="fecha_elaboracion" id="est-fecha" type="date" max={hoy} required value={elaborado}
        onChange={(e) => { setElaborado(e.target.value); if (!tocado && e.target.value && vigenciaAnios) setVence(sumarAnios(e.target.value, vigenciaAnios)); }} />
      <Campo etiqueta="Fecha de vencimiento" name="fecha_vencimiento" id="est-vence" type="date" min={elaborado || undefined} required value={vence}
        onChange={(e) => { setVence(e.target.value); setTocado(true); }} ayuda={vigenciaAnios ? `Se sugiere a ${vigenciaAnios} años; cámbiela si el estudio dice otra.` : undefined} />
      <Campo etiqueta="Trabajador(a) social" name="trabajador_social" id="est-trabajador" />
      <div className="sm:col-span-2"><CampoArchivo etiqueta="Estudio (PDF o foto)" name="documento" /></div>
      <AreaTexto etiqueta="Observaciones" name="observaciones" id="est-obs" rows={2} className="sm:col-span-2" />
      <div className="sm:col-span-2"><MensajeError estado={estado} /></div>
      <div className="sm:col-span-2"><BotonEnviar>{renovacion ? "Registrar el estudio nuevo" : "Registrar estudio"}</BotonEnviar></div>
    </FormularioAccion>
  );
}
