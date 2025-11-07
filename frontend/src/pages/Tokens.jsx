import React, { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import jsPDF from "jspdf";
import QRCodeLib from "qrcode";

export default function Tokens() {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);

  const jwt = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const headers = { Authorization: "Bearer " + jwt };

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

  // 🔹 Generate PDF (side-by-side layout)
  const generatePDF = async (tokensToPrint, pageNumber = null) => {
    if (!tokensToPrint.length) return alert("No tokens to print.");

    const doc = new jsPDF("p", "mm", "a4");

    const perPage = 15; // 3x5 grid
    const cols = 3;
    const rows = 5;

    // Box & QR geometry
    const boxWidth = 68; // mm
    const boxHeight = 55;
    const marginX = 2; // left margin
    const marginY = 2; // top margin
    const qrSize = 38; // mm
    const padding = 1; // inner padding1
    for (let i = 0; i < tokensToPrint.length; i++) {
      const token = tokensToPrint[i];
      const posIndex = i % perPage;
      const col = posIndex % cols;
      const row = Math.floor(posIndex / cols);

      const x = marginX + col * boxWidth;
      const y = marginY + row * boxHeight;

      // Draw outer box
      doc.setDrawColor(120);
      doc.setLineWidth(0.3);
      doc.rect(x, y, boxWidth - 2, boxHeight - 2, "S");

      // Generate QR
      const qrData = `${import.meta.env.VITE_API_BASE.replace("/api", "")}/api/verify/${token.token}`;
      const qrCanvas = document.createElement("canvas");
      await QRCodeLib.toCanvas(qrCanvas, qrData, { width: 200 });
      const qrImage = qrCanvas.toDataURL("image/png");

      // Coordinates
      const qrX = x + padding;
      const qrY = y + padding;
      const textStartX = qrX + qrSize + padding + 2; // right of QR

      // --- Title beside QR ---
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("DGSPGC", textStartX, qrY + 7);
      doc.text("Freshers", textStartX, qrY + 11);
      doc.text("BCA 2025", textStartX, qrY + 15);
      doc.setFontSize(23);
      doc.text(`#${i + 1 + (pageNumber ? (pageNumber - 1) * perPage : 0)}`, textStartX, qrY + 25);
      doc.setFontSize(7);
      doc.text(`${token.token}`, textStartX, qrY+29);

      // Add QR
      doc.addImage(qrImage, "PNG", qrX, qrY, qrSize, qrSize);

      // --- Token info centered below ---
      const infoY = qrY + qrSize + 8;
      const centerX = x + (boxWidth - 2) / 2;


      doc.setFontSize(7.8);


      // --- Disclaimer (safe inside box) ---
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
const disclaimer = "Valid once only. We’re not responsible for loss or misuse.";

const maxY = y + boxHeight - 4;
const disclaimerY = Math.min(infoY + 11, maxY - 4);

doc.text("View Funds At : aryanv.netlify.app", centerX, disclaimerY - 6, { align: "center" });
doc.text("Password : fresh2025", centerX, disclaimerY - 1, { align: "center" });

doc.setFontSize(6.4);
doc.text("----------------------------------------------------------------", centerX, disclaimerY + 2, { align: "center" });

// ✅ print disclaimer as one single line (no split)
doc.text(disclaimer, centerX, disclaimerY + 4, { align: "center" });


      // reset color
      doc.setTextColor(0, 0, 0);

      // Add new page every 15 tokens
      if ((i + 1) % perPage === 0 && i < tokensToPrint.length - 1) {
        doc.addPage();
      }
    }

    const filename = pageNumber
      ? `DGSPGC_Freshers2025_Page${pageNumber}.pdf`
      : "DGSPGC_Freshers2025_AllTokens.pdf";

    doc.save(filename);
  };

  // Download all tokens
  const printAllTokens = async () => generatePDF(tokens);

  // Download individual page
  const printPage = async (pageIndex) => {
    const start = pageIndex * 15;
    const end = start + 15;
    await generatePDF(tokens.slice(start, end), pageIndex + 1);
  };

  // Loading screen
  if (loading) {
    return (
      <div className="container text-center mt-5">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2">Loading tokens...</p>
      </div>
    );
  }

  // Split tokens into pages of 15
  const pages = [];
  for (let i = 0; i < tokens.length; i += 15) {
    pages.push(tokens.slice(i, i + 15));
  }

  // UI Preview
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
            <h5 className="fw-bold text-secondary mb-0">
              Page {pageIndex + 1}
            </h5>
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
                        value={`${import.meta.env.VITE_API_BASE.replace(
                          "/api",
                          ""
                        )}/api/verify/${t.token}`}
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
                      ⚠️ This token is one-time usable only. Keep it safe. It
                      will not work twice, and we are not responsible for
                      misuse.
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
