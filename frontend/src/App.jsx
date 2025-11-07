import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Scanner from "./pages/Scanner";
import Navbar from "./components/Navbar";
import Tokens from "./pages/Tokens";
import Tokensinfo from "./pages/Tokeninfo";
import Funds from "./pages/Funds";

export default function App() {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  // Role-based protection
  const ProtectedRoute = ({ element, allowedRoles }) => {
    if (!token) return <Navigate to="/" />;
    if (!allowedRoles.includes(role)) return <Navigate to="/" />;
    return element;
  };

  return (
    <BrowserRouter>
      {token && <Navbar />} {/* Show Navbar only when logged in */}

      <Routes>
        {/* Public route */}
        <Route path="/" element={<Login />} />

        {/* Admin routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute
              element={<Dashboard />}
              allowedRoles={["main_admin"]}
            />
          }
        />
        <Route
          path="/tokens"
          element={
            <ProtectedRoute
              element={<Tokens />}
              allowedRoles={["main_admin"]}
            />
          }
        />
        <Route
          path="/tokensinfo"
          element={
            <ProtectedRoute
              element={<Tokensinfo />}
              allowedRoles={["main_admin"]}
            />
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
