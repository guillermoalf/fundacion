import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import "./navbar.scss";
import logo from "../../assets/logo-abc.png";

const links = [
  { to: "/", label: "Inicio" },
  { to: "/Nosotros", label: "Nosotros" },
  { to: "/Servicios", label: "Servicios" },
  { to: "/Donaciones", label: "Donaciones" },
  { to: "/Admisiones", label: "Admisiones" },
];

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="navbar">
      <div className="navbar__container">
        <div className="navbar__logo">
          <Link to="/" onClick={closeMenu}>
            <img src={logo} alt="Fundación Creciendo Feliz" />
          </Link>
        </div>
        <nav
          className={`navbar__links ${isMenuOpen ? "navbar__links--open" : ""}`}
        >
          {links.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end
              onClick={closeMenu}
              className={({ isActive }) =>
                `navbar__link ${isActive ? "navbar__link--active" : ""}`
              }
            >
              {label}
            </NavLink>
          ))}
          <NavLink
            to="/Contactenos"
            onClick={closeMenu}
            className={({ isActive }) =>
              `navbar__button ${isActive ? "navbar__button--active" : ""}`
            }
          >
            Contáctenos
          </NavLink>
        </nav>
        <div className="navbar__menu-icon" onClick={toggleMenu}>
          {isMenuOpen ? (
            <span className="navbar__close">&times;</span>
          ) : (
            <span className="navbar__hamburger">&#9776;</span>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
