const db = require('../db');

async function sendRequest(req, res, next) {
  try {
    const from = req.user?.id;
    const { toUserId } = req.body;
    if (!from) return res.status(401).json({ error: 'unauthorized' });
    if (!toUserId) return res.status(400).json({ error: 'toUserId required' });

    // prevent duplicates
    const existing = await db.query('SELECT id FROM friend_requests WHERE from_user=$1 AND to_user=$2 AND status=$3', [from, toUserId, 'pending']);
    if (existing.rowCount > 0) return res.status(409).json({ error: 'request already exists' });

    await db.query('INSERT INTO friend_requests (from_user, to_user) VALUES ($1, $2)', [from, toUserId]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

async function acceptRequest(req, res, next) {
  try {
    const userId = req.user?.id;
    const { requestId } = req.body;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    if (!requestId) return res.status(400).json({ error: 'requestId required' });

    const r = await db.query('SELECT id, from_user, to_user FROM friend_requests WHERE id = $1 AND to_user = $2 AND status = $3', [requestId, userId, 'pending']);
    if (r.rowCount === 0) return res.status(404).json({ error: 'request not found' });
    const reqRow = r.rows[0];

    // create friendship (store ordered)
    const a = Math.min(reqRow.from_user, reqRow.to_user);
    const b = Math.max(reqRow.from_user, reqRow.to_user);
    await db.query('INSERT INTO friendships (user_a, user_b) VALUES ($1, $2) ON CONFLICT DO NOTHING', [a, b]);
    await db.query('UPDATE friend_requests SET status = $1 WHERE id = $2', ['accepted', requestId]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

async function listFriends(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const result = await db.query(`SELECT u.id, u.username FROM friendships f JOIN users u ON (u.id = f.user_a OR u.id = f.user_b) WHERE (f.user_a = $1 OR f.user_b = $1) AND u.id != $1`, [userId]);
    res.json({ friends: result.rows });
  } catch (err) {
    next(err);
  }
}

module.exports = { sendRequest, acceptRequest, listFriends };
