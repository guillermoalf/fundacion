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
import logoJPS from "../assets/JPG.png";
import logoPANI from "../assets/logo-pani.png";
import logoIMAS from "../assets/Logo-IMAS.png";

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

      <div className="cont">
        {/* POR QUÉ DONAR */}
        <section className="donaciones-why">
          <span className="section-badge">Tu apoyo marca la diferencia</span>
          <h2>¿Por qué tu ayuda es crucial?</h2>
          <div className="why-divider"></div>
          <p>
            Imaginate a final de año todos
            los niños esperan con ilusión recibir regalos, disfrutar de una fiesta
            bonita con comida rica y compartir experiencias que les traigan
            alegría y recuerdos inolvidables. Estas celebraciones y actividades
            especiales quedan fuera de nuestro presupuesto operativo.
          </p>
          <p>
            Hemos enfrentado recortes en el financiamiento y los
            auspicios que recibimos. Esto impacta directamente la vida de nuestros
            niños y niñas. 
          </p>
          
          <p>
            Tu donación 
            permite que estos momentos mágicos sean posibles y que cada niño
            sienta que es especial y merece celebrar, reír y soñar.
          </p>
        </section>
        {/* QUÉ PUEDES DONAR */}
        <section className="donaciones-categorias">
          <span className="section-badge">Cómo ayudar</span>
          <h2>¿Qué puedes donar?</h2>
          <div className="categorias-grid">
            <div className="categoria">
              <div className="cat-icon-wrapper">
                <Truck className="cat-icon" />
              </div>
              <h3>Transporte</h3>
              <p>Busetas que nos brinden transporte para llevarlos al cine, museo o cualquier otra actividad.</p>
            </div>
            <div className="categoria">
              <div className="cat-icon-wrapper">
                <ShoppingBag className="cat-icon" />
              </div>
              <h3>Alimentos</h3>
              <p>Snacks saludables, combos para la fiesta de fin de año, meriendas y bebidas.</p>
            </div>
            <div className="categoria">
              <div className="cat-icon-wrapper">
                <Users className="cat-icon" />
              </div>
              <h3>Voluntariado</h3>
              <p>Cuentacuentos, pinta caritas, talleres, activadedes y apoyo en eventos.</p>
            </div>
            <div className="categoria">
              <div className="cat-icon-wrapper">
                <Gift className="cat-icon" />
              </div>
              <h3>Ropa y útiles</h3>
              <p>Uniformes, ropa en buen estado, útiles escolares, juguetes, etc.</p>
            </div>
          </div>
          <p className="note">* No aceptamos donaciones monetarias</p>
        </section>

        <section className="donaciones-gallery">
          <span className="section-badge">Nuestros momentos</span>
          <h2>Eventos y experiencias pasadas</h2>
          <p className="gallery-intro">
            Estos son algunos de los momentos especiales que hemos compartido gracias a las donaciones de personas como tú.
          </p>
          <Swiper
            slidesPerView={1}
            spaceBetween={30}
            navigation
            pagination={{ clickable: true }}
            loop={true}
            modules={[Navigation, Pagination]}
            className="donaciones-swiper"
          >
            {galleryImages.map((img, i) => (
              <SwiperSlide key={i}>
                <div className="slide-wrapper">
                  <img src={img.src} alt={img.caption} className="swipe-image" />
                </div>
                <p className="slide-caption">{img.caption}</p>
              </SwiperSlide>
            ))}
          </Swiper>
        </section>

        <section className="donaciones-colaboradores">
          <span className="section-badge">Gracias a</span>
          <h2>Colaboradores que han hecho posible excelentes momentos</h2>
          <p className="colaboradores-intro">
            Agradecemos de corazón a estas organizaciones por su generosidad.
          </p>
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
            <div className="logo-item">
              <img src={logoJPS} alt="jps" />
            </div>
            <div className="logo-item">
              <img src={logoPANI} alt="pani" />
            </div>
            <div className="logo-item">
              <img src={logoIMAS} alt="imas" />
            </div>
          </div>
        </section>

        

        {/* TESTIMONIOS */}
        <section className="donaciones-testimonios">
          <span className="section-badge">Voces de nuestra comunidad</span>
          <h2>Testimonios</h2>
          <blockquote>
            "Gracias al transporte donado, y las entradas para el cine, mi hijo disfrutó su primera película con palomitas acompañado de sus amigos."
            <span className="author">— Familia González</span>
          </blockquote>
        </section>

        {/* CTA */}
        <section className="donaciones-cta">
          <h2>¿Listo para ayudar?</h2>
          <p className="cta-text">
            Cada donación, por pequeña que sea, hace una gran diferencia positiva en la vida de nuestros niños y niñas.
          </p>
          <button onClick={() => (window.location.href = "/contactenos")}>
            Quiero colaborar
          </button>
        </section>
      </div>

      <Copy />
    </div>
  );
}
