const { v4: uuidv4 } = require('uuid');
const roomService = require('./services/roomService');
const userService = require('./services/userService');
const messageService = require('./services/messageService');
const redis = require('./redis');
const { sanitizeText } = require('./utils/sanitize');

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
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

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

        const username = sanitizeText(payload.username || `Guest-${uuidv4().slice(0, 6)}`);
        const user = await userService.findOrCreateUser(username);

        await redis.setSocketUser(socket.id, { userId: user.id, username: user.username, roomId });
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
