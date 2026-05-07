module.exports = (req, res) => {
  try {
    const app = require("../src/app");
    const { initializeDatabase } = require("../src/initDb");

    // Start DB initialization in the background
    initializeDatabase().catch((error) => {
      console.error("Database initialization failed on Vercel.");
      console.error(error);
    });

    // Pass the request to Express
    return app(req, res);
  } catch (err) {
    console.error("CRASH ERROR:", err);
    res.status(500).json({
      error: "Vercel Boot Crash",
      message: err.message,
      stack: err.stack
    });
  }
};
