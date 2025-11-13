import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="admin-layout">
      <header className="admin-header">
        <div>
          <h1 className="admin-title">Panel Administrativo</h1>
          {user?.email && (
            <p className="admin-subtitle">Sesión iniciada como {user.email}</p>
          )}
        </div>
        <button className="admin-logout" type="button" onClick={handleLogout}>
          Logout
        </button>
      </header>

      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;


