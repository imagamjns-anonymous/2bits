const express = require("express");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { corsOrigin, publicDir } = require("./config");
const authRoutes = require("./routes/auth");
const leadRoutes = require("./routes/leads");
const uploadRoutes = require("./routes/uploads");
const ocrRoutes    = require("./routes/ocr");
const { errorHandler } = require("./middleware/errorHandler");

const app = express();

// ─── Security Headers (Helmet) ──────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false, // Disabled to allow CDN scripts (Chart.js, Tesseract, etc.)
    crossOriginEmbedderPolicy: false,
  })
);

// ─── Rate Limiting ───────────────────────────────────────────────────────────
// Strict limiter for login: max 3 attempts per 24 hours per IP
const loginLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Access denied. You have exceeded the maximum login attempts. Please contact 2 Bits Assistance at 2bitsassistance@gmail.com or call 9217673407 to regain access.",
  },
});

// General API limiter: max 200 requests per minute per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests. Please slow down.",
  },
});

app.use(
  cors({
    origin: corsOrigin === "*" ? true : corsOrigin.split(","),
  })
);
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));
app.use("/uploads", express.static(path.resolve(__dirname, "..", "uploads")));
app.use(express.static(publicDir));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api", (_req, res) => {
  res.json({
    name: "2 Bits API",
    version: "1.0.0",
    routes: {
      health: "/health",
      leads: "/api/leads",
      stats: "/api/leads/stats",
      export: "/api/leads/export/csv",
      uploads: "/api/uploads/card",
    },
  });
});

// Apply login rate limiter to auth routes only
app.use("/api/auth", loginLimiter, authRoutes);
// Apply general rate limiter to all other API routes
app.use("/api/leads",   apiLimiter, leadRoutes);
app.use("/api/uploads", apiLimiter, uploadRoutes);
app.use("/api/ocr",     apiLimiter, ocrRoutes);

app.get("/login", (_req, res) => {
  res.sendFile(path.join(publicDir, "login.html"));
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.use(errorHandler);

module.exports = app;
