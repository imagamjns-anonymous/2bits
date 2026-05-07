const authService = require("../services/authService");

function normalizeAuthPayload(body) {
  return {
    fullName: typeof body.fullName === "string" ? body.fullName.trim() : "",
    email: typeof body.email === "string" ? body.email.trim() : "",
    phone: typeof body.phone === "string" ? body.phone.trim() : "",
    identifier: typeof body.identifier === "string" ? body.identifier.trim() : "",
    password: typeof body.password === "string" ? body.password : "",
    rememberMe: Boolean(body.rememberMe),
  };
}

function validateRegisterPayload(payload) {
  if (!payload.fullName) {
    return "Full name is required.";
  }

  if (!payload.email && !payload.phone) {
    return "Email or phone is required.";
  }

  if (!payload.password || payload.password.length < 6) {
    return "Password must be at least 6 characters.";
  }

  return null;
}

function validateLoginPayload(payload) {
  if (!payload.identifier) {
    return "Email or phone is required.";
  }

  if (!payload.password) {
    return "Password is required.";
  }

  return null;
}

async function register(req, res, next) {
  try {
    const payload = normalizeAuthPayload(req.body);
    const validationError = validateRegisterPayload(payload);

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const user = await authService.createUser(payload);
    const session = await authService.createSession(user.id, payload.rememberMe);

    res.status(201).json({
      data: {
        user,
        token: session.token,
        expiresAt: session.expiresAt,
      },
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        error: "An account with this email or phone already exists.",
      });
    }

    next(error);
  }
}

async function login(req, res, next) {
  try {
    const payload = normalizeAuthPayload(req.body);
    const validationError = validateLoginPayload(payload);

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const user = await authService.authenticateUser(payload.identifier, payload.password);

    if (!user) {
      return res.status(401).json({ error: "Invalid email, phone, or password." });
    }

    const session = await authService.createSession(user.id, payload.rememberMe);

    res.json({
      data: {
        user,
        token: session.token,
        expiresAt: session.expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function me(req, res) {
  res.json({ data: req.auth.user });
}

async function logout(req, res, next) {
  try {
    await authService.deleteSession(req.auth.token);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

async function firebaseLogin(req, res, next) {
  try {
    const { uid, identifier, displayName } = req.body;

    if (!uid || !identifier) {
      return res.status(400).json({ error: "Firebase UID and identifier are required." });
    }

    const isEmail = identifier.includes("@");
    const email = isEmail ? identifier : null;
    const phone = !isEmail ? identifier : null;

    // Find user by phone or email, or create if doesn't exist
    let user = null;
    const { isMemoryMode } = require("../initDb");
    const db = require("../db");
    
    if (isMemoryMode()) {
       // Mock user
       user = { id: 999, full_name: displayName || "Mock User", phone, email };
    } else {
       const userResult = await db.query(
         "SELECT * FROM users WHERE (phone = ? AND phone IS NOT NULL) OR (email = ? AND email IS NOT NULL)", 
         [phone, email]
       );
       if (userResult.rows.length > 0) {
         user = userResult.rows[0];
       } else {
         const insertResult = await db.query(
           "INSERT INTO users (full_name, phone, email, password_hash) VALUES (?, ?, ?, ?) RETURNING *",
           [displayName || "Firebase User", phone, email, "firebase-" + uid]
         );
         user = insertResult.rows[0];
       }
    }

    const session = await authService.createSession(user.id, true);

    res.json({
      data: {
        user: { id: user.id, fullName: user.full_name || user.fullName, phone: user.phone, email: user.email },
        token: session.token,
        expiresAt: session.expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function pinLogin(req, res, next) {
  try {
    const { phone, pin } = req.body;

    if (!phone || !pin) {
      return res.status(400).json({ error: "Phone and PIN are required." });
    }

    if (pin.length < 6) {
      return res.status(400).json({ error: "PIN must be at least 6 digits." });
    }

    const { isMemoryMode } = require("../initDb");
    const db = require("../db");

    let user = null;

    if (isMemoryMode()) {
      // Mock logic for memory mode
      user = { id: 999, full_name: "Mock User", phone: phone };
    } else {
      // Check if user exists by phone
      const userResult = await db.query("SELECT * FROM users WHERE phone = ?", [phone]);
      
      if (userResult.rows.length > 0) {
        // User exists, verify PIN
        user = userResult.rows[0];
        const { verifyPassword, hashPassword } = require("../utils/auth");
        
        // If this user was created during our Firebase testing, they don't have a real PIN yet.
        // We will accept the PIN they just typed and save it as their permanent PIN!
        if (user.password_hash && user.password_hash.startsWith("firebase-")) {
          const newHash = hashPassword(pin);
          await db.query("UPDATE users SET password_hash = ? WHERE id = ?", [newHash, user.id]);
          user.password_hash = newHash;
        } else if (!verifyPassword(pin, user.password_hash)) {
          return res.status(401).json({ error: "Incorrect PIN. Please try again." });
        }
      } else {
        // User doesn't exist, CREATE with this PIN
        const { hashPassword } = require("../utils/auth");
        const insertResult = await db.query(
          "INSERT INTO users (full_name, phone, password_hash) VALUES (?, ?, ?) RETURNING *",
          ["New User", phone, hashPassword(pin)]
        );
        user = insertResult.rows[0];
      }
    }

    const session = await authService.createSession(user.id, true);

    res.json({
      data: {
        user: { id: user.id, fullName: user.full_name || user.fullName, phone: user.phone },
        token: session.token,
        expiresAt: session.expiresAt,
      },
    });
  } catch (error) {
    console.error("PIN LOGIN ERROR:", error);
    res.status(500).json({ error: "Backend Error: " + error.message });
  }
}

module.exports = {
  register,
  login,
  me,
  logout,
  firebaseLogin,
  pinLogin,
};
