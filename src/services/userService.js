const db = require('../db');

async function findOrCreateUser(username) {
  const safeUsername = username || 'Guest';
  const existing = await db.query('SELECT id, username, password_hash FROM users WHERE username = $1', [safeUsername]);
  if (existing.rowCount > 0) {
    return existing.rows[0];
  }

  const created = await db.query('INSERT INTO users (username) VALUES ($1) RETURNING id, username', [safeUsername]);
  return created.rows[0];
}

async function getUserById(userId) {
  const result = await db.query('SELECT id, username FROM users WHERE id = $1', [userId]);
  return result.rows[0] || null;
}

async function findByUsername(username) {
  const result = await db.query('SELECT id, username, password_hash FROM users WHERE username = $1', [username]);
  return result.rows[0] || null;
}

module.exports = { findOrCreateUser, getUserById, findByUsername };

module.exports = { findOrCreateUser, getUserById };
