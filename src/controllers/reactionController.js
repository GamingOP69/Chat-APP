const db = require('../db');

async function addReaction(req, res, next) {
  try {
    const user = req.user;
    const { messageId, reaction } = req.body;
    if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });
    if (!messageId || !reaction) return res.status(400).json({ error: 'messageId and reaction required' });

    await db.query('INSERT INTO message_reactions (message_id, user_id, reaction) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [messageId, user.id, reaction]);
    const rows = await db.query('SELECT user_id, reaction FROM message_reactions WHERE message_id = $1', [messageId]);
    res.json({ reactions: rows.rows });
  } catch (err) {
    next(err);
  }
}

async function removeReaction(req, res, next) {
  try {
    const user = req.user;
    const { messageId, reaction } = req.body;
    if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });
    if (!messageId || !reaction) return res.status(400).json({ error: 'messageId and reaction required' });

    await db.query('DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND reaction = $3', [messageId, user.id, reaction]);
    const rows = await db.query('SELECT user_id, reaction FROM message_reactions WHERE message_id = $1', [messageId]);
    res.json({ reactions: rows.rows });
  } catch (err) {
    next(err);
  }
}

module.exports = { addReaction, removeReaction };
