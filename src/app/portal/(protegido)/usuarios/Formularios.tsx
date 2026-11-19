"use client";

import { useActionState, useEffect, useState } from "react";
import { BotonEnviar, Campo, MensajeError, Seleccion, FormularioAccion } from "../../_ui/Formulario";
import { useAvisoResultado } from "../../_ui/Avisos";
import { estiloBoton } from "../../_ui/estilos";
import { actualizarAcceso, cambiarActivo, crearUsuario, restablecerContrasena, type ResultadoContrasena } from "./acciones";

const OPCION_SUPER = { valor: "superadmin", texto: "Superadministrador (corrige todo; solo lo da otro superadministrador)" };
export const OPCIONES_ROL = [
  { valor: "admin", texto: "Dirección (todo, incluido crear usuarios)" },
  { valor: "contabilidad", texto: "Contabilidad (todo menos usuarios y los datos de los niños)" },
  { valor: "coordinacion", texto: "Coordinación (compras, inventario, asistencia)" },
  { valor: "auditor", texto: "Auditor externo (solo lectura, con vencimiento)" },
  { valor: "personal", texto: "Personal: maestras y cuidadoras (solo pasan lista y ven los contactos de los niños)" },
];

/** Se muestra una sola vez: la contraseña no se guarda en ningún lado en texto. */
function ContrasenaUnaVez({ estado }: { estado: ResultadoContrasena }) {
  if (!estado?.ok) return null;
  return (
    <div role="status" className="space-y-2 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4">
      <p className="font-semibold text-emerald-900">Contraseña temporal de {estado.nombre}:</p>
      <p className="select-all break-all rounded-lg bg-white px-3 py-2 font-mono text-2xl tracking-wider">{estado.contrasena}</p>
      <p className="text-sm text-emerald-900">
        Anótela y entréguela en persona. <strong>No se vuelve a mostrar.</strong> La persona la cambia en «Mi cuenta» al entrar.
      </p>
    </div>
  );
}

export function FormularioNuevoUsuario({ conSuper = false }: { conSuper?: boolean }) {
  const [estado, accion, accionPendiente] = useActionState(crearUsuario, null);
  const [rol, setRol] = useState("coordinacion");
  useAvisoResultado(estado, "Usuario creado.");
  // React vacía el formulario después de guardar: el rol vuelve al valor por defecto.
  useEffect(() => { if (estado?.ok) setRol("coordinacion"); }, [estado]);
  return (
    <div className="space-y-4">
      <FormularioAccion accion={accion} estado={estado} pendiente={accionPendiente} className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Nombre completo" name="nombre" required autoComplete="off" />
        <Campo etiqueta="Correo" name="correo" type="email" required autoComplete="off" ayuda="Es el usuario para entrar al portal." />
        <Seleccion etiqueta="Rol" name="rol" opciones={conSuper ? [...OPCIONES_ROL, OPCION_SUPER] : OPCIONES_ROL} defaultValue="coordinacion" onChange={(e) => setRol(e.target.value)} required />
        {rol === "auditor" && (
          <Campo etiqueta="Acceso hasta" name="acceso_hasta" type="date" required ayuda="Después de esta fecha ya no puede entrar." />
        )}
        <div className="sm:col-span-2">
          <MensajeError estado={estado} />
        </div>
        <div className="sm:col-span-2">
          <BotonEnviar pendiente="Creando…">Crear usuario</BotonEnviar>
        </div>
      </FormularioAccion>
      <ContrasenaUnaVez estado={estado} />
    </div>
  );
}

export function FormularioAcceso({ id, nombre, rol: rolInicial, accesoHasta, propio, conSuper = false }: { id: string; nombre: string; rol: string; accesoHasta: string | null; propio: boolean; conSuper?: boolean }) {
  const [estado, accion, accionPendiente] = useActionState(actualizarAcceso, null);
  const [rol, setRol] = useState(rolInicial);
  useEffect(() => setRol(rolInicial), [rolInicial]);
  useAvisoResultado(estado, "Cambios guardados.");
  return (
    // key: después de guardar, React vacía el formulario; al cambiar los datos se vuelve a armar con los valores guardados.
    <FormularioAccion key={`${nombre}|${rolInicial}|${accesoHasta}`} accion={accion} estado={estado} pendiente={accionPendiente} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="id" value={id} />
      <Campo etiqueta="Nombre" name="nombre" defaultValue={nombre} required />
      <Seleccion etiqueta="Rol" name="rol" opciones={conSuper || rolInicial === "superadmin" ? [...OPCIONES_ROL, OPCION_SUPER] : OPCIONES_ROL} defaultValue={rolInicial} onChange={(e) => setRol(e.target.value)} disabled={propio} required />
      {propio && <input type="hidden" name="rol" value={rol} />}
      {rol === "auditor" && <Campo etiqueta="Acceso hasta" name="acceso_hasta" type="date" defaultValue={accesoHasta ?? ""} required />}
      {propio && <p className="text-sm text-slate-500 sm:col-span-2">Su propio rol no lo puede cambiar usted: pídaselo a otra persona con rol de dirección.</p>}
      <div className="sm:col-span-2">
        <MensajeError estado={estado} />
      </div>
      <div className="sm:col-span-2">
        <BotonEnviar>Guardar cambios</BotonEnviar>
      </div>
    </FormularioAccion>
  );
}

export function BotonActivo({ id, activo }: { id: string; activo: boolean }) {
  const [estado, accion, accionPendiente] = useActionState(cambiarActivo, null);
  useAvisoResultado(estado, activo ? "Usuario desactivado. Ya no puede entrar." : "Usuario activado de nuevo.");
  return (
    <FormularioAccion
      key={String(activo)}
      accion={accion} estado={estado} pendiente={accionPendiente}
      onSubmit={(e) => {
        if (activo && !confirm("¿Desactivar a este usuario? Se cierra su sesión y ya no podrá entrar hasta que lo active de nuevo.")) e.preventDefault();
      }}
      className="space-y-2"
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="activo" value={String(!activo)} />
      <MensajeError estado={estado} />
      <button type="submit" className={activo ? estiloBoton.peligro : estiloBoton.secundario}>
        {activo ? "Desactivar usuario" : "Activar usuario"}
      </button>
    </FormularioAccion>
  );
}

export function BotonRestablecer({ id, nombre }: { id: string; nombre: string }) {
  const [estado, accion, accionPendiente] = useActionState(restablecerContrasena, null);
  return (
    <div className="space-y-3">
      <FormularioAccion
        accion={accion} estado={estado} pendiente={accionPendiente}
        onSubmit={(e) => {
          if (!confirm(`¿Darle una contraseña nueva a ${nombre}? La anterior deja de servir y se cierra su sesión.`)) e.preventDefault();
        }}
      >
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="nombre" value={nombre} />
        <BotonEnviar variante="secundario" pendiente="Generando…">Darle una contraseña nueva</BotonEnviar>
      </FormularioAccion>
      <MensajeError estado={estado} />
      <ContrasenaUnaVez estado={estado} />
    </div>
  );
}
