const roomService = require('../services/roomService');
const messageService = require('../services/messageService');
const { sanitizeText } = require('../utils/sanitize');

async function getRooms(req, res, next) {
  try {
    const rooms = await roomService.getRooms();
    res.json({ rooms });
  } catch (error) {
    next(error);
  }
}

async function createRoom(req, res, next) {
  try {
    const name = sanitizeText(req.body.name);
    const room = await roomService.createRoom(name);
    res.status(201).json({ room });
  } catch (error) {
    next(error);
  }
}

async function getRoomMessages(req, res, next) {
  try {
    const roomId = Number(req.params.roomId);
    const limit = Number(req.query.limit) || 50;
    const beforeId = req.query.beforeId ? Number(req.query.beforeId) : null;
    const messages = await messageService.getMessagesByRoom(roomId, limit, beforeId);
    res.json({ messages });
  } catch (error) {
    next(error);
  }
}

module.exports = { getRooms, createRoom, getRoomMessages };
