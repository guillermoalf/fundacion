"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import "./navbar.scss";
import logo from "../../assets/logo-abc.png";

const links = [
  { to: "/", label: "Inicio" },
  { to: "/nosotros", label: "Nosotros" },
  { to: "/servicios", label: "Servicios" },
  { to: "/donaciones", label: "Donaciones" },
  { to: "/admisiones", label: "Admisiones" },
];

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="navbar">
      <div className="navbar__container">
        <div className="navbar__logo">
          <Link href="/" onClick={closeMenu}>
            <img src={logo.src} alt="Fundación Creciendo Feliz" />
          </Link>
        </div>
        <nav
          className={`navbar__links ${isMenuOpen ? "navbar__links--open" : ""}`}
        >
          {links.map(({ to, label }) => (
            <Link
              key={to}
              href={to}
              onClick={closeMenu}
              className={`navbar__link ${pathname === to ? "navbar__link--active" : ""}`}
            >
              {label}
            </Link>
          ))}
          <Link
            href="/portal/login"
            onClick={closeMenu}
            className="navbar__link"
          >
            Ingresar
          </Link>
          <Link
            href="/contactenos"
            onClick={closeMenu}
            className={`navbar__button ${pathname === "/contactenos" ? "navbar__button--active" : ""}`}
          >
            Contáctenos
          </Link>
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
