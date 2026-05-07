const fs = require("fs");
const path = require("path");
const db = require("./db");

let isInMemoryMode = false;

async function initializeDatabase() {
  try {
    // 1. Test connection first
    await db.query("SELECT 1");
    isInMemoryMode = false;
    
    // 2. Try to initialize schema
    try {
      const initSqlPath = path.resolve(__dirname, "..", "sql", "init.sql");
      const initSql = fs.readFileSync(initSqlPath, "utf8");
      
      const statements = initSql
        .split(";")
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.toLowerCase().includes("trigger")); // skip triggers for now
        
      for (const stmt of statements) {
        await db.query(stmt);
      }
    } catch (schemaErr) {
      console.warn("Schema init warning (safe to ignore if tables exist):", schemaErr.message);
    }
  } catch (error) {
    console.error("Database connection failed:", error.message);
    console.warn("Running in preview mode with in-memory storage.");
    isInMemoryMode = true;
  }
}

function isMemoryMode() {
  return isInMemoryMode;
}

module.exports = {
  initializeDatabase,
  isMemoryMode,
};
