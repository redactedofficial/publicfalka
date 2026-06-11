const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const config = require('./config');
const { nowIso } = require('./utils/time');

fs.mkdirSync(path.dirname(path.resolve(config.databasePath)), { recursive: true });
const db = new Database(config.databasePath);
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  verified INTEGER NOT NULL DEFAULT 0,
  current_tier INTEGER NOT NULL DEFAULT 0,
  xp INTEGER NOT NULL DEFAULT 0,
  messages INTEGER NOT NULL DEFAULT 0,
  replies INTEGER NOT NULL DEFAULT 0,
  images INTEGER NOT NULL DEFAULT 0,
  vc_minutes INTEGER NOT NULL DEFAULT 0,
  last_activity_at TEXT,
  last_decay_at TEXT,
  forced_tier INTEGER,
  forced_by TEXT,
  forced_reason TEXT,
  forced_at TEXT,
  forced_until TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tier_votes (
  vote_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('promotion', 'demotion')),
  from_tier INTEGER NOT NULL,
  to_tier INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  message_id TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tier_vote_entries (
  vote_id INTEGER NOT NULL,
  admin_id TEXT NOT NULL,
  vote TEXT NOT NULL CHECK (vote IN ('approve', 'reject')),
  created_at TEXT NOT NULL,
  PRIMARY KEY (vote_id, admin_id),
  FOREIGN KEY (vote_id) REFERENCES tier_votes(vote_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tier_logs (
  log_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  old_tier INTEGER,
  new_tier INTEGER,
  reason TEXT,
  actor_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activity_cooldowns (
  user_id TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  last_at TEXT NOT NULL,
  PRIMARY KEY (user_id, activity_type)
);

CREATE TABLE IF NOT EXISTS voice_sessions (
  user_id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  joined_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_vote_unique
ON tier_votes(user_id, vote_type, to_tier)
WHERE status = 'pending';
`);

function ensureUser(userId) {
  const existing = db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
  if (existing) return existing;
  const now = nowIso();
  db.prepare(`
    INSERT INTO users (user_id, created_at, updated_at)
    VALUES (?, ?, ?)
  `).run(userId, now, now);
  return db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
}

module.exports = { db, ensureUser };
