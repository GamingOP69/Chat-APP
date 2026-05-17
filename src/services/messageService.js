const db = require('../db');

async function createMessage({ roomId, userId, content, messageType = 'text', attachmentUrl = null, attachmentName = null, attachmentType = null }) {
  const result = await db.query(
    `INSERT INTO messages (room_id, user_id, content, message_type, attachment_url, attachment_name, attachment_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, room_id, user_id, content, message_type, attachment_url, attachment_name, attachment_type, created_at`,
    [roomId, userId, content, messageType, attachmentUrl, attachmentName, attachmentType],
  );
  return result.rows[0];
}

async function getMessagesByRoom(roomId, limit = 50, beforeId = null) {
  const params = [roomId];
  let query = `SELECT m.id, m.room_id, m.user_id, u.username, m.content, m.message_type, m.attachment_url, m.attachment_name, m.attachment_type, m.created_at
    FROM messages m
    JOIN users u ON u.id = m.user_id
    WHERE m.room_id = $1`;

  if (beforeId) {
    params.push(beforeId);
    query += ' AND m.id < $2';
    query += ' ORDER BY m.created_at DESC LIMIT $3';
    params.push(limit);
  } else {
    query += ' ORDER BY m.created_at DESC LIMIT $2';
    params.push(limit);
  }

  const result = await db.query(query, params);
  return result.rows.reverse();
}

module.exports = { createMessage, getMessagesByRoom };
