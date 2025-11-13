import "./App.css";
import "./admin/styles/admin.scss";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Inicio from "./pages/Inicio";
import Contactenos from "./pages/Contactenos";
import Admisiones from "./pages/Admisiones";
import Donaciones from "./pages/Donaciones";
import Services from "./pages/Servicios";
import Nosotros from "./pages/Nosotros";
import ProtectedRoute from "./admin/components/ProtectedRoute";
import AdminLayout from "./admin/layout/AdminLayout";
import Login from "./admin/pages/Login";
import Dashboard from "./admin/pages/Dashboard";
import { AuthProvider } from "./admin/context/AuthContext";

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Routes>
            <Route path="/" element={<Inicio />} />
            <Route path="/Contactenos" element={<Contactenos />} />
            <Route path="/Admisiones" element={<Admisiones />} />
            <Route path="/Donaciones" element={<Donaciones />} />
            <Route path="/Servicios" element={<Services />} />
            <Route path="/Nosotros" element={<Nosotros />} />

            <Route path="/admin/login" element={<Login />} />
            <Route path="/admin" element={<ProtectedRoute />}>
              <Route element={<AdminLayout />}>
                <Route index element={<Dashboard />} />
              </Route>
            </Route>
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
