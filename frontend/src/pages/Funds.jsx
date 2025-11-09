import React, { useEffect, useState } from "react";

export default function Funds() {
  const [funds, setFunds] = useState([]);
  const [totalFunds, setTotalFunds] = useState(0);
  const [totalCollected, setTotalCollected] = useState(0);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [type, setType] = useState("add");
  const [loading, setLoading] = useState(true);

  const role = localStorage.getItem("role");

  // 🔐 Redirect unauthenticated users
  if (!role) window.location = "/";

  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  // 🔄 Fetch all funds + totals
  const fetchFunds = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/funds`, {
        credentials: "include", // ✅ Send cookie
      });

      if (res.status === 401 || res.status === 403) {
        // Session expired or invalid
        localStorage.removeItem("role");
        window.location = "/";
        return;
      }

      const data = await res.json();
      setFunds(data.transactions || []);
      setTotalFunds(data.totalFunds || 0);
      setTotalCollected(data.totalCollected || 0);
    } catch (err) {
      console.error("Error fetching funds:", err);
      alert("Failed to load funds data.");
    } finally {
      setLoading(false);
    }
  };

  // 💾 Add or withdraw funds
  const submitFund = async () => {
    if (!amount || !reason) return alert("Please fill all fields");

    const endpoint =
      type === "add" ? `${API_BASE}/funds/add` : `${API_BASE}/funds/withdraw`;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        credentials: "include", // ✅ Send cookie
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, reason }),
      });

      if (res.ok) {
        alert(type === "add" ? "Funds added" : "Funds withdrawn");
        setAmount("");
        setReason("");
        fetchFunds();
      } else if (res.status === 403 || res.status === 401) {
        alert("Session expired. Please log in again.");
        localStorage.removeItem("role");
        window.location = "/";
      } else {
        alert("Failed to update funds.");
      }
    } catch (err) {
      console.error("Error submitting fund transaction:", err);
      alert("Network error while submitting transaction.");
    }
  };

  useEffect(() => {
    fetchFunds();
  }, []);

  if (loading)
    return (
      <div className="container text-center mt-5">
        <div className="spinner-border text-primary"></div>
        <p>Loading funds...</p>
      </div>
    );

  return (
    <div className="container py-4">
      <h2 className="text-primary fw-bold mb-4">💰 Fund Management</h2>

      {/* Summary */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card text-bg-success text-center">
            <div className="card-body">
              <h6>Total Funds Available</h6>
              <h3>₹{totalFunds}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card text-bg-info text-center">
            <div className="card-body">
              <h6>Collected from Tokens</h6>
              <h3>₹{totalCollected}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card text-bg-dark text-center">
            <div className="card-body">
              <h6>Total Transactions</h6>
              <h3>{funds.length}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Add / Withdraw Form - visible only to main_admin */}
      {role === "main_admin" && (
        <div className="card p-3 mb-4 shadow-sm">
          <h5>➕ Manage Funds</h5>
          <div className="d-flex flex-column flex-md-row gap-2 mt-2">
            <select
              className="form-select w-auto"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="add">Add Funds</option>
              <option value="withdraw">Withdraw Funds</option>
            </select>
            <input
              type="number"
              className="form-control"
              placeholder="Amount (₹)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <input
              type="text"
              className="form-control"
              placeholder="Reason / Purpose"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <button className="btn btn-primary" onClick={submitFund}>
              {type === "add" ? "Add" : "Withdraw"}
            </button>
          </div>
        </div>
      )}

      {/* Transactions */}
      <h5 className="mb-3">📜 Transaction History</h5>
      {funds.length === 0 ? (
        <p className="text-muted">No transactions yet.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped table-hover align-middle">
            <thead className="table-dark">
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Amount (₹)</th>
                <th>Purpose</th>
              </tr>
            </thead>
            <tbody>
              {funds.map((f, i) => (
                <tr key={i}>
                  <td>{new Date(f.createdAt).toLocaleString()}</td>
                  <td>
                    <span
                      className={`badge ${
                        f.type === "add" ? "bg-success" : "bg-danger"
                      }`}
                    >
                      {f.type.toUpperCase()}
                    </span>
                  </td>
                  <td>{f.amount}</td>
                  <td>{f.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sub-admin note */}
      {role === "sub_admin" && (
        <div className="alert alert-secondary mt-4 text-center">
          👁️ Read-only mode: You can only view transactions.
        </div>
      )}
    </div>
  );
}
