import { obtenerSesion } from "@/lib/portal/sesion";
import Encabezado from "../_ui/Encabezado";

export default async function PortalInicio() {
  const { perfil } = await obtenerSesion();
  return <Encabezado titulo={`Hola, ${perfil?.nombre ?? ""}`} descripcion="Este es el portal administrativo de la Fundación Creciendo Feliz." />;
}
