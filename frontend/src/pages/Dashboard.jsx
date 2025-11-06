import React, { useEffect, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

export default function Dashboard() {
  const [tokens, setTokens] = useState([]);
  const [assigned, setAssigned] = useState([]);
  const [entered, setEntered] = useState([]);
  const [name, setName] = useState("");
  const [roll, setRoll] = useState("");
  const [price, setPrice] = useState("400");
  const [qrImage, setQrImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scanStatus, setScanStatus] = useState("Waiting to scan...");
  const [scannedToken, setScannedToken] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [responseMsg, setResponseMsg] = useState("");

  // 🔥 NEW — states for token generation
  const [genType, setGenType] = useState("digital");
  const [genTotal, setGenTotal] = useState(0);
  const [genLoading, setGenLoading] = useState(false);
  const [genResponse, setGenResponse] = useState("");

  const token = localStorage.getItem("token");
  if (!token) window.location = "/";
  const headers = { Authorization: "Bearer " + token, "Content-Type": "application/json" };

  // ---------- Fetch tokens ----------
  const fetchTokens = async () => {
    const res = await fetch(`${import.meta.env.VITE_API_BASE}/tokens`, { headers });
    if (res.ok) {
      const all = await res.json();
      setTokens(all);
      setAssigned(all.filter((t) => t.assigned));
      setEntered(all.filter((t) => t.entered));
    }
  };

  useEffect(() => {
    fetchTokens();
  }, []);

  // ---------- Assign Digital Token ----------
  const assignDigital = async () => {
    if (!name || !roll) return alert("Enter name and roll!");
    if (loading) return;
    setLoading(true);

    const exists = assigned.find(
      (t) => t.name?.toLowerCase() === name.toLowerCase() || t.roll === roll
    );
    if (exists) {
      alert("This student already has a token!");
      setLoading(false);
      return;
    }

    const res = await fetch(`${import.meta.env.VITE_API_BASE}/assign`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name, roll, price }),
    });

    if (res.ok) {
      const data = await res.json();
      setQrImage(data.qrImage);
      fetchTokens();
    } else {
      alert("No digital tokens left or error occurred");
    }
    setLoading(false);
  };

  const logout = () => {
    localStorage.removeItem("token");
    window.location = "/";
  };

  // ---------- Scanner for Printed Tokens ----------
  useEffect(() => {
    const scanner = new Html5QrcodeScanner("scanner", { fps: 10, qrbox: 250 });
    scanner.render(onScanSuccess, () => {});
    function onScanSuccess(decodedText) {
      scanner.clear();
      const tokenStr = decodedText.split("/").pop();
      setScannedToken(tokenStr);
      setModalVisible(true); // open modal input
    }
    return () => {
      try {
        scanner.clear();
      } catch {}
    };
  }, []);

  async function assignScannedToken(e) {
    e.preventDefault();
    setScanStatus("Assigning token...");
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE}/admin/scan-assign/${scannedToken}`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ name, roll, price }),
        }
      );
      const data = await res.json();
      setResponseMsg(data.message);
      setScanStatus(data.message);
      setModalVisible(false);
      fetchTokens();
    } catch (err) {
      console.error(err);
      setResponseMsg("❌ Error assigning token");
      setScanStatus("❌ Error assigning token");
    }
  }

  // 🔥 NEW — Token Generation
// 🔥 FIXED — Token Generation
const generateTokens = async () => {
  if (genLoading) return;
  setGenLoading(true);
  setGenResponse("");

  try {
    // --- ensure we always call backend, not frontend dev server
    const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

    const res = await fetch(`${API_BASE}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({
        total: Number(genTotal),
        type: genType,
      }),
    });

    const data = await res.text();

    if (res.ok) {
      setGenResponse(data);
      fetchTokens();
    } else {
      setGenResponse("❌ " + data);
    }
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
          <button className="nav-link active" id="assign-tab" data-bs-toggle="tab" data-bs-target="#assign">
            Assign Digital Token
          </button>
        </li>
        <li className="nav-item">
          <button className="nav-link" id="assigned-tab" data-bs-toggle="tab" data-bs-target="#assigned">
            Assigned Tokens
          </button>
        </li>
        <li className="nav-item">
          <button className="nav-link" id="entered-tab" data-bs-toggle="tab" data-bs-target="#entered">
            Entered Students
          </button>
        </li>
        <li className="nav-item">
          <button className="nav-link" id="scan-tab" data-bs-toggle="tab" data-bs-target="#scan">
            Scan Printed Token
          </button>
        </li>
        {/* 🔥 NEW TAB */}
        <li className="nav-item">
          <button className="nav-link" id="generate-tab" data-bs-toggle="tab" data-bs-target="#generate">
            Generate Tokens
          </button>
        </li>
      </ul>

      <div className="tab-content mt-3">
        {/* 1️⃣ Assign Digital Token */}
        <div className="tab-pane fade show active" id="assign">
          <div className="card p-3 shadow-sm">
            <h5>Assign New Digital Token</h5>
            <div className="d-flex flex-column flex-md-row gap-2 mt-2">
              <input className="form-control" placeholder="Name" onChange={(e) => setName(e.target.value)} />
              <input className="form-control" placeholder="Roll" onChange={(e) => setRoll(e.target.value)} />
              <input className="form-control" placeholder="Price (₹)" value={price} onChange={(e) => setPrice(e.target.value)} />
              <button className="btn btn-success" onClick={assignDigital} disabled={loading}>
                {loading ? "Assigning..." : "Assign"}
              </button>
            </div>

            {qrImage && (
              <div className="text-center mt-4">
                <h6>Show this QR to the student 👇</h6>
                <img src={qrImage} alt="QR" className="img-fluid border rounded p-2" style={{ maxWidth: 250 }} />
                <p className="text-muted">Ask them to click a photo of it.</p>
              </div>
            )}
          </div>
        </div>

        {/* 2️⃣ Assigned Tokens */}
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
                      Type: {t.batch}<br />
                      Entered: {t.entered ? "✅" : "❌"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3️⃣ Entered Students */}
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

        {/* 4️⃣ Scan Printed Token */}
        <div className="tab-pane fade" id="scan">
          <div className="card p-3 shadow-sm text-center">
            <h5>📷 Scan Printed Token</h5>
            <div id="scanner" style={{ width: "100%", maxWidth: "320px", margin: "auto" }}></div>
            <div className="alert alert-light text-center mt-3">{scanStatus}</div>
            {responseMsg && <p className="mt-2">{responseMsg}</p>}
          </div>
        </div>

        {/* 🔥 5️⃣ Generate Tokens */}
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
              <select
                className="form-select"
                value={genType}
                onChange={(e) => setGenType(e.target.value)}
              >
                <option value="digital">Digital</option>
                <option value="printed">Printed</option>
              </select>
              <button
                className="btn btn-primary"
                onClick={generateTokens}
                disabled={genLoading}
              >
                {genLoading ? "Generating..." : "Generate"}
              </button>
            </div>
            {genResponse && <div className="alert alert-info mt-3">{genResponse}</div>}
          </div>
        </div>
      </div>

      {/* 🔘 Modal for assigning scanned token */}
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
