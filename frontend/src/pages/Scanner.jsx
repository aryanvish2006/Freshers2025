import React, { useEffect, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

export default function Scanner() {
  const [result, setResult] = useState("");
  const [status, setStatus] = useState("Waiting for scan...");
  const [scanning, setScanning] = useState(true);

  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  // 🔐 Role-based protection
  if (!token) window.location = "/";
  if (!["main_admin", "scanner"].includes(role)) {
    if (role === "sub_admin") window.location = "/funds";
    else window.location = "/";
  }

  // Setup scanner
  useEffect(() => {
    if (!scanning) return;

    const scanner = new Html5QrcodeScanner("reader", {
      fps: 10,
      qrbox: { width: 280, height: 280 },
    });

    scanner.render(onScanSuccess, onScanError);

    function onScanSuccess(decodedText) {
      scanner.clear();
      setScanning(false);
      handleVerification(decodedText);
    }

    function onScanError() {
      // ignore small errors
    }

    return () => {
      try {
        scanner.clear();
      } catch {}
    };
  }, [scanning]);

  // Verify token against backend
  async function handleVerification(decodedText) {
    setStatus("Verifying...");
    setResult("");

    try {
      const token = decodedText.split("/").pop();
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE}/verify/${token}`
      );
      const text = await res.text();
      setResult(text);

      if (text.includes("✅")) setStatus("success");
      else if (text.includes("⚠️")) setStatus("warning");
      else setStatus("error");
    } catch (err) {
      setStatus("error");
      setResult("❌ Error verifying QR");
    }
  }

  // Bootstrap alert color
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
    <div className="container text-center mt-5">
      <h2 className="fw-bold text-primary mb-4">🎯 Gate Scanner</h2>

      <div
        className="card shadow-sm mx-auto"
        style={{ maxWidth: "400px", minHeight: "480px" }}
      >
        <div className="card-body">
          {scanning ? (
            <div id="reader" style={{ width: "100%" }}></div>
          ) : (
            <>
              <div className={`${getAlertClass()} mt-4`} role="alert">
                {result || status}
              </div>

              <button
                className="btn btn-outline-primary mt-3"
                onClick={() => {
                  setResult("");
                  setStatus("Waiting for scan...");
                  setScanning(true);
                }}
              >
                Scan Again
              </button>
            </>
          )}
        </div>
      </div>

      <p className="text-muted mt-3 small">
        Align the QR code inside the frame to verify entry.
      </p>

      {/* Role Info */}
      <div className="mt-2 text-secondary small">
        Logged in as: <strong>{role?.replace("_", " ")}</strong>
      </div>
    </div>
  );
}
