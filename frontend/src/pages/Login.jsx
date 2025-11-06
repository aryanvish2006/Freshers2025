import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const login = async () => {
    setError("");
    try {
      const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) throw new Error("Invalid password");

      const data = await res.json();

      // Save auth info
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);

      // Navigate based on role (client-side)
      if (data.role === "main_admin") navigate("/dashboard");
      else if (data.role === "sub_admin") navigate("/funds");
      else if (data.role === "scanner") navigate("/scanner");
    } catch (err) {
      setError("Invalid password. Please try again.");
    }
  };

  return (
    <div
      style={{
        maxWidth: 340,
        margin: "120px auto",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div
        className="card shadow-sm p-4"
        style={{ width: "100%", borderRadius: 12 }}
      >
        <h3 className="fw-bold mb-4 text-primary">Fresher Portal Login</h3>

        <input
          type="password"
          className="form-control mb-3"
          placeholder="Enter role password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <div className="text-danger mb-2">{error}</div>}

        <button
          className="btn btn-primary w-100"
          onClick={login}
          disabled={!password}
        >
          Login
        </button>

        <p className="text-muted mt-3 small">
          🔐 Only role passwords work: Admin / Sub-admin / Scanner
        </p>

        <div
          style={{
            marginTop: "20px",
            fontSize: "13px",
            color: "#6c757d",
            textAlign: "center",
            borderTop: "1px solid #e9ecef",
            paddingTop: "10px",
          }}
        >
          Developed by <strong className="text-primary">Aryan</strong>
        </div>
      </div>
    </div>
  );
}
