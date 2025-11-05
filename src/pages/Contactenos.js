import React, { useState, useEffect } from "react";
import Copy from "../components/Copy";
import Return from "../components/Return";
import "../styles/contactenos.scss";
import pic from "../assets/contact-1.png";
import { FaLocationDot } from "react-icons/fa6";
import { BsFillTelephoneFill } from "react-icons/bs";
import { MdEmail } from "react-icons/md";
import { AiFillLike } from "react-icons/ai";
import Swal from 'sweetalert2';
import emailjs from '@emailjs/browser';

// Inicializar EmailJS con tu Public Key
const EMAILJS_PUBLIC_KEY = '7hT5a0Tx6XeaYKkOk';
emailjs.init(EMAILJS_PUBLIC_KEY);

const Contactenos = () => {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    mensaje: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Check if user has already submitted in this session
  useEffect(() => {
    const submitted = localStorage.getItem('formSubmitted');
    if (submitted === 'true') {
      setHasSubmitted(true);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if already submitted
    if (hasSubmitted || localStorage.getItem('formSubmitted') === 'true') {
      Swal.fire({
        title: '¡Ya has enviado un mensaje!',
        text: 'Solo puedes enviar un mensaje por sesión. Nos pondremos en contacto contigo pronto.',
        icon: 'info',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#ff9800'
      });
      return;
    }

    // Validate form
    if (!formData.nombre || !formData.email || !formData.mensaje) {
      Swal.fire({
        title: 'Campos incompletos',
        text: 'Por favor completa todos los campos requeridos (Nombre, Email y Mensaje).',
        icon: 'warning',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#ff9800'
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Swal.fire({
        title: 'Email inválido',
        text: 'Por favor ingresa un email válido.',
        icon: 'warning',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#ff9800'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // EmailJS template parameters
      const templateParams = {
        from_name: formData.nombre,
        from_email: formData.email,
        phone: formData.telefono || 'No proporcionado',
        message: formData.mensaje,
        to_email: 'creciendofelizabc@gmail.com'
      };

      // Send email using EmailJS
      const EMAILJS_SERVICE_ID = 'service_uawsvcs';
      const EMAILJS_TEMPLATE_ID = 'template_bmxa59x';
      
      const response = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams
      );

      if (response.status === 200) {
        // Mark as submitted in localStorage
        localStorage.setItem('formSubmitted', 'true');
        setHasSubmitted(true);
        
        // Reset form
        setFormData({
          nombre: '',
          email: '',
          telefono: '',
          mensaje: ''
        });

        Swal.fire({
          title: '¡Mensaje enviado!',
          text: 'Gracias por contactarnos. Nos pondremos en contacto contigo pronto.',
          icon: 'success',
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#ff9800'
        });
      }
    } catch (error) {
      console.error('Error completo:', error);
      console.error('Error status:', error?.status);
      console.error('Error text:', error?.text);
      
      let errorMessage = 'Hubo un problema al enviar tu mensaje. ';
      
      if (error?.status === 400) {
        errorMessage += 'Por favor verifica que todos los campos estén completos.';
      } else if (error?.status === 0) {
        errorMessage += 'Parece que hay un problema de conexión. Verifica tu internet.';
      } else if (error?.text) {
        errorMessage += `Error: ${error.text}`;
      } else {
        errorMessage += 'Por favor intenta de nuevo más tarde o contáctanos directamente por teléfono.';
      }
      
      Swal.fire({
        title: 'Error al enviar',
        text: errorMessage,
        icon: 'error',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#ff9800',
        footer: 'Si el problema persiste, puedes contactarnos al 2220 1049'
      });
    } finally {
      setIsSubmitting(false);
    }
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
          <form onSubmit={handleSubmit}>
            <label>Nombre: *</label>
            <input 
              type="text" 
              name="nombre"
              placeholder="Escriba su nombre" 
              value={formData.nombre}
              onChange={handleChange}
              disabled={hasSubmitted || isSubmitting}
              required
            />
            <label>Email: *</label>
            <input 
              type="email" 
              name="email"
              placeholder="Escriba su email" 
              value={formData.email}
              onChange={handleChange}
              disabled={hasSubmitted || isSubmitting}
              required
            />
            <label>Teléfono:</label>
            <input 
              type="text" 
              name="telefono"
              placeholder="Escriba su teléfono (opcional)" 
              value={formData.telefono}
              onChange={handleChange}
              disabled={hasSubmitted || isSubmitting}
            />
            <label>Tu mensaje: *</label>
            <textarea 
              name="mensaje"
              placeholder="Escriba su consulta aquí..." 
              value={formData.mensaje}
              onChange={handleChange}
              disabled={hasSubmitted || isSubmitting}
              required
            ></textarea>
            {hasSubmitted ? (
              <button type="button" disabled className="submitted-btn">
                Mensaje enviado
              </button>
            ) : (
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Enviando...' : 'Enviar'}
              </button>
            )}
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
