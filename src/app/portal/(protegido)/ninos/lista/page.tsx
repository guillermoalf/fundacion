import type { Metadata } from "next";
import { obtenerSesion } from "@/lib/portal/sesion";
import { fecha as fechaTexto, hoyCR } from "@/lib/portal/formato";
import Encabezado from "../../../_ui/Encabezado";
import SinPermiso from "../../../_ui/SinPermiso";
import Lista from "./Lista";

export const metadata: Metadata = { title: "Pasar lista" };

export default async function ListaPage({ searchParams }: { searchParams: Promise<{ fecha?: string; aula?: string }> }) {
  const { consultar, editaNinos, esPersonal } = await obtenerSesion();
  if (!editaNinos && !esPersonal) return <SinPermiso que="pasar lista" />;
  const sp = await searchParams;
  const hoy = hoyCR();
  // El personal pasa lista solo del día; la dirección puede corregir días anteriores.
  const dia = editaNinos && sp.fecha && /^\d{4}-\d{2}-\d{2}$/.test(sp.fecha) && sp.fecha <= hoy ? sp.fecha : hoy;
  const d = await consultar(async (tx) => ({
    ninos: await tx.selectFrom("ninos as n").leftJoin("ubicaciones as u", "u.id", "n.aula_id")
      .select(["n.id", "n.nombre", "n.apellidos", "n.alergias", "n.aula_id", "u.nombre as aula"])
      .where("n.fecha_ingreso", "<=", dia)
      .where((eb) => eb.or([eb("n.estado", "=", "activo"), eb("n.fecha_retiro", ">=", dia)]))
      .orderBy("n.nombre").orderBy("n.apellidos").execute(),
    marcas: await tx.selectFrom("asistencia_ninos").select(["nino_id", "estado", "hora_llegada", "motivo"]).where("fecha", "=", dia).execute(),
  }));
  const aulas = [...new Map(d.ninos.map((n) => [n.aula_id ?? 0, n.aula ?? "Sin aula"])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  return (
    <>
      <Encabezado
        migas={[{ etiqueta: "Niños y niñas", href: "/portal/ninos" }, { etiqueta: "Pasar lista" }]}
        titulo="Pasar lista"
        descripcion={dia === hoy ? `Hoy, ${fechaTexto(dia)}. Cada toque se guarda solo.` : `Corrigiendo el ${fechaTexto(dia)}. Cada cambio queda en la bitácora.`}
      />
      {editaNinos && (
        <form className="mb-4 flex flex-wrap items-end gap-2">
          <label className="text-sm font-medium text-slate-700">
            Día
            <input type="date" name="fecha" defaultValue={dia} max={hoy} className="mt-1 block rounded-xl border border-slate-300 px-3 py-2 text-base" />
          </label>
          <button className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-medium">Ver</button>
        </form>
      )}
      <Lista
        key={dia}
        fecha={dia}
        aulas={aulas.map(([id, nombre]) => ({ id, nombre }))}
        aulaInicial={sp.aula ? Number(sp.aula) : null}
        ninos={d.ninos.map((n) => ({ id: n.id, nombre: `${n.nombre} ${n.apellidos}`, aula: n.aula_id ?? 0, alergias: n.alergias }))}
        marcas={Object.fromEntries(d.marcas.map((m) => [m.nino_id, { estado: m.estado as "presente" | "ausente" | "justificada", hora: m.hora_llegada?.slice(0, 5) ?? null, motivo: m.motivo }]))}
      />
    </>
  );
}
