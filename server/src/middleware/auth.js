const authService = require("../services/authService");

function getTokenFromRequest(req) {
  const authorization = req.get("authorization") || "";

  if (authorization.startsWith("Bearer ")) {
    return authorization.slice(7).trim();
  }

  return "";
}

async function requireAuth(req, res, next) {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({ error: "Please sign in to continue." });
    }

    const user = await authService.getSessionUser(token);

    if (!user) {
      return res.status(401).json({ error: "Your session has expired. Please sign in again." });
    }

    req.auth = {
      token,
      user,
    };

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  requireAuth,
};
