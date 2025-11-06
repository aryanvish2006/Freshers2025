import React, { useEffect, useState } from "react";

export default function Funds() {
  const [funds, setFunds] = useState([]);
  const [totalFunds, setTotalFunds] = useState(0);
  const [totalCollected, setTotalCollected] = useState(0);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [type, setType] = useState("add");
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token) window.location = "/";

  const headers = {
    Authorization: "Bearer " + token,
    "Content-Type": "application/json",
  };

  // Fetch all funds + totals
  const fetchFunds = async () => {
    setLoading(true);
    const res = await fetch(`${import.meta.env.VITE_API_BASE}/funds`, {
      headers,
    });
    const data = await res.json();
    setFunds(data.transactions || []);
    setTotalFunds(data.totalFunds || 0);
    setTotalCollected(data.totalCollected || 0);
    setLoading(false);
  };

  const submitFund = async () => {
    if (!amount || !reason) return alert("Please fill all fields");
    const endpoint =
      type === "add"
        ? `${import.meta.env.VITE_API_BASE}/funds/add`
        : `${import.meta.env.VITE_API_BASE}/funds/withdraw`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ amount, reason }),
    });

    if (res.ok) {
      alert(type === "add" ? "Funds added" : "Funds withdrawn");
      setAmount("");
      setReason("");
      fetchFunds();
    } else {
      alert("Failed");
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
