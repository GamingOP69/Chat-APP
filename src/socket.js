const { v4: uuidv4 } = require('uuid');
const roomService = require('./services/roomService');
const userService = require('./services/userService');
const messageService = require('./services/messageService');
const redis = require('./redis');
const { sanitizeText } = require('./utils/sanitize');
const { authenticateSocket } = require('./middleware/authenticate');

async function buildPresence(roomId) {
  const socketIds = await redis.getRoomSockets(roomId);
  const members = [];
  const userSet = new Set();

  for (const socketId of socketIds) {
    const session = await redis.getSocketUser(socketId);
    if (session && !userSet.has(session.userId)) {
      userSet.add(session.userId);
      members.push({ userId: session.userId, username: session.username });
    }
  }

  return members;
}

function initSocketHandlers(io) {
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    const logger = require('./utils/logger');
    logger.info('Socket connected: %s user=%s', socket.id, socket.user?.username || 'unknown');

    socket.on('room:join', async (payload, callback) => {
      try {
        const roomId = Number(payload.roomId);
        if (!roomId) {
          return callback?.({ success: false, message: 'Invalid room ID.' });
        }

        const room = await roomService.getRoomById(roomId);
        if (!room) {
          return callback?.({ success: false, message: 'Room not found.' });
        }

        // Prefer authenticated socket user when available
        let userId = null;
        let usernameVal = sanitizeText(payload.username || `Guest-${uuidv4().slice(0, 6)}`);
        if (socket.user && socket.user.id) {
          userId = socket.user.id;
          usernameVal = socket.user.username || usernameVal;
        } else {
          const user = await userService.findOrCreateUser(usernameVal);
          userId = user.id;
          usernameVal = user.username;
        }

        await redis.setSocketUser(socket.id, { userId, username: usernameVal, roomId });
        await redis.addRoomSocket(roomId, socket.id);
        socket.join(`room:${roomId}`);

        const members = await buildPresence(roomId);
        const messages = await messageService.getMessagesByRoom(roomId);

        io.to(`room:${roomId}`).emit('presence:update', { roomId, members });
        socket.emit('room:joined', { room, members, messages });
        callback?.({ success: true, room, members, messages });
      } catch (error) {
        console.error('socket room:join error', error);
        callback?.({ success: false, message: error.message });
      }
    });

    socket.on('room:leave', async ({ roomId }, callback) => {
      try {
        const id = Number(roomId);
        socket.leave(`room:${id}`);
        await redis.removeRoomSocket(id, socket.id);
        await redis.removeTyping(socket.id, id);

        const members = await buildPresence(id);
        io.to(`room:${id}`).emit('presence:update', { roomId: id, members });
        callback?.({ success: true });
      } catch (error) {
        console.error('socket room:leave error', error);
        callback?.({ success: false, message: error.message });
      }
    });

    socket.on('message:create', async (payload, callback) => {
      try {
        const session = await redis.getSocketUser(socket.id);
        if (!session) {
          return callback?.({ success: false, message: 'Session expired.' });
        }

        const roomId = Number(payload.roomId);
        const content = sanitizeText(payload.content || '');
        const messageType = payload.messageType === 'file' ? 'file' : 'text';

        if (messageType === 'text' && !content) {
          return callback?.({ success: false, message: 'Message cannot be empty.' });
        }

        const message = await messageService.createMessage({
          roomId,
          userId: session.userId,
          content,
          messageType,
          attachmentUrl: payload.attachmentUrl || null,
          attachmentName: payload.attachmentName || null,
          attachmentType: payload.attachmentType || null,
        });

        const formattedMessage = {
          id: message.id,
          roomId: message.room_id,
          userId: message.user_id,
          username: session.username,
          content: message.content,
          type: message.message_type,
          attachmentUrl: message.attachment_url,
          attachmentName: message.attachment_name,
          attachmentType: message.attachment_type,
          createdAt: message.created_at,
        };

        io.to(`room:${roomId}`).emit('message:created', formattedMessage);
        callback?.({ success: true, message: formattedMessage });
      } catch (error) {
        console.error('socket message:create error', error);
        callback?.({ success: false, message: error.message });
      }
    });

    socket.on('message:react', async ({ messageId, reaction }, callback) => {
      try {
        const session = await redis.getSocketUser(socket.id);
        if (!session) return callback?.({ success: false, message: 'Session expired' });
        const userId = session.userId;
        // store reaction in DB
        const db = require('./db');
        await db.query('INSERT INTO message_reactions (message_id, user_id, reaction) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [messageId, userId, reaction]);
        const rows = await db.query('SELECT user_id, reaction FROM message_reactions WHERE message_id = $1', [messageId]);
        io.to(`room:${session.roomId}`).emit('message:reaction', { messageId, reactions: rows.rows });
        callback?.({ success: true, reactions: rows.rows });
      } catch (err) {
        console.error('socket message:react error', err);
        callback?.({ success: false, message: err.message });
      }
    });

    socket.on('typing:start', async ({ roomId }) => {
      try {
        const id = Number(roomId);
        await redis.addTyping(socket.id, id);
        const typingSockets = await redis.getTypingSockets(id);
        const typingMembers = [];

        for (const typingSocket of typingSockets) {
          const session = await redis.getSocketUser(typingSocket);
          if (session) {
            typingMembers.push({ userId: session.userId, username: session.username });
          }
        }

        socket.to(`room:${id}`).emit('typing:update', { roomId: id, typingMembers });
      } catch (error) {
        console.error('socket typing:start error', error);
      }
    });

    socket.on('typing:stop', async ({ roomId }) => {
      try {
        const id = Number(roomId);
        await redis.removeTyping(socket.id, id);
        const typingSockets = await redis.getTypingSockets(id);
        const typingMembers = [];

        for (const typingSocket of typingSockets) {
          const session = await redis.getSocketUser(typingSocket);
          if (session) {
            typingMembers.push({ userId: session.userId, username: session.username });
          }
        }

        socket.to(`room:${id}`).emit('typing:update', { roomId: id, typingMembers });
      } catch (error) {
        console.error('socket typing:stop error', error);
      }
    });

    socket.on('call:initiate', async ({ roomId, callType }) => {
      try {
        const session = await redis.getSocketUser(socket.id);
        if (!session) {
          return;
        }

        socket.to(`room:${roomId}`).emit('call:incoming', {
          roomId,
          caller: { userId: session.userId, username: session.username, socketId: socket.id },
          callType,
        });
      } catch (error) {
        console.error('socket call:initiate error', error);
      }
    });

    socket.on('call:accept', ({ roomId, targetSocketId }) => {
      if (!targetSocketId) {
        return;
      }

      socket.to(targetSocketId).emit('call:accepted', {
        roomId,
        acceptedBy: socket.id,
      });
    });

    socket.on('webrtc:signal', ({ targetSocketId, signal }) => {
      if (!targetSocketId || !signal) {
        return;
      }
      io.to(targetSocketId).emit('webrtc:signal', {
        from: socket.id,
        signal,
      });
    });

    socket.on('call:end', ({ roomId }) => {
      socket.to(`room:${roomId}`).emit('call:ended', { roomId, socketId: socket.id });
    });

    socket.on('disconnect', async () => {
      try {
        const session = await redis.getSocketUser(socket.id);
        if (session) {
          const roomId = Number(session.roomId);
          await redis.removeRoomSocket(roomId, socket.id);
          await redis.removeTyping(socket.id, roomId);
          await redis.clearSocketUser(socket.id);

          const members = await buildPresence(roomId);
          io.to(`room:${roomId}`).emit('presence:update', { roomId, members });
        }
        console.log(`Socket disconnected: ${socket.id}`);
      } catch (error) {
        console.error('socket disconnect error', error);
      }
    });
  });
}

module.exports = { initSocketHandlers };
