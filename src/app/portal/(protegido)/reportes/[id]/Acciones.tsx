"use client";

import { useTransition } from "react";
import { useAviso } from "../../../_ui/Avisos";
import { estiloBoton } from "../../../_ui/estilos";
import { cambiarActivoReporte, duplicarReporte } from "../acciones";

export default function AccionesReporte({ id, activo }: { id: string; activo: boolean }) {
  const [pend, iniciar] = useTransition();
  const aviso = useAviso();
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={pend} className={estiloBoton.secundario}
        onClick={() => iniciar(async () => { const r = await duplicarReporte(id); if (r && !r.ok) aviso(r.error, "error"); })}>Duplicar</button>
      <button type="button" disabled={pend} className={estiloBoton.secundario}
        onClick={() => {
          if (activo && !confirm("¿Desactivar este reporte? Deja de aparecer en la lista, pero no se borra.")) return;
          iniciar(async () => { const r = await cambiarActivoReporte(id, !activo); aviso(r.ok ? (activo ? "Reporte desactivado." : "Reporte activado de nuevo.") : r.error, r.ok ? "exito" : "error"); });
        }}>{activo ? "Desactivar" : "Volver a activar"}</button>
    </div>
  );
}
