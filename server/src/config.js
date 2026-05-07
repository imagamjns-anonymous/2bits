const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

module.exports = {
  port: Number(process.env.PORT || 4000),
  baseUrl: process.env.BASE_URL || "http://localhost:4000",
  corsOrigin: process.env.CORS_ORIGIN || "*",
  databaseUrl:
    (process.env.DATABASE_URL || "libsql://localhost:8080").trim().replace(/['"]/g, ''),
  databaseAuthToken: (process.env.DATABASE_AUTH_TOKEN || "").trim().replace(/['"]/g, ''),
  uploadsDir: path.resolve(__dirname, "..", "uploads"),
  publicDir: path.resolve(__dirname, "..", "public"),
};
