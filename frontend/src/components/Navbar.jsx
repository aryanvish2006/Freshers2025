import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const location = useLocation();
  const current = location.pathname;

  const role = localStorage.getItem("role");

  const logout = async () => {
  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";
  await fetch(`${API_BASE}/logout`, { method: "POST", credentials: "include" });
  localStorage.removeItem("role");
  window.location = "/";
};


  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm">
      <div className="container-fluid">
        <Link
          className="navbar-brand fw-bold"
          to={role === "main_admin" ? "/dashboard" : role === "sub_admin" ? "/funds" : "/scanner"}
        >
          🎉 Fresher Portal
        </Link>

        {/* Hamburger for mobile */}
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto">
            {/* Main Admin Links */}
            {role === "main_admin" && (
              <>
                <li className="nav-item">
                  <Link
                    className={`nav-link ${
                      current === "/dashboard" ? "active" : ""
                    }`}
                    to="/dashboard"
                  >
                    Dashboard
                  </Link>
                </li>
                <li className="nav-item">
                  <Link
                    className={`nav-link ${
                      current === "/tokens" ? "active" : ""
                    }`}
                    to="/tokens"
                  >
                    Tokens
                  </Link>
                </li>
                <li className="nav-item">
                  <Link
                    className={`nav-link ${
                      current === "/tokensinfo" ? "active" : ""
                    }`}
                    to="/tokensinfo"
                  >
                    Tokens Info
                  </Link>
                </li>
                <li className="nav-item">
                  <Link
                    className={`nav-link ${
                      current === "/funds" ? "active" : ""
                    }`}
                    to="/funds"
                  >
                    Funds
                  </Link>
                </li>
                <li className="nav-item">
                  <Link
                    className={`nav-link ${
                      current === "/scanner" ? "active" : ""
                    }`}
                    to="/scanner"
                  >
                    Scanner
                  </Link>
                </li>
              </>
            )}

            {/* Sub Admin Links */}
            {role === "sub_admin" && (
              <li className="nav-item">
                <Link
                  className={`nav-link ${
                    current === "/funds" ? "active" : ""
                  }`}
                  to="/funds"
                >
                  Funds
                </Link>
              </li>
            )}

            {/* Scanner Links */}
            {role === "scanner" && (
              <li className="nav-item">
                <Link
                  className={`nav-link ${
                    current === "/scanner" ? "active" : ""
                  }`}
                  to="/scanner"
                >
                  Scanner
                </Link>
              </li>
            )}
          </ul>

          {/* Role label + Logout */}
          <div className="d-flex align-items-center">
            <span className="text-light me-3 small">
              Role: {role?.replace("_", " ")}
            </span>
            <button className="btn btn-outline-light btn-sm" onClick={logout}>
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
