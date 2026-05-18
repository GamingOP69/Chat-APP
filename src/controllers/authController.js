const jwt = require('jsonwebtoken');
const userService = require('../services/userService');
const config = require('../../config');
const bcrypt = require('bcrypt');
const tokenService = require('../services/tokenService');
const db = require('../db');
const logger = require('../utils/logger');

async function createGuestToken(req, res, next) {
  try {
    const username = (req.body.username || `Guest-${Math.random().toString(36).slice(2, 8)}`).slice(0, 100);
    const user = await userService.findOrCreateUser(username);

    const payload = { userId: user.id, username: user.username };
    const token = jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

    res.json({ token, user: { id: user.id, username: user.username }, expiresIn: config.jwt.expiresIn });
  } catch (error) {
    logger.error('socket auth createGuestToken error: %o', error);
    next(error);
  }
}

async function register(req, res, next) {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username and password required' });
    const existing = await userService.findByUsername(username);
    if (existing) return res.status(409).json({ error: 'username taken' });

    const hash = await bcrypt.hash(password, 10);
    const created = await db.query('INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username', [username, hash]);
    const user = created.rows[0];

    const access = tokenService.signAccessToken({ userId: user.id, username: user.username });
    const refresh = tokenService.generateRefreshToken();
    await tokenService.storeRefreshToken(user.id, refresh);

    res.json({ user: { id: user.id, username: user.username }, token: access, refresh });
  } catch (err) {
    logger.error('auth register error: %o', err);
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username and password required' });
    const user = await userService.findByUsername(username);
    if (!user || !user.password_hash) return res.status(401).json({ error: 'invalid credentials' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });

    const access = tokenService.signAccessToken({ userId: user.id, username: user.username });
    const refresh = tokenService.generateRefreshToken();
    await tokenService.storeRefreshToken(user.id, refresh);

    res.json({ user: { id: user.id, username: user.username }, token: access, refresh });
  } catch (err) {
    logger.error('auth login error: %o', err);
    next(err);
  }
}

async function refreshToken(req, res, next) {
  try {
    const { refresh } = req.body;
    if (!refresh) return res.status(400).json({ error: 'refresh token required' });
    const v = await tokenService.verifyRefreshToken(refresh);
    if (!v) return res.status(401).json({ error: 'invalid or expired refresh token' });
    const user = await userService.getUserById(v.userId);
    if (!user) return res.status(401).json({ error: 'user not found' });

    const access = tokenService.signAccessToken({ userId: user.id, username: user.username });
    res.json({ token: access });
  } catch (err) {
    logger.error('auth refresh error: %o', err);
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const { refresh } = req.body;
    if (!refresh) return res.status(400).json({ error: 'refresh token required' });
    await tokenService.revokeRefreshToken(refresh);
    res.json({ ok: true });
  } catch (err) {
    logger.error('auth logout error: %o', err);
    next(err);
  }
}

module.exports = { createGuestToken };
module.exports = { createGuestToken, register, login, refreshToken, logout };
