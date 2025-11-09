import React, { useEffect, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

export default function Dashboard() {
  const [tokens, setTokens] = useState([]);
  const [assigned, setAssigned] = useState([]);
  const [entered, setEntered] = useState([]);
  const [name, setName] = useState("");
  const [roll, setRoll] = useState("");
  const [price, setPrice] = useState("0");
  const [qrImage, setQrImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scanStatus, setScanStatus] = useState("Waiting to scan...");
  const [scannedToken, setScannedToken] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [scannerInstance, setScannerInstance] = useState(null);
  const [genTotal, setGenTotal] = useState(0);
  const [genLoading, setGenLoading] = useState(false);
  const [genResponse, setGenResponse] = useState("");

  const role = localStorage.getItem("role");
  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  // 🔐 Auth protection
  if (!role) window.location = "/";
  if (role !== "main_admin") {
    if (role === "sub_admin") window.location = "/funds";
    else if (role === "scanner") window.location = "/scanner";
    else window.location = "/";
  }

  // ---------- Fetch tokens ----------
  const fetchTokens = async () => {
    try {
      const res = await fetch(`${API_BASE}/tokens`, { credentials: "include" });

      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem("role");
        window.location = "/";
        return;
      }

      const all = await res.json();
      setTokens(all);
      setAssigned(all.filter((t) => t.assigned));
      setEntered(all.filter((t) => t.entered));
    } catch (err) {
      console.error("Error fetching tokens:", err);
      alert("Error fetching tokens");
    }
  };

  useEffect(() => {
    fetchTokens();
  }, []);

  // ---------- Assign Token ----------
  const assignToken = async () => {
    if (!name || !roll) return alert("Enter name and roll!");
    if (loading) return;
    setLoading(true);

    const exists = assigned.find(
      (t) =>
        t.name?.toLowerCase() === name.toLowerCase() || t.roll === roll
    );
    if (exists) {
      alert("This student already has a token!");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/assign`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, roll, price }),
      });

      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem("role");
        window.location = "/";
        return;
      }

      const data = await res.json();
      if (res.ok) {
        setQrImage(data.qrImage);
        fetchTokens();
      } else {
        alert(data.message || "Error assigning token");
      }
    } catch (err) {
      console.error("Assign error:", err);
      alert("Network or server error");
    }

    setLoading(false);
  };

  // ---------- Logout ----------
  const logout = async () => {
    try {
      await fetch(`${API_BASE}/logout`, { credentials: "include" });
    } catch {}
    localStorage.removeItem("role");
    window.location = "/";
  };

  // ---------- Scanner ----------
  const startScanner = () => {
    setScanStatus("Waiting to scan...");
    if (scannerInstance) {
      try {
        scannerInstance.clear();
      } catch {}
    }

    const scanner = new Html5QrcodeScanner("scanner", { fps: 10, qrbox: 250 });
    setScannerInstance(scanner);

    scanner.render(onScanSuccess, () => {});

    async function onScanSuccess(decodedText) {
      scanner.clear();
      const tokenStr = decodedText.split("/").pop();
      setScanStatus("🔍 Checking token...");

      try {
        const res = await fetch(`${API_BASE}/check/${tokenStr}`, {
          credentials: "include",
        });

        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("role");
          window.location = "/";
          return;
        }

        const data = await res.json();

        // ✅ Allow only unassigned tokens for assigning
        if (data.status === "unassigned") {
          setScannedToken(tokenStr);
          setModalVisible(true);
          setScanStatus("✅ Unassigned token found — ready to assign");
        } else if (data.status === "assigned") {
          setScanStatus("⚠️ Token already assigned to someone");
        } else if (data.status === "entered") {
          setScanStatus("🚫 This token is already used for entry");
        } else {
          setScanStatus("❌ Invalid or unknown token");
        }
      } catch (err) {
        console.error(err);
        setScanStatus("❌ Error verifying token");
      }
    }
  };

  useEffect(() => {
    startScanner();
    return () => {
      if (scannerInstance) {
        try {
          scannerInstance.clear();
        } catch {}
      }
    };
  }, []);

  const restartScanner = () => startScanner();

  // ---------- Assign Scanned Token ----------
  async function assignScannedToken(e) {
    e.preventDefault();
    setScanStatus("Assigning token...");
    try {
      const res = await fetch(
        `${API_BASE}/admin/scan-assign/${scannedToken}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, roll, price }),
        }
      );

      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem("role");
        window.location = "/";
        return;
      }

      const data = await res.json();
      setModalVisible(false);
      setScanStatus(data.message || "✅ Token assigned successfully");
      fetchTokens();
    } catch (err) {
      console.error(err);
      setScanStatus("❌ Error assigning scanned token");
    }
  }

  // ---------- Generate Tokens ----------
  const generateTokens = async () => {
    if (genLoading) return;
    setGenLoading(true);
    setGenResponse("");

    try {
      const res = await fetch(`${API_BASE}/generate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ total: Number(genTotal) }),
      });

      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem("role");
        window.location = "/";
        return;
      }

      const text = await res.text();
      setGenResponse(res.ok ? text : "❌ " + text);
      if (res.ok) fetchTokens();
    } catch (err) {
      console.error(err);
      setGenResponse("❌ Network or server error");
    }

    setGenLoading(false);
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="text-primary fw-bold">🎉 Fresher Party Admin Panel</h2>
        <button className="btn btn-danger" onClick={logout}>
          Logout
        </button>
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs" id="adminTabs" role="tablist">
        <li className="nav-item">
          <button className="nav-link active" data-bs-toggle="tab" data-bs-target="#assign">
            Assign Token
          </button>
        </li>
        <li className="nav-item">
          <button className="nav-link" data-bs-toggle="tab" data-bs-target="#assigned">
            Assigned Tokens
          </button>
        </li>
        <li className="nav-item">
          <button className="nav-link" data-bs-toggle="tab" data-bs-target="#entered">
            Entered Students
          </button>
        </li>
        <li className="nav-item">
          <button className="nav-link" data-bs-toggle="tab" data-bs-target="#scan">
            Scan Token
          </button>
        </li>
        <li className="nav-item">
          <button className="nav-link" data-bs-toggle="tab" data-bs-target="#generate">
            Generate Tokens
          </button>
        </li>
      </ul>

      <div className="tab-content mt-3">
        {/* Assign Token */}
        <div className="tab-pane fade show active" id="assign">
          <div className="card p-3 shadow-sm">
            <h5>Assign New Token</h5>
            <div className="d-flex flex-column flex-md-row gap-2 mt-2">
              <input className="form-control" placeholder="Name" onChange={(e) => setName(e.target.value)} />
              <input className="form-control" placeholder="Roll" onChange={(e) => setRoll(e.target.value)} />
              <input className="form-control" placeholder="Price (₹)" value={price} onChange={(e) => setPrice(e.target.value)} />
              <button className="btn btn-success" onClick={assignToken} disabled={loading}>
                {loading ? "Assigning..." : "Assign"}
              </button>
            </div>

            {qrImage && (
              <div className="text-center mt-4">
                <h6>Show this QR to the student 👇</h6>
                <img src={qrImage} alt="QR" className="img-fluid border rounded p-2" style={{ maxWidth: 250 }} />
              </div>
            )}
          </div>
        </div>

        {/* Assigned Tokens */}
        <div className="tab-pane fade" id="assigned">
          <h5 className="mt-3">All Assigned Tokens</h5>
          <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3 mt-2">
            {assigned.map((t) => (
              <div className="col" key={t.token}>
                <div className="card shadow-sm">
                  <div className="card-body">
                    <h6 className="card-title text-success fw-bold">{t.name}</h6>
                    <p className="card-text">
                      Roll: <strong>{t.roll}</strong><br />
                      Entered: {t.entered ? "✅" : "❌"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Entered Students */}
        <div className="tab-pane fade" id="entered">
          <h5 className="mt-3">Students Who Entered</h5>
          {entered.length === 0 ? (
            <p className="text-muted mt-3">No entries yet.</p>
          ) : (
            <ul className="list-group mt-3">
              {entered.map((t) => (
                <li key={t.token} className="list-group-item d-flex justify-content-between align-items-center">
                  <span><strong>{t.name}</strong> ({t.roll})</span>
                  <span className="badge bg-success">Entered</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Scan Token */}
        <div className="tab-pane fade" id="scan">
          <div className="card p-3 shadow-sm text-center">
            <h5>📷 Scan Token</h5>
            <div id="scanner" style={{ width: "100%", maxWidth: "320px", margin: "auto" }}></div>
            <div className="alert alert-light text-center mt-3">{scanStatus}</div>

            {scanStatus !== "Waiting to scan..." && (
              <button className="btn btn-outline-primary mt-3" onClick={restartScanner}>
                🔄 Scan Again
              </button>
            )}
          </div>
        </div>

        {/* Generate Tokens */}
        <div className="tab-pane fade" id="generate">
          <div className="card p-3 shadow-sm">
            <h5>Generate Tokens</h5>
            <div className="d-flex flex-column flex-md-row gap-2 mt-2">
              <input
                type="number"
                className="form-control"
                placeholder="Total Tokens"
                value={genTotal}
                onChange={(e) => setGenTotal(e.target.value)}
              />
              <button className="btn btn-primary" onClick={generateTokens} disabled={genLoading}>
                {genLoading ? "Generating..." : "Generate"}
              </button>
            </div>
            {genResponse && <div className="alert alert-info mt-3">{genResponse}</div>}
          </div>
        </div>
      </div>

      {/* Modal for assigning scanned token */}
      {modalVisible && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <form onSubmit={assignScannedToken}>
                <div className="modal-header">
                  <h5 className="modal-title">Assign Scanned Token</h5>
                  <button type="button" className="btn-close" onClick={() => setModalVisible(false)}></button>
                </div>
                <div className="modal-body">
                  <p className="text-muted small">Token: {scannedToken?.slice(0, 10)}...</p>
                  <input
                    type="text"
                    className="form-control mb-2"
                    placeholder="Student Name"
                    required
                    onChange={(e) => setName(e.target.value)}
                  />
                  <input
                    type="text"
                    className="form-control mb-2"
                    placeholder="Roll Number"
                    required
                    onChange={(e) => setRoll(e.target.value)}
                  />
                  <input
                    type="number"
                    className="form-control"
                    placeholder="Price (₹)"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                  />
                </div>
                <div className="modal-footer">
                  <button type="submit" className="btn btn-primary">Assign Token</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setModalVisible(false)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
