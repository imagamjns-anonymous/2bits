CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users (phone) WHERE phone IS NOT NULL;

CREATE TABLE IF NOT EXISTS user_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  remember_me BOOLEAN NOT NULL DEFAULT 0,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions (token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions (user_id);

CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  company TEXT,
  notes TEXT,
  temperature TEXT NOT NULL DEFAULT 'warm' CHECK (temperature IN ('hot', 'warm', 'cold')),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'card', 'qr')),
  card_image_url TEXT,
  last_contacted_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_leads_temperature ON leads (temperature);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads (phone);

CREATE TRIGGER IF NOT EXISTS users_set_updated_at
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
  UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS leads_set_updated_at
AFTER UPDATE ON leads
FOR EACH ROW
BEGIN
  UPDATE leads SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;
