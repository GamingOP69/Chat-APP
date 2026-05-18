const { OAuth2Client } = require('google-auth-library');
const config = require('../../config');
const userService = require('../services/userService');
const tokenService = require('../services/tokenService');

const client = new OAuth2Client(config.google?.clientId || process.env.GOOGLE_CLIENT_ID || '');

async function verifyGoogleToken(req, res, next) {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'idToken required' });

    const ticket = await client.verifyIdToken({ idToken, audience: config.google?.clientId || process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    const username = payload.name || payload.email.split('@')[0];

    const user = await userService.findOrCreateUser(username);
    const access = tokenService.signAccessToken({ userId: user.id, username: user.username });
    const refresh = tokenService.generateRefreshToken();
    await tokenService.storeRefreshToken(user.id, refresh);

    res.json({ user: { id: user.id, username: user.username }, token: access, refresh });
  } catch (err) {
    next(err);
  }
}

module.exports = { verifyGoogleToken };
