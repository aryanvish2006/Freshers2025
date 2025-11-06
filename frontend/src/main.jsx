import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

// ✅ Bootstrap CSS (MUST be before custom CSS)
import "bootstrap/dist/css/bootstrap.min.css";

// (optional) Bootstrap JS (for dropdowns/modals)
import "bootstrap/dist/js/bootstrap.bundle.min.js";

import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
