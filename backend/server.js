import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import crypto from "crypto";
import QRCode from "qrcode";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import Token from "./models/Token.js";
import Fund from "./models/Fund.js";

dotenv.config();
const app = express();
const allowedOrigins = [
  "http://localhost:3000",       
  "https://aryanv.netlify.app", 
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) callback(null, true);
      else callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const SECRET = process.env.JWT_SECRET;

// ------------------ CONNECT TO MONGO ------------------
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ------------------ RATE LIMIT ------------------
const verifyLimiter = rateLimit({
  windowMs: 15 * 1000, // 15s
  max: 10,
  message: "Too many requests, please slow down",
});
app.use("/verify", verifyLimiter);

// ------------------ JWT Helpers ------------------
function generateToken(user) {
  return jwt.sign({ user }, SECRET, { expiresIn: "8h" });
}

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).send("No token");
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded.user; // includes role
    next();
  } catch {
    res.status(403).send("Invalid token");
  }
}

// ------------------ ROLE GUARDS ------------------
function requireMainAdmin(req, res, next) {
  if (req.user?.role !== "main_admin")
    return res.status(403).send("Access denied: main admin only");
  next();
}

// ------------------ AUTH ------------------
app.post("/login", (req, res) => {
  const { password } = req.body;

  if (password === process.env.MAIN_ADMIN_PASS) {
    const token = generateToken({ role: "main_admin" });
    return res.json({ token, role: "main_admin" });
  }

  if (password === process.env.SUB_ADMIN_PASS) {
    const token = generateToken({ role: "sub_admin" });
    return res.json({ token, role: "sub_admin" });
  }

  if (password === process.env.SCANNER_PASS) {
    const token = generateToken({ role: "scanner" });
    return res.json({ token, role: "scanner" });
  }

  res.status(401).json({ error: "Invalid password" });
});

