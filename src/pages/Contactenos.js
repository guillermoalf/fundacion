import React from "react";
import Copy from "../components/Copy";
import Return from "../components/Return";
import "../styles/contactenos.scss";
import pic from "../assets/contact-1.png";
import { FaLocationDot } from "react-icons/fa6";
import { BsFillTelephoneFill } from "react-icons/bs";
import { MdEmail } from "react-icons/md";
import { AiFillLike } from "react-icons/ai";
import Swal from 'sweetalert2';


const Contactenos = () => {
  const showAlert = () => {
        Swal.fire({
          title: 'Hello!',
          text: 'This is a SweetAlert2 message in React.',
          icon: 'success',
        });
      };
  return (
    <div className="contact-container">
      <Return />

      <div className="contact-content">
        <div className="contact-info">
          <div className="image-container">
            <img className="image-contact" src={pic} alt="Contact" />
          </div>
          <div className="info-grid">
            <div className="info-item">
              <div className="info-header">
                <FaLocationDot className="icon" />
                <h4>Dirección</h4>
              </div>
              <p>San José, Pavas, contiguo a DEMASA</p>
            </div>
            <div className="info-item">
              <div className="info-header">
                <BsFillTelephoneFill className="icon" />
                <h4>Teléfono</h4>
              </div>
              <p>2220 1049</p>
            </div>
            <div className="info-item">
              <div className="info-header">
                <MdEmail className="icon" />
                <h4>Correo</h4>
              </div>
              <p>creciendofelizabc@gmail.com</p>
            </div>
            <div className="info-item">
              <div className="info-header">
                <AiFillLike className="icon" />
                <h4>Redes Sociales</h4>
              </div>
              <p>Facebook | Instagram</p>
            </div>
          </div>
        </div>

        <div className="contact-form">
          <form>
            <label>Nombre:</label>
            <input type="text" placeholder="Escriba su nombre" />
            <label>Email:</label>
            <input type="email" placeholder="Escriba su email" />
            <label>Teléfono:</label>
            <input type="text" placeholder="Escriba su teléfono" />
            <label>Tu mensaje:</label>
            <textarea placeholder="Escriba su consulta aquí..."></textarea>
            <button onClick={showAlert}>Enviar</button>
          </form>
        </div>
      </div>

      <div className="contact-map">
        <iframe
          title="Ubicación Fundación"
          src="https://www.google.com/maps/embed?pb=!1m17!1m12!1m3!1d982.4520052318392!2d-84.14366073038308!3d9.949925320318155!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m2!1m1!2zOcKwNTYnNTkuNyJOIDg0wrAwOCczNC45Ilc!5e0!3m2!1sen!2scr!4v1738305525772!5m2!1sen!2scr"
          width="100%"
          height="500"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
        ></iframe>
      </div>

      <Copy />
    </div>
  );
};

export default Contactenos;
