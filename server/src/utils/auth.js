const crypto = require("crypto");

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");

  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, hash] = String(storedHash || "").split(":");

  if (!salt || !hash) {
    return false;
  }

  const derived = crypto.scryptSync(password, salt, 64);
  const hashBuffer = Buffer.from(hash, "hex");

  return hashBuffer.length === derived.length && crypto.timingSafeEqual(hashBuffer, derived);
}

function generateSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateSessionToken,
};
