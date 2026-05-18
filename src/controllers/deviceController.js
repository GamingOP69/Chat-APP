const db = require('../db');

async function registerDevice(req, res, next) {
  try {
    const user = req.user;
    if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });
    const { token, platform } = req.body;
    if (!token) return res.status(400).json({ error: 'token required' });

    await db.query('INSERT INTO device_tokens (user_id, token, platform) VALUES ($1, $2, $3)', [user.id, token, platform || null]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { registerDevice };