// ------------------ GENERATE TOKENS ------------------
// ------------------ GENERATE TOKENS ------------------
app.post("/generate", verifyJWT, requireMainAdmin, async (req, res) => {
  try {
    const { total = 1 } = req.body;

    // validate input
    if (total <= 0 || total > 10000)
      return res.status(400).send("Invalid total value (must be 1–10000)");

    const tokens = [];

    for (let i = 0; i < total; i++) {
      // ensure unique token
      let tokenStr;
      let exists = true;
      while (exists) {
        tokenStr = crypto.randomBytes(8).toString("hex");
        exists = await Token.findOne({ token: tokenStr });
      }
      tokens.push({ token: tokenStr });
    }

    await Token.insertMany(tokens);
    res.send(`✅ ${total} tokens generated successfully`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error generating tokens");
  }
});



// ADMIN SCAN + VALIDATE + ASSIGN (ONE STEP)
// ------------------ ADMIN SCAN + VALIDATE + ASSIGN (ONE STEP) ------------------
app.post("/admin/scan-assign/:token", verifyJWT, async (req, res) => {
  try {
    // sanitize token param (remove accidental slashes/spaces)
    const rawToken = String(req.params.token || "").trim();
    const tokenStr = rawToken.split("/").pop().replace(/[^a-z0-9]/gi, "");

    // take request body safely
    const name = req.body?.name?.toString().trim() || "";
    const roll = req.body?.roll?.toString().trim() || "";
    const price = Number(req.body?.price) || 0;

    // basic validation: we require name and roll for assignment
    if (!name || !roll) {
      return res.status(400).json({ status: "error", message: "Missing name or roll" });
    }

    const tokenDoc = await Token.findOne({ token: tokenStr });
    if (!tokenDoc) return res.status(404).json({ status: "invalid", message: "❌ Invalid token" });

    // Already entered (used at gate)
    if (tokenDoc.entered)
      return res.json({
        status: "entered",
        message: `⚠️ Token already used by ${tokenDoc.name || "Unknown"} at ${new Date(tokenDoc.enteredAt).toLocaleString()}`,
      });

    // Already assigned
    if (tokenDoc.assigned)
      return res.json({
        status: "assigned",
        message: `✅ Token already assigned to ${tokenDoc.name} (${tokenDoc.roll}) for ₹${tokenDoc.price}`,
      });

    // Not assigned — assign it now
    tokenDoc.assigned = true;
    tokenDoc.name = name;
    tokenDoc.roll = roll;
    tokenDoc.price = price || 400;
    tokenDoc.assignedAt = new Date();
    await tokenDoc.save();

    res.json({
      status: "assigned",
      message: `✅ Token assigned successfully to ${name} (${roll}) for ₹${price || 400}`,
    });
  } catch (err) {
    console.error("ERROR /admin/scan-assign/:token:", err);
    res.status(500).json({ status: "error", message: "Server error" });
  }
});



// ------------------ GET ALL TOKENS (Main Admin Only) ------------------
app.get("/tokens", verifyJWT, requireMainAdmin, async (req, res) => {
  const tokens = await Token.find();
  res.json(tokens);
});

// ------------------ ASSIGN DIGITAL TOKEN ------------------
// ------------------ ASSIGN TOKEN ------------------
app.post("/assign", verifyJWT, requireMainAdmin, async (req, res) => {
  try {
    const { name, roll, price } = req.body;
    if (!name || !roll) return res.status(400).send("Missing name/roll");

    // Find any unassigned token (no batch filter anymore)
    const tokenDoc = await Token.findOneAndUpdate(
      { assigned: false },
      {
        assigned: true,
        name,
        roll,
        price: price || 0,
        assignedAt: new Date(),
      },
      { new: true }
    );

    if (!tokenDoc) return res.status(400).send("No unassigned tokens left");

    const qrData = `${process.env.BASE_URL}/api/verify/${tokenDoc.token}`;
    const qrImage = await QRCode.toDataURL(qrData);

    res.json({ name, roll, token: tokenDoc.token, qrImage });
  } catch (err) {
    console.error("ERROR /assign:", err);
    res.status(500).send("Server error assigning token");
  }
});


// ------------------ UPDATE TOKEN PRICE ------------------
app.put("/token/:id", verifyJWT, requireMainAdmin, async (req, res) => {
  const { price } = req.body;
  await Token.findByIdAndUpdate(req.params.id, { price });
  res.send("Price updated");
});

// ------------------ VERIFY TOKEN (Gate Scan) ------------------
app.get("/verify/:token", async (req, res) => {
  try {
    const tokenStr = req.params.token;
    const tokenDoc = await Token.findOne({ token: tokenStr });
    if (!tokenDoc) return res.send("❌ Invalid QR");

    if (!tokenDoc.assigned) return res.send("❌ Not paid / Unassigned");
    if (tokenDoc.entered) return res.send("⚠️ Already entered");

    tokenDoc.entered = true;
    tokenDoc.enteredAt = new Date();
    await tokenDoc.save();

    res.send(`✅ Access Granted: ${tokenDoc.name || "Guest"}`);
  } catch (err) {
    res.status(500).send("Server error verifying token");
  }
});

// ------------------ FUNDS ROUTES ------------------

// View funds (all roles can view)
app.get("/funds", verifyJWT, async (req, res) => {
  try {
    const transactions = await Fund.find().sort({ createdAt: -1 });
    const totalCollected = (await Token.find()).reduce(
      (a, b) => a + (b.price || 0),
      0
    );
    const totalAdded = transactions
      .filter((t) => t.type === "add")
      .reduce((a, b) => a + b.amount, 0);
    const totalWithdrawn = transactions
      .filter((t) => t.type === "withdraw")
      .reduce((a, b) => a + b.amount, 0);

    const totalFunds = totalCollected + totalAdded - totalWithdrawn;
    res.json({ totalFunds, totalCollected, transactions });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching funds");
  }
});

// Add funds (Main Admin only)
app.post("/funds/add", verifyJWT, requireMainAdmin, async (req, res) => {
  const { amount, reason, source } = req.body;
  if (!amount || !reason) return res.status(400).send("Missing fields");
  await Fund.create({
    type: "add",
    amount,
    reason,
    source: source || "external",
  });
  res.send("Funds added");
});

// Withdraw funds (Main Admin only)
app.post(
  "/funds/withdraw",
  verifyJWT,
  requireMainAdmin,
  async (req, res) => {
    const { amount, reason } = req.body;
    if (!amount || !reason) return res.status(400).send("Missing fields");
    await Fund.create({
      type: "withdraw",
      amount,
      reason,
      source: "expense",
    });
    res.send("Funds withdrawn");
  }
);

// ------------------ RESET ENTRY (Main Admin only) ------------------

// ------------------ DEFAULT ------------------
app.get("/", (req, res) => res.send("🎉 Fresher Party QR Backend Running"));

const server = app.listen(PORT, () =>{
 console.log(`Server running at ${PORT}`);
setInterval(async () => {
  try {
    await fetch("https://aryanfreshers.onrender.com/");
  } catch {}
}, 10 * 60 * 1000); // every 10 minutes
});
