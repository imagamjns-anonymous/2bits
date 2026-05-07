const app = require("./app");
const { port } = require("./config");
const { initializeDatabase } = require("./initDb");

function startServer(preferredPort, attemptsLeft = 10) {
  const server = app.listen(preferredPort, () => {
    console.log(`2 Bits running on http://localhost:${preferredPort}`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE" && attemptsLeft > 0) {
      console.warn(
        `Port ${preferredPort} is already in use. Trying http://localhost:${preferredPort + 1}`
      );
      startServer(preferredPort + 1, attemptsLeft - 1);
      return;
    }

    throw error;
  });
}

// Initialize database
initializeDatabase().catch((error) => {
  console.error("Database initialization failed.");
  console.error(error);
});

// Only start the server locally if run directly (Vercel imports it instead)
if (require.main === module) {
  startServer(port);
}

module.exports = app;
