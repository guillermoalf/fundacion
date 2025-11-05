import React from "react";
import { Link } from "react-router-dom";
import Copy from "../components/Copy";
import Return from "../components/Return";
import "../styles/servicios.scss";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import imagehero from "../assets/hero-image1.png";
import { Sparkles, Users, Heart } from "lucide-react";

import img1 from "../assets/slider/7.png";
import img2 from "../assets/slider/1.JPG";
import img3 from "../assets/slider/2.JPG";
import img5 from "../assets/slider/4.JPG";
import img6 from "../assets/slider/5.JPG";
import img7 from "../assets/slider/6.JPG";

const Servicios = () => {
  return (
    <div className="servicios-page">
      <Return />

      <div className="cont">
        <div className="Servicios">
          <div className="texto">
            <span className="servicios-badge">Nuestros Servicios</span>
            <h1 className="servicios-title">Ven a divertirte con nosotros</h1>
            <div className="servicios-divider"></div>
            <p className="servicios-description">
              Conoce más de nuestros servicios y actividades que tenemos para tus
              hijos, donde aprenderán y se divertirán al mismo tiempo.
            </p>
            <p className="servicios-question">
              ¿Por qué escogernos como institución?
            </p>
            <div className="servicios-features">
              <div className="feature-item">
                <Sparkles className="feature-icon" />
                <span>Actividades creativas</span>
              </div>
              <div className="feature-item">
                <Users className="feature-icon" />
                <span>Atención personalizada</span>
              </div>
              <div className="feature-item">
                <Heart className="feature-icon" />
                <span>Ambiente seguro y cálido</span>
              </div>
            </div>
            <Link to="/Contactenos">
              <button className="servicios-button">Contáctanos</button>
            </Link>
          </div>
          <div className="fun-image">
            <div className="image-wrapper">
              <img src={imagehero} alt="Niños disfrutando actividades" />
            </div>
          </div>
        </div>

        <div className="gallery-section">
          <div className="gallery-header">
            <span className="gallery-badge">Galería</span>
            <h2 className="gallery-title">Momentos especiales</h2>
            <p className="gallery-subtitle">
              Descubre nuestros espacios y las actividades que realizamos día a día
            </p>
          </div>
          <Swiper
            modules={[Navigation, Pagination, Autoplay]}
            navigation
            pagination={{ clickable: true }}
            spaceBetween={30}
            slidesPerView={1}
            loop={true}
            autoplay={{
              delay: 4000,
              disableOnInteraction: false,
            }}
            className="mySwiper"
          >
            <SwiperSlide>
              <div className="slide-wrapper">
                <img src={img1} alt="Niños jugando" className="swipe-image" />
              </div>
            </SwiperSlide>
            <SwiperSlide>
              <div className="slide-wrapper">
                <img src={img2} alt="Clase de arte" className="swipe-image" />
              </div>
            </SwiperSlide>
            <SwiperSlide>
              <div className="slide-wrapper">
                <img src={img3} alt="Actividad educativa" className="swipe-image" />
              </div>
            </SwiperSlide>
            <SwiperSlide>
              <div className="slide-wrapper">
                <img src={img5} alt="Actividad educativa" className="swipe-image" />
              </div>
            </SwiperSlide>
            <SwiperSlide>
              <div className="slide-wrapper">
                <img src={img6} alt="Actividad educativa" className="swipe-image" />
              </div>
            </SwiperSlide>
            <SwiperSlide>
              <div className="slide-wrapper">
                <img src={img7} alt="Actividad educativa" className="swipe-image" />
              </div>
            </SwiperSlide>
          </Swiper>
        </div>
      </div>

      <Copy />
    </div>
  );
};

export default Servicios;
