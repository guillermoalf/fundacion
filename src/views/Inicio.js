import React from "react";
import Navbar from "../components/Navbar/Navbar";
import Hero from "../components/Hero";
import Entities from "../components/Entities";
import Services from "../components/Cards";
import Footer from "../components/Footer";
import Copy from "../components/Copy";
function Inicio() {
  return (
    <div>
      <Navbar />
      <Hero />
      <Entities />
      <Services />
      <Footer />
      <Copy />
    </div>
  );
}

export default Inicio;
