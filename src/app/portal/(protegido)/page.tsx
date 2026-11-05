import { obtenerSesion } from "@/lib/portal/sesion";

export default async function PortalInicio() {
  const { perfil } = await obtenerSesion();

  return (
    <section>
      <h1 className="text-2xl font-semibold">Hola, {perfil?.nombre}</h1>
      <p className="mt-2 text-slate-600">Este es el portal administrativo de la Fundación Creciendo Feliz.</p>
    </section>
  );
}
