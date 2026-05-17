const userService = require('../services/userService');
const { sanitizeText } = require('../utils/sanitize');

async function createOrGetUser(username) {
  const safeUsername = sanitizeText(username || 'Guest');
  return userService.findOrCreateUser(safeUsername);
}

module.exports = { createOrGetUser };
