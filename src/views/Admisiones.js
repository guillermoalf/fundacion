import React from "react";
import Copy from "../components/Copy";
import Navbar from "../components/Navbar/Navbar";
import StepsIMAS from "../components/StepsIMAS";
import StepsPANI from "../components/StepsPANI";
import "../styles/admisiones.scss";

const Admisiones = () => {
  return (
    <div>
      <Navbar />
      <StepsIMAS />
      <StepsPANI />
      <Copy />
    </div>
  );
};

export default Admisiones;
