import type { ReactNode } from "react";

// Con CRA todas las hojas de estilo del sitio se cargaban juntas, en este orden,
// y algunas reglas dependen de esa cascada (p. ej. servicios.scss sobre swiper/css).
// Se importan aquí en el mismo orden para que el sitio se vea igual que antes.
// El portal (/portal) queda fuera de este grupo y no hereda estos estilos.
import "../../components/Navbar/navbar.scss";
import "../../components/Hero/hero.scss";
import "../../components/Entities/entities.scss";
import "../../components/Footer/footer.scss";
import "../../components/Copy/copy.scss";
import "../../styles/contactenos.scss";
import "../../components/StepsIMAS/stepsIMAS.scss";
import "../../styles/admisiones.scss";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "../../styles/donaciones.scss";
import "../../styles/servicios.scss";
import "../../styles/nosotros.scss";

export default function SitioLayout({ children }: { children: ReactNode }) {
  return children;
}
