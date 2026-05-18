const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../db');
const config = require('../../config');

function signAccessToken(payload) {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
}

function generateRefreshToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function storeRefreshToken(userId, token, expiresInSeconds = 60 * 60 * 24 * 30) {
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
  await db.query('INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)', [userId, tokenHash, expiresAt]);
}

async function revokeRefreshToken(token) {
  const tokenHash = hashToken(token);
  await db.query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);
}

async function verifyRefreshToken(token) {
  const tokenHash = hashToken(token);
  const res = await db.query('SELECT id, user_id, expires_at FROM sessions WHERE token_hash = $1', [tokenHash]);
  if (res.rowCount === 0) return null;
  const row = res.rows[0];
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    // expired
    await db.query('DELETE FROM sessions WHERE id = $1', [row.id]);
    return null;
  }
  return { id: row.id, userId: row.user_id };
}

module.exports = {
  signAccessToken,
  generateRefreshToken,
  storeRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
};
