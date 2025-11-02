"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowDown,
  CreditCard,
  Users,
  CheckCircle,
  Phone,
  FolderPlus,
} from "lucide-react";
import PropTypes from "prop-types";
import "../StepsIMAS/stepsIMAS.scss";

export default function StepsPANI() {
  const containerRef = useRef(null);

  return (
    <div className="scroll-container">
      {/* Contenedor de pasos */}
      <div ref={containerRef} className="main-container">
        <div className="content-wrapper">
          <div className="grid-layout">
            {/* Lado izquierdo fijo */}
            <div className="fixed-content">
              <h2>Pasos para matricular con el PANI</h2>
              <p className="description">
                El institucion financia el estudio socioeconómico; la familia debe
                aportar toda la información y documentación dentro de los 3
                primeros días hábiles. Antes de esto, siempre se realiza una
                reunión introductoria para explicar horarios, servicios y
                contrato.
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
                icon={<CreditCard className="step-icon" />}
                title="Pago y estudio socioeconómico"
                description="El institucion paga y gestiona el estudio socioeconómico; la familia debe aportar toda la información y documentación requerida."
              />

              <StepCard
                containerRef={containerRef}
                index={1}
                icon={<Users className="step-icon" />}
                title="Entrevista familiar"
                description="Entrevista con trabajador social: la familia responde preguntas y entrega documentación dentro de los 3 primeros días hábiles."
              />

              <StepCard
                containerRef={containerRef}
                index={2}
                icon={<CheckCircle className="step-icon" />}
                title="Evaluación del PANI"
                description="El PANI revisa el estudio y emite un resultado: aprobación, rechazo o solicitud de modificaciones."
              />

              <StepCard
                containerRef={containerRef}
                index={3}
                icon={<Phone className="step-icon" />}
                title="Comunicación de resultado"
                description="Se comunica a la familia el resultado y la fecha de inicio asignada."
              />

              <StepCard
                containerRef={containerRef}
                index={4}
                icon={<FolderPlus className="step-icon" />}
                title="Reunión para expediente"
                description="Reunión final para la creación del expediente: copia de cédulas, constancia de nacimiento, dictamen médico y fotos tamaño pasaporte."
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
