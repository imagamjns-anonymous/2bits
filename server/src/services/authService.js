const db = require("../db");
const { generateSessionToken, hashPassword, verifyPassword } = require("../utils/auth");

const SHORT_SESSION_MS = 1000 * 60 * 60 * 24;
const REMEMBERED_SESSION_MS = 1000 * 60 * 60 * 24 * 30;

function mapUser(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email || "",
    phone: row.phone || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeContactFields(payload) {
  const email = payload.email ? payload.email.trim().toLowerCase() : "";
  const phone = payload.phone ? payload.phone.trim() : "";

  return {
    email: email || null,
    phone: phone || null,
  };
}

async function createUser(payload) {
  const contact = normalizeContactFields(payload);
  const result = await db.query(
    `
      INSERT INTO users (full_name, email, phone, password_hash)
      VALUES (?, ?, ?, ?)
      RETURNING *
    `,
    [payload.fullName.trim(), contact.email, contact.phone, hashPassword(payload.password)]
  );

  return mapUser(result.rows[0]);
}

async function findUserByIdentifier(identifier) {
  const value = identifier.trim();
  const result = await db.query(
    `
      SELECT *
      FROM users
      WHERE email = LOWER(?) OR phone = ?
      LIMIT 1
    `,
    [value, value]
  );

  return result.rows[0] || null;
}

async function authenticateUser(identifier, password) {
  const user = await findUserByIdentifier(identifier);

  if (!user || !verifyPassword(password, user.password_hash)) {
    return null;
  }

  return mapUser(user);
}

async function createSession(userId, rememberMe) {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + (rememberMe ? REMEMBERED_SESSION_MS : SHORT_SESSION_MS));

  const { isMemoryMode } = require("../initDb");
  if (!isMemoryMode()) {
    await db.query(
      `
        INSERT INTO user_sessions (user_id, token, remember_me, expires_at)
        VALUES (?, ?, ?, ?)
      `,
      [userId, token, rememberMe, expiresAt.toISOString()]
    );
  }

  return {
    token,
    expiresAt,
  };
}

async function getSessionUser(token) {
  const { isMemoryMode } = require("../initDb");
  if (isMemoryMode()) {
    return { id: 999, fullName: "Mock User", phone: "+9100000000" };
  }

  const result = await db.query(
    `
      SELECT users.*
      FROM user_sessions
      INNER JOIN users ON users.id = user_sessions.user_id
      WHERE user_sessions.token = ?
        AND user_sessions.expires_at > CURRENT_TIMESTAMP
      LIMIT 1
    `,
    [token]
  );

  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

async function deleteSession(token) {
  const { isMemoryMode } = require("../initDb");
  if (!isMemoryMode()) {
    await db.query("DELETE FROM user_sessions WHERE token = ?", [token]);
  }
}

module.exports = {
  createUser,
  authenticateUser,
  createSession,
  getSessionUser,
  deleteSession,
};
