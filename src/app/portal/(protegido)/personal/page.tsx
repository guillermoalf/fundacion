import type { Metadata } from "next";
import Link from "next/link";
import { sql } from "kysely";
import { obtenerSesion } from "@/lib/portal/sesion";
import { cantidad, colones, fecha, hoyCR } from "@/lib/portal/formato";
import { saldosVacaciones } from "@/lib/portal/vacaciones";
import { VolverAlBorrador } from "../../_ui/Borrador";
import Encabezado from "../../_ui/Encabezado";
import Tabla from "../../_ui/Tabla";
import Vacio from "../../_ui/Vacio";
import { estiloBoton } from "../../_ui/estilos";

export const metadata: Metadata = { title: "Personal" };

export default async function PersonalPage() {
  const { consultar, puedeEscribir, veSalarios } = await obtenerSesion();
  const { personas, conPin, vacaciones, aportes } = await consultar(async (tx) => ({
    vacaciones: (await saldosVacaciones(tx, hoyCR())).saldos,
    aportes: veSalarios ? await tx.selectFrom("salario_aportes as a").innerJoin("fuentes_financiamiento as f", "f.id", "a.fuente_id")
      .select(["a.empleado_id", "a.vigente_desde", "a.monto", "f.codigo"]).where("a.vigente_desde", "<=", hoyCR()).orderBy("a.vigente_desde", "desc").execute() : [],
    personas: await tx.selectFrom("empleados as e").leftJoin("ubicaciones as u", "u.id", "e.ubicacion_id").leftJoin("fuentes_financiamiento as f", "f.id", "e.fuente_id")
      .select(["e.id", "e.nombre", "e.puesto", sql<string | null>`salario_vigente(e.id)`.as("salario_mensual"), "e.fecha_ingreso", "e.activo", "u.nombre as aula", "f.codigo as fuente"]).orderBy("e.activo", "desc").orderBy("e.nombre").execute(),
    conPin: new Set((await sql<{ empleados_con_pin: string }>`select empleados_con_pin()`.execute(tx)).rows.map((r) => r.empleados_con_pin)),
  }));
  return (
    <>
      <VolverAlBorrador nombre="empleado" href="/portal/personal/nuevo" />
      <Encabezado
        migas={[{ etiqueta: "Personal" }]}
        titulo="Personal"
        descripcion="Todas las personas que trabajan en la fundación, usen o no el portal."
        acciones={puedeEscribir && <Link href="/portal/personal/nuevo" className={estiloBoton.primario}>+ Agregar persona</Link>}
      />
      <Tabla
        columnas={[
          { clave: "nombre", titulo: "Nombre" }, { clave: "puesto", titulo: "Puesto" }, { clave: "aula", titulo: "Aula" },
          { clave: "fuente", titulo: "Salario pagado por" }, ...(veSalarios ? [{ clave: "salario", titulo: "Salario", alinear: "derecha" as const, ocultarEnMovil: true }] : []),
          { clave: "vacaciones", titulo: "Vacaciones disponibles", alinear: "derecha" },
          { clave: "ingreso", titulo: "Ingreso", ocultarEnMovil: true }, { clave: "pin", titulo: "PIN" }, { clave: "estado", titulo: "Estado" },
        ]}
        filtros={[{ clave: "estado", titulo: "Estado" }, { clave: "fuente", titulo: "Fuente" }, { clave: "puesto", titulo: "Puesto" }]}
        filas={personas.map((p) => ({
          id: p.id,
          href: `/portal/personal/${p.id}`,
          celdas: {
            nombre: p.nombre, puesto: p.puesto, aula: p.aula ?? { vacio: true },
            fuente: (() => {
              const suyos = aportes.filter((a) => a.empleado_id === p.id);
              const vig = suyos.filter((a) => a.vigente_desde === suyos[0]?.vigente_desde);
              return vig.length > 1 ? vig.map((a) => `${a.codigo} ${a.monto === null ? "(resto)" : colones(a.monto)}`).join(" + ") : p.fuente;
            })(),
            vacaciones: (() => {
              const v = vacaciones.get(p.id);
              return !v || !p.activo ? { vacio: true } : { texto: `${cantidad(v.saldo)} días`, tono: v.saldo < 0 ? "rojo" : v.saldo > 15 ? "ambar" : "verde" };
            })(), salario: colones(p.salario_mensual), ingreso: fecha(p.fecha_ingreso)!,
            pin: conPin.has(p.id) ? { texto: "Sí", tono: "verde" } : p.activo ? { texto: "Falta", tono: "ambar" } : { vacio: true },
            estado: p.activo ? { texto: "Activo", tono: "verde" } : { texto: "Ya no trabaja", tono: "gris" },
          },
          orden: { salario: p.salario_mensual === null ? null : Number(p.salario_mensual), ingreso: p.fecha_ingreso, vacaciones: vacaciones.get(p.id)?.saldo ?? null },
          filtros: { estado: p.activo ? "Activo" : "Ya no trabaja", fuente: p.fuente ?? "Sin definir", puesto: p.puesto },
        }))}
        vacio={<Vacio titulo="Todavía no hay personal registrado." accion={puedeEscribir && <Link href="/portal/personal/nuevo" className={estiloBoton.primario}>Agregar la primera persona</Link>} />}
      />
    </>
  );
}
