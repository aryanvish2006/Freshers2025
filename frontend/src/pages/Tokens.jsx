import React, { useEffect, useState } from "react";
import QRCode from "react-qr-code";

export default function Tokens() {
  const [tokens, setTokens] = useState([]);
  const [visibleCount, setVisibleCount] = useState(20);
  const [activeTab, setActiveTab] = useState("assigned");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editedPrice, setEditedPrice] = useState(0);

  const jwt = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  // ✅ Role-based access protection
  if (!jwt) window.location = "/";
  if (role !== "main_admin") {
    if (role === "sub_admin") window.location = "/funds";
    else if (role === "scanner") window.location = "/scanner";
    else window.location = "/";
  }

  const headers = { Authorization: "Bearer " + jwt };

  // Fetch tokens
  const fetchTokens = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/tokens`, {
        headers,
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setTokens(data);
    } catch (err) {
      alert("Failed to load tokens: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const updatePrice = async (id) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/token/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ price: editedPrice }),
      });
      if (!res.ok) throw new Error(await res.text());
      setEditingId(null);
      fetchTokens();
    } catch (err) {
      alert("Failed to update price: " + err.message);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, []);

  const unassigned = tokens.filter((t) => !t.assigned);
  const assigned = tokens.filter((t) => t.assigned && !t.entered);
  const entered = tokens.filter((t) => t.entered);

  const totalPaid = tokens.reduce((sum, t) => sum + (t.price || 0), 0);

  if (loading) {
    return (
      <div className="container text-center mt-5">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2">Loading tokens...</p>
      </div>
    );
  }

  // Get active list
  const activeList =
    activeTab === "assigned"
      ? assigned
      : activeTab === "unassigned"
      ? unassigned
      : entered;

  const visibleTokens = activeList.slice(0, visibleCount);

  return (
    <div className="container py-4">
      <h2 className="text-primary fw-bold mb-3">🎫 Tokens Overview</h2>

      {/* Summary */}
      <div className="row g-3 mb-4">
        <div className="col-md-3 col-6">
          <div className="card text-bg-primary text-center">
            <div className="card-body">
              <h6>Total Tokens</h6>
              <h4>{tokens.length}</h4>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div className="card text-bg-warning text-center">
            <div className="card-body">
              <h6>Unassigned</h6>
              <h4>{unassigned.length}</h4>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div className="card text-bg-success text-center">
            <div className="card-body">
              <h6>Assigned</h6>
              <h4>{assigned.length}</h4>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div className="card text-bg-dark text-center">
            <div className="card-body">
              <h6>Entered</h6>
              <h4>{entered.length}</h4>
            </div>
          </div>
        </div>
      </div>

      <div className="alert alert-info text-center">
        <strong>Total ₹ Collected:</strong> ₹{totalPaid}
      </div>

      {/* Tabs */}
      <ul className="nav nav-pills justify-content-center mb-3">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "assigned" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("assigned");
              setVisibleCount(20);
            }}
          >
            Assigned
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "unassigned" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("unassigned");
              setVisibleCount(20);
            }}
          >
            Unassigned
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "entered" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("entered");
              setVisibleCount(20);
            }}
          >
            Entered
          </button>
        </li>
      </ul>

      {/* Token cards */}
      <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3">
        {visibleTokens.map((t) => (
          <div className="col" key={t._id}>
            <div
              className={`card h-100 shadow-sm border-${
                t.entered
                  ? "success"
                  : t.assigned
                  ? "primary"
                  : "secondary"
              }`}
            >
              <div className="card-body">
                <h5 className="card-title fw-bold">{t.name || "Unassigned"}</h5>
                <p className="mb-1">
                  <strong>Roll:</strong> {t.roll || "-"}
                </p>
                <p className="mb-1">
                  <strong>Batch:</strong> {t.batch}
                </p>

                {/* Editable Price (main_admin only) */}
                {editingId === t._id ? (
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <input
                      type="number"
                      className="form-control form-control-sm w-50"
                      value={editedPrice}
                      onChange={(e) => setEditedPrice(e.target.value)}
                    />
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => updatePrice(t._id)}
                    >
                      Save
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <p className="mb-2">
                    <strong>Price:</strong> ₹{t.price || 0}{" "}
                    <button
                      className="btn btn-sm btn-outline-primary ms-2"
                      onClick={() => {
                        setEditingId(t._id);
                        setEditedPrice(t.price || 0);
                      }}
                    >
                      Edit
                    </button>
                  </p>
                )}

                <p className="small text-muted">
                  Assigned:{" "}
                  {t.assignedAt
                    ? new Date(t.assignedAt).toLocaleString()
                    : "-"}
                  <br />
                  Entered:{" "}
                  {t.enteredAt ? new Date(t.enteredAt).toLocaleString() : "-"}
                </p>

                {/* QR for assigned tokens */}
                {t.assigned && (
                  <div className="text-center mt-3">
                    <div className="bg-white d-inline-block p-2 border rounded">
                      <QRCode
                        value={`${import.meta.env.VITE_API_BASE.replace(
                          "/api",
                          ""
                        )}/api/verify/${t.token}`}
                        size={100}
                      />
                    </div>
                  </div>
                )}

                <div className="mt-3 text-center">
                  <span
                    className={`badge ${
                      t.entered
                        ? "bg-success"
                        : t.assigned
                        ? "bg-primary"
                        : "bg-secondary"
                    }`}
                  >
                    {t.entered
                      ? "Entered"
                      : t.assigned
                      ? "Issued"
                      : "Not Assigned"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Show More Button */}
      {visibleCount < activeList.length && (
        <div className="text-center mt-4">
          <button
            className="btn btn-outline-primary"
            onClick={() => setVisibleCount(visibleCount + 20)}
          >
            Show More
          </button>
        </div>
      )}
    </div>
  );
}
