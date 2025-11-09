import React, { useEffect, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

export default function Scanner() {
  const [result, setResult] = useState("");
  const [status, setStatus] = useState("Waiting for scan...");
  const [scanning, setScanning] = useState(true);
  const [logs, setLogs] = useState([]); // ✅ Track recent scans

  const role = localStorage.getItem("role");

  // 🔐 Role-based protection
  if (!role) window.location = "/";
  if (!["main_admin", "scanner"].includes(role)) {
    if (role === "sub_admin") window.location = "/funds";
    else window.location = "/";
  }

  // 🔧 Setup scanner
  useEffect(() => {
    if (!scanning) return;

    const scanner = new Html5QrcodeScanner("reader", {
      fps: 10,
      qrbox: { width: 280, height: 280 },
    });

    scanner.render(onScanSuccess, onScanError);

    async function onScanSuccess(decodedText) {
      scanner.clear();
      setScanning(false);
      await handleVerification(decodedText);
    }

    function onScanError() {
      // ignore small scan errors
    }

    return () => {
      try {
        scanner.clear();
      } catch {}
    };
  }, [scanning]);

  // ✅ Verify Token
  async function handleVerification(decodedText) {
    setStatus("Verifying...");
    setResult("");

    try {
      const tokenStr = decodedText.split("/").pop();
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE}/verify/${tokenStr}`,
        { method: "GET", credentials: "include" }
      );

      const text = await res.text();
      setResult(text);

      const logEntry = {
        text,
        token: tokenStr,
        time: new Date().toLocaleTimeString(),
      };
      setLogs((prev) => [logEntry, ...prev.slice(0, 4)]);

      if (text.includes("✅")) setStatus("success");
      else if (text.includes("⚠️")) setStatus("warning");
      else setStatus("error");
    } catch (err) {
      console.error(err);
      setStatus("error");
      setResult("❌ Error verifying QR");
    }
  }

  // 🎨 Dynamic background based on scan result
  const getBackground = () => {
    switch (status) {
      case "success":
        return "#50fd78ff"; // green
      case "warning":
        return "#fa5b5bff"; // yellow
      case "error":
        return "#f4f480ff"; // red
      default:
        return "#f8f9fa"; // neutral
    }
  };

  // Bootstrap alert style
  const getAlertClass = () => {
    switch (status) {
      case "success":
        return "alert alert-success";
      case "warning":
        return "alert alert-warning";
      case "error":
        return "alert alert-danger";
      default:
        return "alert alert-secondary";
    }
  };

  return (
    <div
      className="min-vh-100 d-flex flex-column justify-content-center align-items-center"
      style={{
        background: getBackground(),
        transition: "background 0.6s ease",
        padding: "20px",
      }}
    >
      <div className="text-center mb-4">
        <h2 className="fw-bold text-primary mb-2">🎯 Gate Scanner</h2>
        <p className="text-muted small mb-0">
          Align the QR code inside the box. Scanning happens automatically.
        </p>
      </div>

      <div
        className="card shadow-lg"
        style={{
          width: "100%",
          maxWidth: "420px",
          borderRadius: "15px",
          overflow: "hidden",
        }}
      >
        <div className="card-body text-center p-3">
          {scanning ? (
            <div id="reader" style={{ width: "100%", minHeight: "320px" }}></div>
          ) : (
            <>
              <div className={`${getAlertClass()} mt-3`} role="alert">
                {result || status}
              </div>

              <button
                className="btn btn-primary w-100 mt-3"
                style={{ borderRadius: "10px" }}
                onClick={() => {
                  setResult("");
                  setStatus("Waiting for scan...");
                  setScanning(true);
                }}
              >
                🔄 Start New Scan
              </button>
            </>
          )}
        </div>
      </div>

      {/* Recent Scan Logs */}
      {logs.length > 0 && (
        <div
          className="card shadow-sm mt-4"
          style={{ width: "100%", maxWidth: "420px" }}
        >
          <div className="card-body p-2">
            <h6 className="fw-bold text-primary mb-2">📜 Recent Scans</h6>
            <ul className="list-group list-group-flush small">
              {logs.map((log, i) => (
                <li
                  key={i}
                  className={`list-group-item d-flex justify-content-between ${
                    log.text.includes("✅")
                      ? "text-success"
                      : log.text.includes("⚠️")
                      ? "text-warning"
                      : "text-danger"
                  }`}
                >
                  <span>
                    <strong>{`[${log.token}]`}</strong>...{" "}
                    <small>{log.text}</small>
                  </span>
                  <span className="text-muted">{log.time}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <footer className="mt-4 text-secondary small text-center">
        Logged in as: <strong>{role?.replace("_", " ")}</strong>
      </footer>
    </div>
  );
}
