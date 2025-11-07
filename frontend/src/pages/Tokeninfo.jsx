import React, { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import jsPDF from "jspdf";

export default function Tokens() {
  const [tokens, setTokens] = useState([]);
  const [visibleCount, setVisibleCount] = useState(20);
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editedPrice, setEditedPrice] = useState(0);
  const [search, setSearch] = useState("");

  const jwt = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const headers = { Authorization: "Bearer " + jwt, "Content-Type": "application/json" };

  // Protect access
  if (!jwt) window.location = "/";
  if (role !== "main_admin") {
    if (role === "sub_admin") window.location = "/funds";
    else if (role === "scanner") window.location = "/scanner";
    else window.location = "/";
  }

  // Fetch all tokens
  const fetchTokens = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/tokens`, { headers });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setTokens(data);
    } catch (err) {
      alert("Failed to load tokens: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, []);

  const updatePrice = async (id) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/token/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ price: editedPrice }),
      });
      if (!res.ok) throw new Error(await res.text());
      setEditingId(null);
      fetchTokens();
    } catch (err) {
      alert("Failed to update price: " + err.message);
    }
  };

  // Derived lists
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

  // Tab filtering
  let activeList = tokens;
  if (activeTab === "unassigned") activeList = unassigned;
  else if (activeTab === "assigned") activeList = assigned;
  else if (activeTab === "entered") activeList = entered;

  // Search filter
  const filteredTokens = activeList.filter(
    (t) =>
      t.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.roll?.toLowerCase().includes(search.toLowerCase()) ||
      t.token?.toLowerCase().includes(search.toLowerCase())
  );

  const visibleTokens = filteredTokens.slice(0, visibleCount);

  // PRINT FEATURE (15 per page, all tokens)
  const printTokens = async () => {
    const tokensToPrint = tokens;
    if (!tokensToPrint.length) return alert("No tokens to print.");

    const doc = new jsPDF("p", "mm", "a4");
    const perPage = 15;
    const qrSize = 35;
    const marginX = 20;
    const marginY = 20;
    const cols = 5;
    const gapX = 35;
    const gapY = 50;

    for (let i = 0; i < tokensToPrint.length; i++) {
      const token = tokensToPrint[i];
      const pageIndex = Math.floor(i / perPage);
      const col = i % cols;
      const row = Math.floor((i % perPage) / cols);
      const x = marginX + col * gapX;
      const y = marginY + row * gapY;

      const qrData = `${import.meta.env.VITE_API_BASE.replace("/api", "")}/api/verify/${token.token}`;
      const qrCanvas = document.createElement("canvas");
      const qr = new QRCode({ value: qrData });
      // workaround for react-qr-code generation for PDF
      const qrImg = document.createElement("img");
      qrImg.src = document.querySelector(`canvas[data-token='${token.token}']`)?.toDataURL("image/png") || "";

      // Fallback: generate basic text-based placeholder if missing
      if (!qrImg.src) {
        doc.text(`${token.token}`, x, y + 4);
      }

      doc.setFontSize(8);
      doc.text(`${token.name || "Unassigned"}`, x, y + qrSize + 6);
      doc.text(`Roll: ${token.roll || "-"}`, x, y + qrSize + 11);
      doc.text(`₹${token.price || 0}`, x, y + qrSize + 16);

      if ((i + 1) % perPage === 0 && i < tokensToPrint.length - 1) {
        doc.addPage();
      }
    }

    doc.save("all_tokens.pdf");
  };

  return (
    <div className="container py-4">
      <h2 className="text-primary fw-bold mb-3">🎫 Tokens Overview</h2>

      {/* Summary */}
      <div className="row g-3 mb-4">
        {[
          { title: "Total Tokens", val: tokens.length, color: "primary" },
          { title: "Unassigned", val: unassigned.length, color: "warning" },
          { title: "Assigned", val: assigned.length, color: "success" },
          { title: "Entered", val: entered.length, color: "dark" },
        ].map((c, i) => (
          <div className="col-md-3 col-6" key={i}>
            <div className={`card text-bg-${c.color} text-center`}>
              <div className="card-body">
                <h6>{c.title}</h6>
                <h4>{c.val}</h4>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="alert alert-info text-center">
        <strong>Total ₹ Collected:</strong> ₹{totalPaid}
      </div>

      {/* Search + Print */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-3 gap-2">
        <input
          className="form-control w-100 w-md-50"
          placeholder="Search by name, roll, or token..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn btn-primary" onClick={printTokens}>
          🖨 Print All Tokens
        </button>
      </div>

      {/* Tabs */}
      <ul className="nav nav-pills justify-content-center mb-3">
        {["all", "unassigned", "assigned", "entered"].map((tab) => (
          <li className="nav-item" key={tab}>
            <button
              className={`nav-link ${activeTab === tab ? "active" : ""}`}
              onClick={() => {
                setActiveTab(tab);
                setVisibleCount(20);
              }}
            >
              {tab[0].toUpperCase() + tab.slice(1)}
            </button>
          </li>
        ))}
      </ul>

      {/* Token Cards */}
      <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3">
        {visibleTokens.map((t) => (
          <div className="col" key={t._id}>
            <div
              className={`card h-100 shadow-sm border-${
                t.entered ? "success" : t.assigned ? "primary" : "secondary"
              }`}
            >
              <div className="card-body">
                <h5 className="card-title fw-bold">{t.name || "Unassigned"}</h5>
                <p className="mb-1">
                  <strong>Roll:</strong> {t.roll || "-"}
                </p>
                <p className="mb-2">
                  <strong>Price:</strong> ₹{t.price || 0}{" "}
                  {editingId === t._id ? (
                    <>
                      <input
                        type="number"
                        className="form-control form-control-sm d-inline-block w-25 ms-2"
                        value={editedPrice}
                        onChange={(e) => setEditedPrice(e.target.value)}
                      />
                      <button
                        className="btn btn-success btn-sm ms-2"
                        onClick={() => updatePrice(t._id)}
                      >
                        Save
                      </button>
                      <button
                        className="btn btn-secondary btn-sm ms-2"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      className="btn btn-sm btn-outline-primary ms-2"
                      onClick={() => {
                        setEditingId(t._id);
                        setEditedPrice(t.price || 0);
                      }}
                    >
                      Edit
                    </button>
                  )}
                </p>

                <p className="small text-muted">
                  Assigned: {t.assignedAt ? new Date(t.assignedAt).toLocaleString() : "-"}
                  <br />
                  Entered: {t.enteredAt ? new Date(t.enteredAt).toLocaleString() : "-"}
                </p>

                <div className="text-center mt-3">
                  <div className="bg-white d-inline-block p-2 border rounded">
                    <QRCode
                      value={`${import.meta.env.VITE_API_BASE.replace("/api", "")}/api/verify/${t.token}`}
                      size={100}
                    />
                  </div>
                </div>

                <div className="mt-3 text-center">
                  <span
                    className={`badge ${
                      t.entered ? "bg-success" : t.assigned ? "bg-primary" : "bg-secondary"
                    }`}
                  >
                    {t.entered ? "Entered" : t.assigned ? "Issued" : "Not Assigned"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Show More */}
      {visibleCount < filteredTokens.length && (
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
