import React from "react";
import Return from "../components/Return";
import Copy from "../components/Copy";
import teamPhoto from "../assets/grupal3.JPG";
import "../styles/nosotros.scss";
import { Target, HeartHandshake } from "lucide-react";

export default function Nosotros() {
  return (
    <div className="nosotros-page">
      <Return />

      {/* Contenedor central con gutter uniforme */}
      <div className="cont">
        {/* Hero */}
        <section className="about-hero">
          <span className="badge">Nosotros</span>
          <h1>Educación con corazón y propósito</h1>
          <p>
            Más de 20 años acompañando a familias con un entorno seguro, cálido
            y creativo para que los niños y niñas exploren, aprendan y sueñen en
            grande.
          </p>
        </section>

        {/* Misión & Visión */}
        <section className="mision-vision">
          <div className="mision card">
            <div className="card-title">
              <HeartHandshake className="icon" />
              <h2>Misión</h2>
            </div>
            <p>
              Nuestra misión es brindar una educación preescolar integral y
              afectuosa a niños y niñas de escasos recursos, fomentando su
              desarrollo académico, emocional y social en un ambiente familiar y
              seguro. Trabajamos de la mano con las familias y las entidades
              públicas para garantizar que cada pequeño tenga las herramientas y
              el apoyo que necesita para alcanzar su máximo potencial.
            </p>
          </div>
          <div className="vision card">
            <div className="card-title">
              <Target className="icon" />
              <h2>Visión</h2>
            </div>
            <p>
              Ser un referente de educación temprana inclusiva y de calidad en
              Costa Rica, donde cada niño y niña, sin importar su condición
              socioeconómica, encuentre oportunidades reales para aprender,
              expresarse y ser feliz. Aspiramos a crecer en alianzas con la
              comunidad y los organismos de apoyo para ampliar nuestro impacto y
              replicar nuestro modelo en otras regiones.
            </p>
          </div>
        </section>

        {/* Nuestro Equipo */}
        <section className="equipo">
          <div className="equipo-content">
            <img
              src={teamPhoto}
              alt="Equipo de docentes"
              className="equipo-photo"
            />
            <p className="equipo-text">
              Guiados por la visión y el esfuerzo de nuestra fundadora, Marta
              Chaverri Corrales, quien comenzó este proyecto en su propia casa
              con solo unos pocos niños, hoy contamos con un equipo de
              educadoras y profesionales apasionadas por la infancia. Cada una
              aporta su experiencia en desarrollo infantil, creando un entorno
              de confianza, calidez y creatividad en el que los pequeños se
              sienten libres de explorar, jugar y aprender cada día.
            </p>
          </div>
        </section>
        <section className="tiqui">
          <h1>Conoce nuestra familia</h1>
          <p className="tiqui-subtitle">
            Desde hace más de 20 años acompañamos con cariño y dedicación a
            niños y niñas de nuestra comunidad, ofreciendo un espacio seguro
            donde pueden jugar, aprender y crecer.
          </p>
        </section>
      </div>

      <Copy />
    </div>
  );
}
