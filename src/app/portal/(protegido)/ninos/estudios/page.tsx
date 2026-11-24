import type { Metadata } from "next";
import { obtenerSesion } from "@/lib/portal/sesion";
import { fecha, hoyCR } from "@/lib/portal/formato";
import { estudiosPani, resumenEstudios } from "@/lib/portal/estudios";
import Encabezado from "../../../_ui/Encabezado";
import SinPermiso from "../../../_ui/SinPermiso";
import Tabla from "../../../_ui/Tabla";
import { estiloBoton, estiloTarjeta } from "../../../_ui/estilos";
import { ESTADOS_ESTUDIO } from "../datos";

export const metadata: Metadata = { title: "Estudios socioeconómicos" };

const ORDEN = { falta: 0, vencido: 1, urgente: 2, aviso: 3, vigente: 4 } as const;

export default async function EstudiosPage() {
  const { consultar, veNotasNinos } = await obtenerSesion();
  if (!veNotasNinos) return <SinPermiso que="los estudios socioeconómicos" />;
  const hoy = hoyCR();
  const { reglas, estudios } = await consultar((tx) => estudiosPani(tx, hoy));
  const c = resumenEstudios(estudios);
  const ordenados = [...estudios].sort((a, b) => ORDEN[a.estado] - ORDEN[b.estado] || (a.vence ?? "").localeCompare(b.vence ?? ""));
  return (
    <>
      <Encabezado
        migas={[{ etiqueta: "Niños y niñas", href: "/portal/ninos" }, { etiqueta: "Estudios socioeconómicos" }]}
        titulo="Estudios socioeconómicos (PANI)"
        descripcion={reglas
          ? `Cada niño PANI necesita su estudio vigente. Aviso cuando faltan ${Math.round(reglas.avisoDias / 30)} meses para que venza y urgente cuando faltan ${Math.round(reglas.urgenteDias / 30)}.`
          : "Faltan los parámetros del estudio socioeconómico (vigencia y avisos)."}
        acciones={<a href={`/portal/ninos/estudios/descargar?al=${hoy}`} className={estiloBoton.secundario}>Descargar Excel</a>}
      />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {(["falta", "vencido", "urgente", "aviso", "vigente"] as const).map((k) => (
          <div key={k} className={`${estiloTarjeta} ${c[k] && k !== "vigente" ? (ESTADOS_ESTUDIO[k].tono === "rojo" ? "border-red-300 bg-red-50" : "border-amber-300 bg-amber-50") : ""}`}>
            <p className="text-sm text-slate-600">{ESTADOS_ESTUDIO[k].texto}</p>
            <p className="text-3xl font-bold">{c[k]}</p>
          </div>
        ))}
      </div>
      <Tabla
        id="ninos-estudios"
        numerar
        columnas={[
          { clave: "nombre", titulo: "Niño o niña" }, { clave: "estado", titulo: "Estado" }, { clave: "vence", titulo: "Vence" },
          { clave: "faltan", titulo: "Días que faltan", alinear: "derecha" }, { clave: "elaborado", titulo: "Elaborado" },
          { clave: "trabajador", titulo: "Trabajador(a) social", oculta: true }, { clave: "aula", titulo: "Aula", oculta: true }, { clave: "documento", titulo: "Documento", oculta: true },
        ]}
        filtros={[{ clave: "estado", titulo: "Estado" }, { clave: "aula", titulo: "Aula" }]}
        filas={ordenados.map((e) => ({
          id: e.ninoId,
          href: `/portal/ninos/${e.ninoId}`,
          celdas: {
            nombre: e.nombre,
            estado: { texto: ESTADOS_ESTUDIO[e.estado].texto, tono: ESTADOS_ESTUDIO[e.estado].tono },
            vence: fecha(e.vence) ?? { vacio: true },
            faltan: e.diasRestantes === null ? { vacio: true } : e.diasRestantes <= 0 ? { texto: `venció hace ${-e.diasRestantes}`, tono: "rojo" } : e.diasRestantes,
            elaborado: e.ultimo ? fecha(e.ultimo.fecha)! : null,
            trabajador: e.ultimo?.trabajador ?? { vacio: true }, aula: e.aula ?? { vacio: true },
            documento: e.ultimo?.documento ? { texto: "Ver", href: e.ultimo.documento } : { vacio: true },
          },
          orden: { vence: e.vence, faltan: e.diasRestantes, elaborado: e.ultimo?.fecha ?? null },
          filtros: { estado: ESTADOS_ESTUDIO[e.estado].texto, aula: e.aula ?? "Sin aula" },
        }))}
      />
    </>
  );
}
