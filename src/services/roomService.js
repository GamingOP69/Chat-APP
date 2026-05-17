const db = require('../db');

async function getRooms() {
  const result = await db.query('SELECT id, name, created_at FROM rooms ORDER BY created_at DESC');
  return result.rows;
}

async function createRoom(name) {
  const result = await db.query('INSERT INTO rooms (name) VALUES ($1) RETURNING id, name, created_at', [name]);
  return result.rows[0];
}

async function getRoomById(roomId) {
  const result = await db.query('SELECT id, name, created_at FROM rooms WHERE id = $1', [roomId]);
  return result.rows[0] || null;
}

module.exports = { getRooms, createRoom, getRoomById };
