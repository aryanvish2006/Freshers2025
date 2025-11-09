import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Scanner from "./pages/Scanner";
import Navbar from "./components/Navbar";
import Tokens from "./pages/Tokens";
import Tokensinfo from "./pages/Tokeninfo";
import Funds from "./pages/Funds";

export default function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState(localStorage.getItem("role"));

  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  // 🔍 Check if user cookie is still valid
  const verifyAuth = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/check`, {
        method: "GET",
        credentials: "include", // ✅ send HTTP-only cookie
      });

      if (!res.ok) throw new Error("Session invalid");
      const data = await res.json();

      if (data.valid) {
        setIsAuthenticated(true);
      } else {
        handleLogout();
      }
    } catch {
      handleLogout();
    } finally {
      setAuthChecked(true);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("role");
    setRole(null);
    setIsAuthenticated(false);
  };

  useEffect(() => {
    verifyAuth();
  }, []);

  // 🔒 Route guard
  const ProtectedRoute = ({ element, allowedRoles }) => {
    if (!authChecked) return <div className="text-center mt-5">Checking session...</div>;
    if (!isAuthenticated) return <Navigate to="/" replace />;
    if (!allowedRoles.includes(role)) return <Navigate to="/" replace />;
    return element;
  };

  return (
    <BrowserRouter>
      {isAuthenticated && <Navbar />}

      <Routes>
        {/* Public route */}
        <Route path="/" element={<Login />} />

        {/* Admin routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute element={<Dashboard />} allowedRoles={["main_admin"]} />
          }
        />
        <Route
          path="/tokens"
          element={
            <ProtectedRoute element={<Tokens />} allowedRoles={["main_admin"]} />
          }
        />
        <Route
          path="/tokensinfo"
          element={
            <ProtectedRoute element={<Tokensinfo />} allowedRoles={["main_admin"]} />
          }
        />

        {/* Shared routes */}
        <Route
          path="/funds"
          element={
            <ProtectedRoute
              element={<Funds />}
              allowedRoles={["main_admin", "sub_admin"]}
            />
          }
        />
        <Route
          path="/scanner"
          element={
            <ProtectedRoute
              element={<Scanner />}
              allowedRoles={["main_admin", "scanner"]}
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
