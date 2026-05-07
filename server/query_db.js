const { createClient } = require("@libsql/client");

const client = createClient({
  url: "libsql://2bit-imagamjns-anonymous.aws-ap-south-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzcxMDI3NDgsImlkIjoiMDE5ZGI1ZDQtMGYwMS03ZTFiLTg1NGEtZjA3NTRlNDA4YWQ3IiwicmlkIjoiMjlhNjJlNjAtZDE3YS00ZjAzLWJlZGItZDNlNTFhZGNkNGViIn0.k5cp9Y7hkA36Swj1jjgbThmBeu1hEEHJdMk26RNnV_NFN0VvRt8G_Kroku7jGH8i4pC9FwaoWSAaCuGAgAuvCQ"
});

async function main() {
  try {
    // Check what tables exist
    const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
    console.log("=== TABLES ===");
    tables.rows.forEach(r => console.log(" -", r.name));

    // Query leads
    const result = await client.execute("SELECT * FROM leads");
    console.log(`\n=== ${result.rows.length} LEADS FOUND ===\n`);
    result.rows.forEach((row, i) => {
      console.log(`#${i + 1} | Name: ${row.name} | Phone: ${row.phone} | Company: ${row.company || "-"} | Temp: ${row.temperature} | Source: ${row.source} | Created: ${row.created_at}`);
    });

    // Query users
    const users = await client.execute("SELECT * FROM users");
    console.log(`\n=== ${users.rows.length} USERS FOUND ===\n`);
    users.rows.forEach((row, i) => {
      console.log(`#${i + 1} | Name: ${row.full_name} | Email: ${row.email} | Phone: ${row.phone}`);
    });
  } catch (err) {
    console.error("Error:", err.message);
  }
}

main();
