import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const [formValues, setFormValues] = useState({ email: "", password: "" });
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  const fromPath = location.state?.from?.pathname || "/admin";

  useEffect(() => {
    if (isAuthenticated) {
      navigate(fromPath, { replace: true });
    }
  }, [fromPath, isAuthenticated, navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setError(null);

    if (!formValues.email || !formValues.password) {
      setError("Por favor ingrese su correo y contraseña.");
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      login(formValues.email);
      setIsSubmitting(false);
      navigate(fromPath, { replace: true });
    }, 400);
  };

  return (
    <div className="admin-login">
      <form className="admin-login__form" onSubmit={handleSubmit}>
        <h1>Acceso Administrativo</h1>
        <label htmlFor="email">Correo</label>
        <input
          id="email"
          name="email"
          type="email"
          value={formValues.email}
          onChange={handleChange}
          autoComplete="email"
          required
        />

        <label htmlFor="password">Contraseña</label>
        <input
          id="password"
          name="password"
          type="password"
          value={formValues.password}
          onChange={handleChange}
          autoComplete="current-password"
          required
        />

        {error && <p className="admin-login__error">{error}</p>}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
};

export default Login;
