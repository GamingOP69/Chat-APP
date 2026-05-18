const jwt = require('jsonwebtoken');
const config = require('../../config');

function authenticateHttp(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, config.jwt.secret);
    req.user = { id: payload.userId, username: payload.username };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function authenticateSocket(socket, next) {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) {
    return next(new Error('Missing auth token'));
  }

  try {
    const payload = jwt.verify(token, config.jwt.secret);
    socket.user = { id: payload.userId, username: payload.username };
    return next();
  } catch (err) {
    return next(new Error('Invalid or expired token'));
  }
}

module.exports = { authenticateHttp, authenticateSocket };
