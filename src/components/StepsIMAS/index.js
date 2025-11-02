"use client";

import { useRef } from "react";
import { scroller } from "react-scroll";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowDown,
  Calendar,
  UserCheck,
  FileText,
  Ticket,
  FolderPlus,
} from "lucide-react";
import PropTypes from "prop-types";
import "../StepsIMAS/stepsIMAS.scss";
import introImage from "../../assets/admisiones-pic.png";

export default function StepsIMAS() {
  const containerRef = useRef(null);
  const stepsRef = useRef(null); // Reference for the <h2> element

  const scrollToSteps = () => {
    scroller.scrollTo("steps-section", {
      duration: 1000, // Duration in milliseconds
      delay: 0, // Delay before starting the scroll
      smooth: "easeInOutQuart", // Smooth scrolling effect
    });
  };

  return (
    <div className="scroll-container">
      {/* Nueva Intro en dos columnas */}
      <div className="intro-section">
        <div className="intro-image-wrapper">
          <img
            src={introImage}
            alt="Niños relajados viendo el proceso"
            className="intro-image"
          />
        </div>
        <div className="intro-text-wrapper">
          <h1>Tranquilo, te guiamos paso a paso</h1>
          <p className="intro-text">
            Sabemos que al principio puede ser un poco abrumador, pero con los
            siguientes pasos entenderás completamente el proceso de admisión
            para que puedas relajarte y enfocarte en lo más importante: tu hijo.
          </p>
          <ArrowDown className="arrow-icon" onClick={scrollToSteps} />
        </div>
      </div>

      {/* Contenedor de pasos */}
      <div ref={containerRef} className="main-container">
        <div className="content-wrapper">
          <div className="grid-layout">
            {/* Lado izquierdo fijo */}
            <div className="fixed-content">
              <h2 name="steps-section" ref={stepsRef}>
                Pasos para matricular con el IMAS
              </h2>
              <p className="description">
                Para padres y madres de familia, el proceso de la matrícula con
                el IMAS será solo para aquellas familias en las que el niño o
                niña se encuentra cursando el institucion y tiene entre 1 y 6 años.
                Antes de esto, siempre se realiza una reunión introductoria para
                explicar horarios, servicios y contrato.
              </p>
              <div className="scroll-indicator">
                <div className="indicator-line"></div>
                <p>Baja para explorar</p>
              </div>
            </div>

            {/* Lado derecho — pasos animados */}
            <div className="steps-container">
              <StepCard
                containerRef={containerRef}
                index={0}
                icon={<Calendar className="step-icon" />}
                title="Solicitar cita en el IMAS"
                description="Las familias tienen que ir al IMAS, solicitar una cita (normalmente por correo) y esperar a que les llamen."
              />

              <StepCard
                containerRef={containerRef}
                index={1}
                icon={<UserCheck className="step-icon" />}
                title="Entrevista y verificación"
                description="Les hacen la entrevista y varios procesos de investigación socioeconómica gestionados por el IMAS."
              />

              <StepCard
                containerRef={containerRef}
                index={2}
                icon={<FileText className="step-icon" />}
                title="Obtener carta de cupo"
                description="Una vez aprobados, los padres eligen la institución y solicitan una carta que confirme espacio para el niño."
              />

              <StepCard
                containerRef={containerRef}
                index={3}
                icon={<Ticket className="step-icon" />}
                title="Recoger boleta de aprobación"
                description="Regresan al IMAS con la carta y reciben la boleta con la aprobación final e incluye la fecha de inicio."
              />

              <StepCard
                containerRef={containerRef}
                index={4}
                icon={<FolderPlus className="step-icon" />}
                title="Reunión para expediente"
                description="Agendar reunión para crear el expediente: copia de cédulas, constancia de nacimiento, dictamen médico y fotos tamaño pasaporte."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepCard({ containerRef, index, icon, title, description }) {
  const cardRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: cardRef,
    container: containerRef,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 0.5, 1], [100, 0, -50]);
  const opacity = useTransform(
    scrollYProgress,
    [0, 0.2, 0.8, 1],
    [0.3, 1, 1, 0.6]
  );
  const initialDelay = index * 0.1;

  return (
    <motion.div
      ref={cardRef}
      className="step-card-wrapper"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: initialDelay }}
      style={{ y, opacity }}
    >
      <div className="step-card">
        <div className="card-header">
          <div className="icon-container">{icon}</div>
          <h3>{title}</h3>
        </div>
        <p className="card-description">{description}</p>
      </div>
    </motion.div>
  );
}

StepCard.propTypes = {
  containerRef: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  icon: PropTypes.node.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
};
