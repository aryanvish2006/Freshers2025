import React, { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import jsPDF from "jspdf";
import QRCodeLib from "qrcode";

export default function Tokens() {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);

  const role = localStorage.getItem("role");
  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  // 🔐 Frontend protection
  if (!role) window.location = "/";
  if (role !== "main_admin") {
    if (role === "sub_admin") window.location = "/funds";
    else if (role === "scanner") window.location = "/scanner";
    else window.location = "/";
  }

  // 🧾 Fetch all tokens
  const fetchTokens = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/tokens`, {
        credentials: "include", // ✅ send secure cookie
      });

      // Handle expired or invalid session
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem("role");
        window.location = "/";
        return;
      }

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

  // 🖨 Generate PDF in 3×5 layout
  const generatePDF = async (tokensToPrint, pageNumber = null) => {
    if (!tokensToPrint.length) return alert("No tokens to print.");

    const doc = new jsPDF("p", "mm", "a4");
    const perPage = 15;
    const cols = 3;
    const rows = 5;

    const boxWidth = 68;
    const boxHeight = 55;
    const marginX = 2;
    const marginY = 2;
    const qrSize = 38;
    const padding = 1;

    for (let i = 0; i < tokensToPrint.length; i++) {
      const token = tokensToPrint[i];
      const posIndex = i % perPage;
      const col = posIndex % cols;
      const row = Math.floor(posIndex / cols);
      const x = marginX + col * boxWidth;
      const y = marginY + row * boxHeight;

      // Box outline
      doc.setDrawColor(120);
      doc.setLineWidth(0.3);
      doc.rect(x, y, boxWidth - 2, boxHeight - 2, "S");

      // Generate QR (use qrcode lib)
      const qrData = `${API_BASE.replace("/api", "")}/api/verify/${token.token}`;
      const qrCanvas = document.createElement("canvas");
      await QRCodeLib.toCanvas(qrCanvas, qrData, { width: 200 });
      const qrImage = qrCanvas.toDataURL("image/png");

      // Layout positions
      const qrX = x + padding;
      const qrY = y + padding;
      const textStartX = qrX + qrSize + padding ;

      // Text: header and token #
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("DGSPGC", textStartX, qrY + 7);
      doc.setFontSize(8);
      doc.text("Department", textStartX, qrY + 12);
      doc.text("BCA 2025", textStartX, qrY + 16);
      doc.setFontSize(23);
      doc.text(`#${i + 1 + (pageNumber ? (pageNumber - 1) * perPage : 0)}`, textStartX, qrY + 26);
      doc.setFontSize(7);
      doc.text(`${token.token}`, textStartX, qrY + 30);

      // Add QR image
      doc.addImage(qrImage, "PNG", qrX, qrY, qrSize, qrSize);

      // Footer info
      const centerX = x + (boxWidth - 2) / 2;
      const disclaimer = "Valid once only. We’re not responsible for loss or misuse :)";
      const maxY = y + boxHeight - 4;
      const disclaimerY = maxY - 8;

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("BCA CULTURAL PROGRAM 15-11-2025", centerX, disclaimerY-3 , { align: "center" });
      doc.setFontSize(9);
      doc.setFont("helvetica", "underline");
      doc.text("Query ? Contact : aryanvish.netlify.app", centerX, disclaimerY+2 , { align: "center" });
      doc.setFontSize(6.4);
      doc.text("----------------------------------------------------------------------------", centerX, disclaimerY + 5, { align: "center" });
      doc.text(disclaimer, centerX, disclaimerY + 8, { align: "center" });

      // New page after every 15 tokens
      if ((i + 1) % perPage === 0 && i < tokensToPrint.length - 1) {
        doc.addPage();
      }
    }

    const filename = pageNumber
      ? `DGSPGC_Freshers2025_Page${pageNumber}.pdf`
      : "DGSPGC_Freshers2025_AllTokens.pdf";
    doc.save(filename);
  };

  // 🖨 Print handlers
  const printAllTokens = async () => generatePDF(tokens);
  const printPage = async (pageIndex) => {
    const start = pageIndex * 15;
    const end = start + 15;
    await generatePDF(tokens.slice(start, end), pageIndex + 1);
  };

  if (loading)
    return (
      <div className="container text-center mt-5">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2">Loading tokens...</p>
      </div>
    );

  // Split into pages
  const pages = [];
  for (let i = 0; i < tokens.length; i += 15) {
    pages.push(tokens.slice(i, i + 15));
  }

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-2">
        <h2 className="text-primary fw-bold">🎫 DGSPGC Tokens Dashboard</h2>
        <button className="btn btn-success shadow-sm" onClick={printAllTokens}>
          🖨 Print All Tokens
        </button>
      </div>

      <div className="alert alert-info text-center mb-4 shadow-sm">
        Total Tokens: <strong>{tokens.length}</strong> | Pages:{" "}
        <strong>{Math.ceil(tokens.length / 15)}</strong>
      </div>

      {pages.map((page, pageIndex) => (
        <div
          key={pageIndex}
          className="mb-5 border rounded shadow-sm p-3 bg-white"
          style={{ borderTop: "4px solid #0d6efd" }}
        >
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h5 className="fw-bold text-secondary mb-0">Page {pageIndex + 1}</h5>
            <button
              className="btn btn-outline-primary btn-sm"
              onClick={() => printPage(pageIndex)}
            >
              💾 Download This Page
            </button>
          </div>

          <div className="row row-cols-1 row-cols-md-3 g-3">
            {page.map((t, i) => (
              <div className="col" key={t._id}>
                <div
                  className="card text-center border-primary h-100 shadow-sm"
                  style={{
                    borderWidth: "1px",
                    borderRadius: "10px",
                    background: "#f9fbff",
                  }}
                >
                  <div className="card-body p-2 d-flex flex-column align-items-center">
                    <div className="d-flex align-items-start justify-content-center gap-2 mb-1">
                      <QRCode
                        value={`${API_BASE.replace("/api", "")}/api/verify/${t.token}`}
                        size={70}
                      />
                      <div className="text-start ms-1">
                        <h6 className="fw-bold text-primary mb-0">DGSPGC</h6>
                        <p className="fw-semibold text-primary mb-0 small">
                          FRESHERS 2025
                        </p>
                      </div>
                    </div>
                    <p className="small text-dark fw-semibold mb-1">
                      {t.token}
                    </p>
                    <p className="small text-muted mb-0">
                      Token #{pageIndex * 15 + i + 1}
                    </p>
                    <p
                      className="small text-danger mt-1"
                      style={{ fontSize: "10px", lineHeight: "1.2" }}
                    >
                      ⚠️ One-time use only. Not responsible for misuse.
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
