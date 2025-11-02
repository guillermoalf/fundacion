import React from "react";
import { Link } from "react-router-dom";
import "../Footer/footer.scss";
import kinderLogo from "../../assets/logo-secundario.png";
import creativeLogo from "../../assets/blanco.png";
import { FaWhatsapp } from "react-icons/fa";
import { FaInstagram } from "react-icons/fa";
import { FaTiktok } from "react-icons/fa";
import { FaLocationDot } from "react-icons/fa6";

const Footer = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="footer">
      <div className="container">
        <div className="left">
          <Link to="/" onClick={scrollToTop}>
            <img src={kinderLogo} alt="institucion Logo" />
          </Link>
        </div>
        <div className="right">
          <div className="icons">
            <a href="https://wa.me/+50670785225">
              <FaWhatsapp className="icon" />
            </a>
            <a href="">
              <FaInstagram className="icon" />
            </a>

            <a href="./Contactenos">
              <FaLocationDot className="icon" />
            </a>
          </div>
          <div className="footer-info">
            <p>
              Teléfono: <a href="tel:+50612345678">+506 7078 5225</a>
            </p>
            <p>
              Email:{" "}
              <a href="mailto:info@institucion.com">creciendofelizabc@gmail.com</a>
            </p>
          </div>

          <div className="footer-info">
            <h3>Horario de Servicio</h3>
            <p>L-V 7:00 AM - 5:00 PM</p>
          </div>
          <div className="creative-info">
            <p className="footer-info">
              Sitio web diseñado y desarrollado por:
            </p>
            <div className="company-logo">
              <img
                src={creativeLogo}
                alt="Creative Logo"
                className="creative-logo"
              />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
