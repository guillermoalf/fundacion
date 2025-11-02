import React from "react";
import Return from "../components/Return";
import Copy from "../components/Copy";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import { Gift, Truck, ShoppingBag, Film, Museum, Users } from "lucide-react";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "../styles/donaciones.scss";

// Galería de eventos
import imgCine from "../assets/cine.JPG";
import imgTrampolines from "../assets/trampolines.JPG";
import imgPolicia from "../assets/policias2.JPG";
import imgEnfermeros from "../assets/enfermeros.JPG";
import imgTransito from "../assets/transito2.JPG";

// Logos de colaboradores
import logoKFC from "../assets/kfc.png";
import logoMuseo from "../assets/museo.png";
import logoCCM from "../assets/CCM.png";

export default function Donaciones() {
  const galleryImages = [
    {
      src: imgCine,
      caption: "Disfrutamos muchisimo viendo los Minions gracias a CCM Cinemas",
    },
    {
      src: imgTrampolines,
      caption: "Nos divertimos con los trampolines y saltamos un montón",
    },
    {
      src: imgPolicia,
      caption:
        "Aprendimos los labores de la Policia y su importancia para nuestra sociedad",
    },
    {
      src: imgEnfermeros,
      caption:
        "Entendimos el cuidado de la salud gracias a la visita de los enfermeros",
    },
    {
      src: imgTransito,
      caption:
        "Nos enseñaron sobre las señales de tránsito y cómo mantenernos seguros en las calles",
    },
  ];

  return (
    <div className="donaciones-page">
      <Return />

      {/* POR QUÉ DONAR */}
      <section className="donaciones-why">
        <h2>¿Por qué tu ayuda es crucial?</h2>
        <p>
          Este año el PANI redujo la cuota que financia al institucion y limitó la
          estancia a solo 4 horas diarias. Pero las escuelas públicas
          frecuentemente suspenden clases, y los niños deben quedarse todo el
          día en nuestra institución, generando gastos de transporte,
          alimentación y cuidado que PANI ya no cubre. Tu donación de
          transporte, alimentos, ropa o experiencias cubre ese vacío y brinda
          momentos que de otra forma no tendrían.
        </p>
      </section>

      <section className="donaciones-gallery">
        <h2>Eventos y experiencias pasadas</h2>
        <Swiper
          slidesPerView={1}
          spaceBetween={30}
          navigation
          pagination={{ clickable: true }}
          loop={true}
          modules={[Navigation, Pagination]}
          className="mySwiper"
        >
          {galleryImages.map((img, i) => (
            <SwiperSlide key={i}>
              <img src={img.src} alt={img.caption} className="swipe-image" />
              <p className="slide-caption">{img.caption}</p>
            </SwiperSlide>
          ))}
        </Swiper>
      </section>

      <section className="donaciones-colaboradores">
        <h2>Colaboradores que han hecho posible excelentes momentos</h2>
        <div className="logos-grid">
          <div className="logo-item">
            <img src={logoKFC} alt="KFC" />
          </div>
          <div className="logo-item">
            <img src={logoMuseo} alt="Museo" />
          </div>
          <div className="logo-item">
            <img src={logoCCM} alt="CCM" />
          </div>
        </div>
      </section>

      {/* QUÉ PUEDES DONAR */}
      <section className="donaciones-categorias">
        <h2>¿Qué puedes donar?</h2>
        <div className="categorias-grid">
          <div className="categoria">
            <Truck className="cat-icon" />
            <h3>Transporte</h3>
            <p>Busetas para llevarlos a cine o museo.</p>
          </div>
          <div className="categoria">
            <ShoppingBag className="cat-icon" />
            <h3>Alimentos</h3>
            <p>Snacks, combo de fin de año, meriendas.</p>
          </div>
          <div className="categoria">
            <Users className="cat-icon" />
            <h3>Voluntariado</h3>
            <p>Cuentacuentos, talleres y apoyo en eventos.</p>
          </div>
          <div className="categoria">
            <Gift className="cat-icon" />
            <h3>Ropa y útiles</h3>
            <p>Camisas, útiles escolares y abrigos.</p>
          </div>
        </div>
        <p className="note">* No aceptamos donaciones monetarias</p>
      </section>

      {/* TESTIMONIOS */}
      <section className="donaciones-testimonios">
        <h2>Testimonios</h2>
        <blockquote>
          “Gracias al transporte donado, mi hijo disfrutó su primera película en
          el cine con sus amigos.”
          <span className="author">— Familia González</span>
        </blockquote>
      </section>

      {/* CTA */}
      <section className="donaciones-cta">
        <h2>¿Listo para ayudar?</h2>
        <button onClick={() => (window.location.href = "/contactenos")}>
          Quiero colaborar
        </button>
      </section>

      <Copy />
    </div>
  );
}
