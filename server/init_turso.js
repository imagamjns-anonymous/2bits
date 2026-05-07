const { createClient } = require("@libsql/client");
const fs = require("fs");
const path = require("path");

const client = createClient({
  url: "libsql://2bit-imagamjns-anonymous.aws-ap-south-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzcxMDI3NDgsImlkIjoiMDE5ZGI1ZDQtMGYwMS03ZTFiLTg1NGEtZjA3NTRlNDA4YWQ3IiwicmlkIjoiMjlhNjJlNjAtZDE3YS00ZjAzLWJlZGItZDNlNTFhZGNkNGViIn0.k5cp9Y7hkA36Swj1jjgbThmBeu1hEEHJdMk26RNnV_NFN0VvRt8G_Kroku7jGH8i4pC9FwaoWSAaCuGAgAuvCQ"
});

async function main() {
  const initSql = fs.readFileSync(path.join(__dirname, "sql", "init.sql"), "utf8");
  
  // Split by semicolons and run each statement
  const statements = initSql
    .split(";")
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const stmt of statements) {
    try {
      await client.execute(stmt);
      console.log("✓", stmt.substring(0, 60) + "...");
    } catch (err) {
      console.error("✗", stmt.substring(0, 60) + "...");
      console.error("  Error:", err.message);
    }
  }

  // Verify
  const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
  console.log("\n=== TABLES CREATED ===");
  tables.rows.forEach(r => console.log(" -", r.name));
  console.log("\nDatabase initialized successfully!");
}

main();
