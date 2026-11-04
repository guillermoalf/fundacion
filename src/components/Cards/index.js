import React from "react";
import veggiesImage from "../../assets/veggies.png";
import book from "../../assets/book2.png";
import help from "../../assets/help.png";
import minds from "../../assets/mind2.png";
import teacher from "../../assets/teacher.png";
import playing from "../../assets/playing.png";
import styles from "./Cards.module.scss";

const ServiceCard = ({ image, title, text, isImageRight }) => {
  return (
    <div
      className={`${styles.serviceCard} ${isImageRight ? styles.reverse : ""}`}
    >
      <div className={styles.imageContainer}>
        <img src={image.src} alt="Service Illustration" />
      </div>
      <div className={styles.textContainer}>
        <h3 className={styles.serviceTitle}>{title}</h3>
        <p>{text}</p>
      </div>
    </div>
  );
};

const Services = () => {
  const services = [
    {
      image: veggiesImage,
      title: "Plan Nutricional",
      text: "Seguimos un plan nutricional elaborado por una profesional en nutrición, evitando azúcares y alimentos dañinos para la salud.",
      isImageRight: true,
    },
    {
      image: help,
      title: "Apoyo Escolar",
      text: "Ofrecemos ayuda con tareas y estudios con profesionales en docencia en cada aula.",
      isImageRight: false,
    },
    {
      image: book,
      title: "Apoyo Emocional",
      text: "Contamos con psicóloga infantil que apoya el desarrollo emocional de los niños en un entorno seguro.",
      isImageRight: true,
    },
    {
      image: minds,
      title: "Estimulación Temprana",
      text: "Ofrecemos actividades de estimulación temprana para fortalecer habilidades cognitivas, motoras y sociales.",
      isImageRight: false,
    },
    {
      image: teacher,
      title: "Habilidades Sociales",
      text: "Fomentamos comportamiento positivo y reforzamos habilidades sociales en los niños.",
      isImageRight: true,
    },
    {
      image: playing,
      title: "Actividades Recreativas",
      text: "Promovemos actividades recreativas y deportivas que fortalecen el cuerpo, la convivencia y el bienestar infantil.",
      isImageRight: false,
    },
  ];

  return (
    <div className={styles.servicesContainer}>
      {services.map((service, index) => (
        <div key={index} className={styles.serviceWrapper}>
          <ServiceCard
            image={service.image}
            title={service.title} // Pass the title to ServiceCard
            text={service.text}
            isImageRight={service.isImageRight}
          />
        </div>
      ))}
    </div>
  );
};

export default Services;
